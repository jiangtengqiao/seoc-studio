// SEOC Studio API 开放平台 - OpenAI 兼容代理（控制台部署版，内联 _shared）
// POST /v1/chat/completions
// 认证：Authorization: Bearer sk-seoc-xxxx
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================
// 内联：ai-providers.ts（厂商适配器与计费）
// ============================================================
interface ChatMessage { role: 'system' | 'user' | 'assistant'; content: string; }
interface ModelConfig {
  id: string; provider: string; display_name: Record<string, string>;
  input_price: number; output_price: number; free_daily_quota: number; min_tier: string; enabled: boolean;
}
interface TokenUsage { input_tokens: number; output_tokens: number; }
interface ProviderResponse { content: string; usage: TokenUsage | null; finish_reason: string | null; }
interface StreamChunk { delta: string; usage: TokenUsage | null; finish_reason: string | null; }

// 会员等级排序（free < lite < plus < pro < max）
const TIER_ORDER: Record<string, number> = { free: 0, lite: 1, plus: 2, pro: 3, max: 4 };

// 校验用户会员等级是否达到模型要求（服务端强制）
function canUseModelWithTier(userTier: string, membershipExpiresAt: string | null, modelMinTier: string): { ok: boolean; reason?: string } {
  if (modelMinTier === 'free') return { ok: true };
  if (!userTier || userTier === 'free') return { ok: false, reason: `需开通 ${modelMinTier.toUpperCase()} 及以上会员` };
  if (membershipExpiresAt && new Date(membershipExpiresAt).getTime() <= Date.now()) return { ok: false, reason: '会员已过期，请续费' };
  const userLevel = TIER_ORDER[userTier] ?? 0;
  const modelLevel = TIER_ORDER[modelMinTier] ?? 0;
  if (userLevel < modelLevel) return { ok: false, reason: `该模型需要 ${modelMinTier.toUpperCase()} 及以上会员` };
  return { ok: true };
}

const PROVIDER_ENDPOINTS: Record<string, string> = {
  bytedance: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
  // 千问：阿里云百炼专属网关地址（用户专属 MaaS 网关，非默认 dashscope 域名）
  alibaba: 'https://ws-jiofwcml2nqy8gqe.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/chat/completions',
  zhipu: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
  deepseek: 'https://api.deepseek.com/v1/chat/completions',
};

const PROVIDER_ENV_KEYS: Record<string, string> = {
  bytedance: 'DOUBAO_API_KEY',
  alibaba: 'QWEN_API_KEY',
  zhipu: 'ZHIPU_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
};

async function callProvider(model: ModelConfig, messages: ChatMessage[], apiKey: string): Promise<ProviderResponse> {
  const url = PROVIDER_ENDPOINTS[model.provider];
  if (!url) throw new Error(`不支持的厂商: ${model.provider}`);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model: model.id, messages, stream: false }),
  });
  if (!res.ok) { const text = await res.text(); throw new Error(`厂商 API 错误 (${res.status}): ${text}`); }
  const data = await res.json();
  const choice = data.choices?.[0];
  return {
    content: choice?.message?.content || '',
    usage: data.usage ? { input_tokens: data.usage.prompt_tokens, output_tokens: data.usage.completion_tokens } : null,
    finish_reason: choice?.finish_reason || null,
  };
}

async function callProviderStream(model: ModelConfig, messages: ChatMessage[], apiKey: string): Promise<ReadableStream<StreamChunk>> {
  const url = PROVIDER_ENDPOINTS[model.provider];
  if (!url) throw new Error(`不支持的厂商: ${model.provider}`);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model: model.id, messages, stream: true }),
  });
  if (!res.ok) { const text = await res.text(); throw new Error(`厂商 API 错误 (${res.status}): ${text}`); }
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  return new ReadableStream<StreamChunk>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) { controller.close(); return; }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === '[DONE]') { controller.close(); return; }
          try {
            const json = JSON.parse(payload);
            const choice = json.choices?.[0];
            const delta = choice?.delta?.content || '';
            const finishReason = choice?.finish_reason || null;
            const usage = json.usage ? { input_tokens: json.usage.prompt_tokens, output_tokens: json.usage.completion_tokens } : null;
            controller.enqueue({ delta, usage, finish_reason: finishReason });
          } catch { /* 跳过无法解析的行 */ }
        }
      } catch (err) { controller.error(err); }
    },
    cancel() { reader.cancel(); },
  });
}

function getProviderApiKey(provider: string): string {
  const envKey = PROVIDER_ENV_KEYS[provider];
  if (!envKey) throw new Error(`未知厂商: ${provider}`);
  const key = Deno.env.get(envKey);
  if (!key) throw new Error(`环境变量 ${envKey} 未配置`);
  return key;
}

function calculateCost(inputTokens: number, outputTokens: number, inputPrice: number, outputPrice: number): number {
  return (inputTokens / 1000) * inputPrice + (outputTokens / 1000) * outputPrice;
}

function estimateTokens(text: string): number {
  let cjk = 0; let ascii = 0;
  for (const ch of text) { if (ch.charCodeAt(0) > 127) cjk++; else ascii++; }
  return Math.ceil(cjk / 1.5) + Math.ceil(ascii / 4);
}
// === 内联结束 ===

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sha256(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const jsonHeaders = { ...cors, 'Content-Type': 'application/json' };

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: { message: '缺少 API Key', type: 'authentication_error' } }), { status: 401, headers: jsonHeaders });
    }

    const rawKey = authHeader.slice(7).trim();
    const keyHash = await sha256(rawKey);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: keyRow } = await adminClient.from('ai_api_keys').select('id, user_id').eq('key_hash', keyHash).maybeSingle();
    if (!keyRow) return new Response(JSON.stringify({ error: { message: 'API Key 无效', type: 'authentication_error' } }), { status: 401, headers: jsonHeaders });

    const userId = keyRow.user_id;
    const apiKeyId = keyRow.id;
    await adminClient.from('ai_api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', apiKeyId);

    const body = await req.json();
    const { model: modelId, messages, stream: wantStream = true } = body;
    if (!modelId || !messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: { message: '参数不完整', type: 'invalid_request_error' } }), { status: 400, headers: jsonHeaders });
    }

    const { data: modelData } = await adminClient.from('ai_models').select('*').eq('id', modelId).eq('enabled', true).maybeSingle();
    if (!modelData) return new Response(JSON.stringify({ error: { message: '模型不存在或已禁用', type: 'invalid_request_error' } }), { status: 404, headers: jsonHeaders });
    const model = modelData as unknown as ModelConfig;

    // 会员等级校验（API 调用同样受会员门槛限制）
    const { data: profileData } = await adminClient.from('profiles').select('membership_tier, membership_expires_at').eq('id', userId).maybeSingle();
    const userTier = (profileData?.membership_tier as string) || 'free';
    const membershipExpiresAt = (profileData?.membership_expires_at as string) || null;
    const tierCheck = canUseModelWithTier(userTier, membershipExpiresAt, model.min_tier || 'lite');
    if (!tierCheck.ok) {
      return new Response(JSON.stringify({ error: { message: tierCheck.reason, type: 'membership_required', code: 'membership_required' } }), { status: 403, headers: jsonHeaders });
    }

    const { data: creditsData } = await adminClient.from('ai_credits').select('balance').eq('user_id', userId).maybeSingle();
    const balance = Number(creditsData?.balance || 0);

    if (balance <= 0 && model.input_price + model.output_price > 0) {
      return new Response(JSON.stringify({ error: { message: '研点不足', type: 'insufficient_quota', balance } }), { status: 402, headers: jsonHeaders });
    }

    const providerApiKey = getProviderApiKey(model.provider);

    if (!wantStream) {
      const result = await callProvider(model, messages as ChatMessage[], providerApiKey);
      const inputTokens = result.usage?.input_tokens || estimateTokens(messages.map((m: ChatMessage) => m.content).join(''));
      const outputTokens = result.usage?.output_tokens || estimateTokens(result.content);
      const cost = calculateCost(inputTokens, outputTokens, model.input_price, model.output_price);
      const newBalance = Math.max(0, balance - cost);
      await adminClient.from('ai_credits').update({ balance: newBalance }).eq('user_id', userId);
      await adminClient.from('ai_usage_logs').insert({ user_id: userId, model_id: model.id, input_tokens: inputTokens, output_tokens: outputTokens, cost, is_free: false, api_key_id: apiKeyId, interrupted: false });
      if (cost > 0) await adminClient.from('ai_transactions').insert({ user_id: userId, amount: -cost, type: 'consumption', note: `API 调用 ${model.id}，输入 ${inputTokens} token，输出 ${outputTokens} token` });
      return new Response(JSON.stringify({
        id: `chatcmpl-${crypto.randomUUID()}`, object: 'chat.completion', created: Math.floor(Date.now() / 1000), model: model.id,
        choices: [{ index: 0, message: { role: 'assistant', content: result.content }, finish_reason: result.finish_reason || 'stop' }],
        usage: { prompt_tokens: inputTokens, completion_tokens: outputTokens, total_tokens: inputTokens + outputTokens },
      }), { headers: jsonHeaders });
    }

    const stream = await callProviderStream(model, messages as ChatMessage[], providerApiKey);
    const streamReader = stream.getReader();
    let accumulatedOutput = '';
    let estimatedOutputTokens = 0;
    let chunkCount = 0;
    let interrupted = false;
    let finalUsage: TokenUsage | null = null;
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
              sendSSE({
                id: completionId,
                object: 'chat.completion.chunk',
                created: Math.floor(Date.now() / 1000),
                model: model.id,
                choices: [{ index: 0, delta: { content: chunk.delta }, finish_reason: null }],
              });
            }
            if (chunk.usage) finalUsage = chunk.usage;
            if (chunk.finish_reason && !interrupted) break;
          }

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
