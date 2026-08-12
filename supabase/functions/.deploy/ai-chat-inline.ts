// SEOC Studio 研智助手 - AI 聊天 Edge Function（控制台部署版，内联 _shared）
// 支持流式 SSE、实时 token 监测、余额不足强制中断
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

function shouldResetFreeQuota(freeResetDate: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return freeResetDate < today;
}
// === 内联结束 ===

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: '未授权' }), { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: userData, error: authError } = await adminClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !userData.user) return new Response(JSON.stringify({ error: '身份验证失败' }), { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } });
    const userId = userData.user.id;

    const { model: modelId, messages } = await req.json();
    if (!modelId || !messages || !Array.isArray(messages) || messages.length === 0) return new Response(JSON.stringify({ error: '参数不完整' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });

    const { data: modelData } = await adminClient.from('ai_models').select('*').eq('id', modelId).eq('enabled', true).maybeSingle();
    if (!modelData) return new Response(JSON.stringify({ error: '模型不存在或已禁用' }), { status: 404, headers: { ...cors, 'Content-Type': 'application/json' } });
    const model = modelData as unknown as ModelConfig;

    // 会员等级校验（服务端强制）
    const { data: profileData } = await adminClient.from('profiles').select('membership_tier, membership_expires_at').eq('id', userId).maybeSingle();
    const userTier = (profileData?.membership_tier as string) || 'free';
    const membershipExpiresAt = (profileData?.membership_expires_at as string) || null;
    const tierCheck = canUseModelWithTier(userTier, membershipExpiresAt, model.min_tier || 'lite');
    if (!tierCheck.ok) return new Response(JSON.stringify({ error: tierCheck.reason, code: 'membership_required' }), { status: 403, headers: { ...cors, 'Content-Type': 'application/json' } });

    let { data: creditsData } = await adminClient.from('ai_credits').select('*').eq('user_id', userId).maybeSingle();
    if (!creditsData) {
      const { data: newCredits } = await adminClient.from('ai_credits').insert({ user_id: userId, balance: 0, free_remaining: 0, free_reset_date: new Date().toISOString().slice(0, 10) }).select().single();
      creditsData = newCredits;
    }

    let balance = Number(creditsData?.balance || 0);
    let freeRemaining = creditsData?.free_remaining || 0;
    const freeResetDate = creditsData?.free_reset_date || new Date().toISOString().slice(0, 10);

    if (shouldResetFreeQuota(freeResetDate)) {
      freeRemaining = model.free_daily_quota;
      await adminClient.from('ai_credits').update({ free_remaining: freeRemaining, free_reset_date: new Date().toISOString().slice(0, 10) }).eq('user_id', userId);
    }

    if (balance <= 0 && freeRemaining <= 0 && model.input_price + model.output_price > 0) {
      return new Response(JSON.stringify({ error: '研点不足', balance, free_remaining: freeRemaining }), { status: 402, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    const providerApiKey = getProviderApiKey(model.provider);
    const stream = await callProviderStream(model, messages as ChatMessage[], providerApiKey);
    const reader = stream.getReader();
    let accumulatedOutput = ''; let estimatedOutputTokens = 0; let chunkCount = 0; let interrupted = false; let finalUsage = null;
    const encoder = new TextEncoder();

    const sseStream = new ReadableStream({
      async start(controller) {
        const sendEvent = (data: object) => { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)); };
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = value as StreamChunk;
            chunkCount++;
            if (chunk.delta) {
              accumulatedOutput += chunk.delta;
              if (chunkCount % 10 === 0 || accumulatedOutput.length % 500 < chunk.delta.length) {
                estimatedOutputTokens = estimateTokens(accumulatedOutput);
                const inputEstimate = estimateTokens(messages.map((m: ChatMessage) => m.content).join(''));
                const currentCost = calculateCost(inputEstimate, estimatedOutputTokens, model.input_price, model.output_price);
                sendEvent({ type: 'progress', delta: chunk.delta, estimated_cost: Math.round(currentCost * 10000) / 10000, estimated_tokens: estimatedOutputTokens });
                if (model.input_price + model.output_price > 0) {
                  const availableForPaid = freeRemaining > 0 ? Infinity : balance;
                  if (currentCost > availableForPaid) {
                    interrupted = true;
                    sendEvent({ type: 'interrupted', reason: '研点不足', tokens_used: estimatedOutputTokens, cost: Math.round(currentCost * 10000) / 10000, balance, free_remaining: freeRemaining });
                    break;
                  }
                }
              } else {
                sendEvent({ type: 'chunk', delta: chunk.delta });
              }
            }
            if (chunk.usage) finalUsage = chunk.usage;
            if (chunk.finish_reason) break;
          }
          const inputTokens = finalUsage?.input_tokens || estimateTokens(messages.map((m: ChatMessage) => m.content).join(''));
          const outputTokens = finalUsage?.output_tokens || estimatedOutputTokens;
          const cost = calculateCost(inputTokens, outputTokens, model.input_price, model.output_price);
          let isFree = false;
          if (freeRemaining > 0 && !interrupted) {
            isFree = true;
            freeRemaining = Math.max(0, freeRemaining - 1);
            await adminClient.from('ai_credits').update({ free_remaining: freeRemaining, updated_at: new Date().toISOString() }).eq('user_id', userId);
          } else if (cost > 0) {
            balance = Math.max(0, balance - cost);
            await adminClient.from('ai_credits').update({ balance, updated_at: new Date().toISOString() }).eq('user_id', userId);
          }
          await adminClient.from('ai_usage_logs').insert({ user_id: userId, model_id: model.id, input_tokens: inputTokens, output_tokens: outputTokens, cost, is_free: isFree, interrupted });
          if (!isFree && cost > 0) {
            await adminClient.from('ai_transactions').insert({ user_id: userId, amount: -cost, type: 'consumption', note: `使用 ${model.id}，输入 ${inputTokens} token，输出 ${outputTokens} token` });
          }
          sendEvent({ type: 'done', usage: { input_tokens: inputTokens, output_tokens: outputTokens }, cost: Math.round(cost * 10000) / 10000, is_free: isFree, interrupted, balance, free_remaining: freeRemaining });
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err) {
          sendEvent({ type: 'error', message: String(err?.message || err) });
          controller.close();
        }
      },
    });

    return new Response(sseStream, { headers: { ...cors, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});
