// SEOC Studio API 开放平台 - OpenAI 兼容代理
// POST /v1/chat/completions · GET /v1/models
// 认证：Authorization: Bearer sk-seoc-xxxx
// v7 加固：
//  - GET /v1/models 支持（OpenAI 客户端兼容）
//  - max_tokens / temperature / top_p 透传（输出上限钳制）
//  - 服务端输入长度/token 上限
//  - 原子扣费（spend_ai_credits RPC，防并发透支）
//  - 每用户每分钟请求限流
//  - 客户端断开时中断上游并做部分结算
import { SupabaseRest } from '../_shared/rest.ts';
import {
  callProvider,
  callProviderStream,
  getProviderApiKey,
  calculateCost,
  estimateTokens,
  canUseModelWithTier,
  type ModelConfig,
  type ChatMessage,
  type StreamChunk,
  type TokenUsage,
} from '../_shared/ai-providers.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 服务端护栏
const MAX_INPUT_CHARS = 20000; // 单条消息最大字符数
const MAX_INPUT_TOKENS = 16000; // 历史总输入 token 上限
const MAX_OUTPUT_TOKENS = 8192; // 单次输出上限（OpenAI max_tokens 钳制）
const RATE_LIMIT_PER_MIN = 30; // 每用户每分钟 API 请求上限

/**
 * SHA-256 哈希
 */
async function sha256(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

const jsonHeaders = { ...cors, 'Content-Type': 'application/json' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    // 0. GET /v1/models：OpenAI 兼容模型列表
    const path = new URL(req.url).pathname;
    if (req.method === 'GET' && path.endsWith('/v1/models')) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const adminClient = new SupabaseRest(supabaseUrl, serviceRoleKey, Deno.env.get('SUPABASE_ANON_KEY') || '');
      const { data: models } = await adminClient
        .from('ai_models')
        .select('id, display_name, enabled')
        .eq('enabled', true)
        .order('sort_order');
      return new Response(
        JSON.stringify({
          object: 'list',
          data: (models || []).map((m: { id: string; display_name: Record<string, string> }) => ({
            id: m.id,
            object: 'model',
            created: 0,
            owned_by: 'seoc-studio',
          })),
        }),
        { headers: jsonHeaders }
      );
    }

    // 1. API Key 认证
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: { message: '缺少 API Key', type: 'authentication_error' } }),
        { status: 401, headers: jsonHeaders }
      );
    }

    const rawKey = authHeader.slice(7).trim();
    const keyHash = await sha256(rawKey);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = new SupabaseRest(supabaseUrl, serviceRoleKey, Deno.env.get('SUPABASE_ANON_KEY') || '');

    // 查询 API Key
    const { data: keyRow } = await adminClient
      .from('ai_api_keys')
      .select('id, user_id')
      .eq('key_hash', keyHash)
      .maybeSingle();

    if (!keyRow) {
      return new Response(
        JSON.stringify({ error: { message: 'API Key 无效', type: 'authentication_error' } }),
        { status: 401, headers: jsonHeaders }
      );
    }

    const userId = keyRow.user_id;
    const apiKeyId = keyRow.id;

    // 更新 last_used_at
    await adminClient
      .from('ai_api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiKeyId);

    // 1.5 速率限制
    const oneMinAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { count: recentCount } = await adminClient
      .from('ai_usage_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', oneMinAgo);
    if ((recentCount || 0) >= RATE_LIMIT_PER_MIN) {
      return new Response(
        JSON.stringify({
          error: { message: '请求过于频繁，请稍后再试', type: 'rate_limit_error' },
        }),
        { status: 429, headers: jsonHeaders }
      );
    }

    // 2. 解析 OpenAI 格式请求
    let body: {
      model?: string;
      messages?: ChatMessage[];
      stream?: boolean;
      max_tokens?: number;
      temperature?: number;
      top_p?: number;
    };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: { message: '请求体不是合法 JSON', type: 'invalid_request_error' } }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const { model: modelId, messages, stream: wantStream = true } = body;

    if (!modelId || !messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: { message: '参数不完整', type: 'invalid_request_error' } }),
        { status: 400, headers: jsonHeaders }
      );
    }

    // 2.5 输入护栏
    for (const m of messages) {
      if (!['system', 'user', 'assistant'].includes(m.role)) {
        return new Response(
          JSON.stringify({ error: { message: '消息角色不合法', type: 'invalid_request_error' } }),
          { status: 400, headers: jsonHeaders }
        );
      }
      if (typeof m.content !== 'string' || m.content.length > MAX_INPUT_CHARS) {
        return new Response(
          JSON.stringify({
            error: { message: `单条消息不能超过 ${MAX_INPUT_CHARS} 字符`, type: 'invalid_request_error' },
          }),
          { status: 400, headers: jsonHeaders }
        );
      }
    }
    const totalInputTokens = estimateTokens(messages.map((m) => m.content).join(''));
    if (totalInputTokens > MAX_INPUT_TOKENS) {
      return new Response(
        JSON.stringify({
          error: {
            message: `输入过长（约 ${totalInputTokens} token，上限 ${MAX_INPUT_TOKENS}）`,
            type: 'invalid_request_error',
          },
        }),
        { status: 400, headers: jsonHeaders }
      );
    }

    // 输出上限钳制（透传客户端参数，但不超过服务端上限）
    const maxTokens = Math.min(body.max_tokens || MAX_OUTPUT_TOKENS, MAX_OUTPUT_TOKENS);

    // 3. 查询模型
    const { data: modelData } = await adminClient
      .from('ai_models')
      .select('*')
      .eq('id', modelId)
      .eq('enabled', true)
      .maybeSingle();

    if (!modelData) {
      return new Response(
        JSON.stringify({ error: { message: '模型不存在或已禁用', type: 'invalid_request_error' } }),
        { status: 404, headers: jsonHeaders }
      );
    }
    const model = modelData as unknown as ModelConfig;

    // 3.5 会员等级校验（API 调用同样受会员门槛限制）
    const { data: profileData } = await adminClient
      .from('profiles')
      .select('membership_tier, membership_expires_at, is_banned')
      .eq('id', userId)
      .maybeSingle();
    const userTier = (profileData?.membership_tier as string) || 'free';
    const membershipExpiresAt = (profileData?.membership_expires_at as string) || null;

    // 3.6 封禁校验
    if (profileData?.is_banned) {
      return new Response(
        JSON.stringify({
          error: { message: '账户已被封禁，如有疑问请联系管理员', type: 'banned', code: 'banned' },
        }),
        { status: 403, headers: jsonHeaders }
      );
    }

    // 3.7 内容审核：命中敏感词直接拒绝
    const { data: filterRows } = await adminClient
      .from('ai_content_filters')
      .select('pattern')
      .eq('enabled', true);
    const bannedPatterns = ((filterRows || []) as { pattern: string }[])
      .map((r) => r.pattern.toLowerCase())
      .filter((p) => p.length > 0);
    if (bannedPatterns.length > 0) {
      const userInput = messages
        .filter((m: ChatMessage) => m.role === 'user')
        .map((m: ChatMessage) => m.content)
        .join('\n')
        .toLowerCase();
      if (bannedPatterns.some((p) => userInput.includes(p))) {
        return new Response(
          JSON.stringify({
            error: { message: '输入包含违规内容，请修改后重试', type: 'content_filter', code: 'content_filter' },
          }),
          { status: 400, headers: jsonHeaders }
        );
      }
    }

    const tierCheck = canUseModelWithTier(userTier, membershipExpiresAt, model.min_tier || 'lite');
    if (!tierCheck.ok) {
      return new Response(
        JSON.stringify({
          error: {
            message: tierCheck.reason,
            type: 'membership_required',
            code: 'membership_required',
          },
        }),
        { status: 403, headers: jsonHeaders }
      );
    }

    // 4. 查询余额（API 调用无免费额度）
    const { data: creditsData } = await adminClient
      .from('ai_credits')
      .select('balance')
      .eq('user_id', userId)
      .maybeSingle();

    const balance = Number(creditsData?.balance || 0);

    if (balance <= 0 && model.input_price + model.output_price > 0) {
      return new Response(
        JSON.stringify({
          error: {
            message: '研点不足',
            type: 'insufficient_quota',
            balance,
          },
        }),
        { status: 402, headers: jsonHeaders }
      );
    }

    // 记录用量日志 + 交易流水（服务端统一记账）
    const recordUsage = async (inputTokens: number, outputTokens: number, cost: number, isInterrupted: boolean) => {
      try {
        await adminClient.from('ai_usage_logs').insert({
          user_id: userId,
          model_id: model.id,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          cost,
          is_free: false,
          api_key_id: apiKeyId,
          interrupted: isInterrupted,
        });
      } catch (_) {
        // 日志失败不阻断响应
      }
      if (cost > 0) {
        try {
          await adminClient.from('ai_transactions').insert({
            user_id: userId,
            amount: -cost,
            type: 'consumption',
            note: `API 调用 ${model.id}，输入 ${inputTokens} token，输出 ${outputTokens} token${isInterrupted ? '（中断）' : ''}`,
          });
        } catch (_) {
          // 流水失败不阻断响应
        }
      }
    };

    // 原子扣费：返回扣费后的余额；余额不足返回 -1
    const spend = async (cost: number): Promise<number> => {
      const { data: newBalance } = await adminClient.rpc('spend_ai_credits', {
        p_user: userId,
        p_cost: cost,
      });
      if (typeof newBalance === 'number' && newBalance >= 0) return newBalance;
      return -1;
    };

    // 5. 调用厂商 API
    const providerApiKey = getProviderApiKey(model.provider);
    const providerOpts = {
      maxTokens,
      temperature: body.temperature,
      topP: body.top_p,
    };

    if (!wantStream) {
      // 非流式
      const result = await callProvider(model, messages as ChatMessage[], providerApiKey, providerOpts);

      const inputTokens = result.usage?.input_tokens || totalInputTokens;
      const outputTokens = result.usage?.output_tokens || estimateTokens(result.content);
      const cost = calculateCost(inputTokens, outputTokens, model.input_price, model.output_price);

      const newBalance = cost > 0 ? await spend(cost) : balance;
      const insufficient = newBalance < 0;
      await recordUsage(inputTokens, outputTokens, insufficient ? 0 : cost, insufficient);

      if (insufficient) {
        return new Response(
          JSON.stringify({
            error: { message: '研点不足，本次调用已中止', type: 'insufficient_quota', balance: 0 },
          }),
          { status: 402, headers: jsonHeaders }
        );
      }

      // OpenAI 格式响应
      return new Response(
        JSON.stringify({
          id: `chatcmpl-${crypto.randomUUID()}`,
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: model.id,
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: result.content },
              finish_reason: result.finish_reason || 'stop',
            },
          ],
          usage: {
            prompt_tokens: inputTokens,
            completion_tokens: outputTokens,
            total_tokens: inputTokens + outputTokens,
          },
        }),
        { headers: jsonHeaders }
      );
    }

    // 6. 流式模式
    const stream = await callProviderStream(model, messages as ChatMessage[], providerApiKey, providerOpts);
    const streamReader = stream.getReader();
    let accumulatedOutput = '';
    let estimatedOutputTokens = 0;
    let chunkCount = 0;
    let interrupted = false;
    let finalUsage: TokenUsage | null = null;
    let settled = false;

    const encoder = new TextEncoder();
    const completionId = `chatcmpl-${crypto.randomUUID()}`;

    // 结算：原子扣费 + 记账
    const settle = async (): Promise<{ cost: number; balance: number }> => {
      if (settled) return { cost: 0, balance };
      settled = true;
      const inputTokens = finalUsage?.input_tokens || totalInputTokens;
      const outputTokens = finalUsage?.output_tokens || estimatedOutputTokens;
      const cost = calculateCost(inputTokens, outputTokens, model.input_price, model.output_price);
      const newBalance = cost > 0 ? await spend(cost) : balance;
      await recordUsage(inputTokens, outputTokens, newBalance < 0 ? 0 : cost, interrupted);
      return { cost, balance: Math.max(0, newBalance) };
    };

    const sseStream = new ReadableStream({
      async start(controller) {
        let closed = false;
        const sendSSE = (data: object) => {
          if (closed) return;
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          } catch {
            closed = true;
          }
        };

        try {
          while (true) {
            const { done, value } = await streamReader.read();
            if (done) break;

            const chunk = value as StreamChunk;
            chunkCount++;

            if (chunk.delta) {
              accumulatedOutput += chunk.delta;

              // 实时监测
              if (chunkCount % 10 === 0 || accumulatedOutput.length % 500 < chunk.delta.length) {
                estimatedOutputTokens = estimateTokens(accumulatedOutput);
                const currentCost = calculateCost(
                  totalInputTokens,
                  estimatedOutputTokens,
                  model.input_price,
                  model.output_price
                );

                if (currentCost > balance) {
                  interrupted = true;
                  const settledInfo = await settle();
                  sendSSE({
                    id: completionId,
                    object: 'chat.completion.chunk',
                    created: Math.floor(Date.now() / 1000),
                    model: model.id,
                    choices: [{ index: 0, delta: {}, finish_reason: 'length' }],
                    _seoc: {
                      type: 'interrupted',
                      reason: 'insufficient_balance',
                      tokens_used: estimatedOutputTokens,
                      cost: Math.round(currentCost * 10000) / 10000,
                      balance: settledInfo.balance,
                    },
                  });
                  break;
                }
              }

              // OpenAI 格式 chunk
              sendSSE({
                id: completionId,
                object: 'chat.completion.chunk',
                created: Math.floor(Date.now() / 1000),
                model: model.id,
                choices: [
                  {
                    index: 0,
                    delta: { content: chunk.delta },
                    finish_reason: null,
                  },
                ],
              });
            }

            if (chunk.usage) finalUsage = chunk.usage;
            if (chunk.finish_reason && !interrupted) break;
          }

          // 结算 + 结束 chunk
          if (!settled) {
            const settledInfo = await settle();
            sendSSE({
              id: completionId,
              object: 'chat.completion.chunk',
              created: Math.floor(Date.now() / 1000),
              model: model.id,
              choices: [{ index: 0, delta: {}, finish_reason: interrupted ? 'length' : 'stop' }],
              usage: {
                prompt_tokens: finalUsage?.input_tokens || totalInputTokens,
                completion_tokens: finalUsage?.output_tokens || estimatedOutputTokens,
                total_tokens: (finalUsage?.input_tokens || totalInputTokens) + (finalUsage?.output_tokens || estimatedOutputTokens),
              },
              _seoc: { type: 'done', cost: settledInfo.cost, balance: settledInfo.balance },
            });
          }

          sendSSE({ type: 'eof' });
          if (!closed) {
            try {
              controller.close();
            } catch {
              /* 已关闭 */
            }
          }
        } catch (err) {
          // 上游异常或客户端取消：有部分输出则部分结算
          if (accumulatedOutput) {
            interrupted = true;
            try {
              await settle();
            } catch {
              /* 结算失败不阻断 */
            }
          }
          sendSSE({
            error: { message: String(err?.message || err), type: 'server_error' },
          });
          if (!closed) {
            try {
              controller.close();
            } catch {
              /* 已关闭 */
            }
          }
        }
      },
      // 客户端断开：中断上游读取
      async cancel() {
        try {
          await streamReader.cancel();
        } catch {
          /* 忽略 */
        }
      },
    });

    return new Response(sseStream, {
      headers: {
        ...cors,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: { message: String(e?.message || e), type: 'server_error' } }),
      { status: 500, headers: jsonHeaders }
    );
  }
});
