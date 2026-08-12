// SEOC Studio API 开放平台 - OpenAI 兼容代理
// POST /v1/chat/completions
// 认证：Authorization: Bearer sk-seoc-xxxx
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  callProviderStream,
  getProviderApiKey,
  calculateCost,
  estimateTokens,
  canUseModelWithTier,
  type ModelConfig,
  type ChatMessage,
  type StreamChunk,
} from '../_shared/ai-providers.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const jsonHeaders = { ...cors, 'Content-Type': 'application/json' };

  try {
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
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

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

    // 2. 解析 OpenAI 格式请求
    const body = await req.json();
    const { model: modelId, messages, stream: wantStream = true } = body;

    if (!modelId || !messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: { message: '参数不完整', type: 'invalid_request_error' } }),
        { status: 400, headers: jsonHeaders }
      );
    }

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
      .select('membership_tier, membership_expires_at')
      .eq('id', userId)
      .maybeSingle();
    const userTier = (profileData?.membership_tier as string) || 'free';
    const membershipExpiresAt = (profileData?.membership_expires_at as string) || null;
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

    // 5. 调用厂商 API
    const providerApiKey = getProviderApiKey(model.provider);

    if (!wantStream) {
      // 非流式：复用共享模块的非流式函数
      const { callProvider } = await import('../_shared/ai-providers.ts');
      const result = await callProvider(model, messages as ChatMessage[], providerApiKey);

      const inputTokens = result.usage?.input_tokens || estimateTokens(messages.map((m: ChatMessage) => m.content).join(''));
      const outputTokens = result.usage?.output_tokens || estimateTokens(result.content);
      const cost = calculateCost(inputTokens, outputTokens, model.input_price, model.output_price);

      // 扣费
      const newBalance = Math.max(0, balance - cost);
      await adminClient.from('ai_credits').update({ balance: newBalance }).eq('user_id', userId);

      // 记录
      await adminClient.from('ai_usage_logs').insert({
        user_id: userId,
        model_id: model.id,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cost,
        is_free: false,
        api_key_id: apiKeyId,
        interrupted: false,
      });

      if (cost > 0) {
        await adminClient.from('ai_transactions').insert({
          user_id: userId,
          amount: -cost,
          type: 'consumption',
          note: `API 调用 ${model.id}，输入 ${inputTokens} token，输出 ${outputTokens} token`,
        });
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
    const stream = await callProviderStream(model, messages as ChatMessage[], providerApiKey);
    const streamReader = stream.getReader();
    let accumulatedOutput = '';
    let estimatedOutputTokens = 0;
    let chunkCount = 0;
    let interrupted = false;
    let finalUsage = null;

    const encoder = new TextEncoder();
    const completionId = `chatcmpl-${crypto.randomUUID()}`;

    const sseStream = new ReadableStream({
      async start(controller) {
        const sendSSE = (data: object) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
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
                const inputEstimate = estimateTokens(messages.map((m: ChatMessage) => m.content).join(''));
                const currentCost = calculateCost(inputEstimate, estimatedOutputTokens, model.input_price, model.output_price);

                if (currentCost > balance) {
                  interrupted = true;
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

          // 计费
          const inputTokens = finalUsage?.input_tokens || estimateTokens(messages.map((m: ChatMessage) => m.content).join(''));
          const outputTokens = finalUsage?.output_tokens || estimatedOutputTokens;
          const cost = calculateCost(inputTokens, outputTokens, model.input_price, model.output_price);

          const newBalance = Math.max(0, balance - cost);
          await adminClient.from('ai_credits').update({ balance: newBalance }).eq('user_id', userId);

          await adminClient.from('ai_usage_logs').insert({
            user_id: userId,
            model_id: model.id,
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            cost,
            is_free: false,
            api_key_id: apiKeyId,
            interrupted,
          });

          if (cost > 0) {
            await adminClient.from('ai_transactions').insert({
              user_id: userId,
              amount: -cost,
              type: 'consumption',
              note: `API 调用 ${model.id}，输入 ${inputTokens} token，输出 ${outputTokens} token`,
            });
          }

          // 结束 chunk
          sendSSE({
            id: completionId,
            object: 'chat.completion.chunk',
            created: Math.floor(Date.now() / 1000),
            model: model.id,
            choices: [{ index: 0, delta: {}, finish_reason: interrupted ? 'length' : 'stop' }],
            usage: {
              prompt_tokens: inputTokens,
              completion_tokens: outputTokens,
              total_tokens: inputTokens + outputTokens,
            },
          });

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err) {
          sendSSE({
            error: { message: String(err?.message || err), type: 'server_error' },
          });
          controller.close();
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
