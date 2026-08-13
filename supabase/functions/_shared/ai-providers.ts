// SEOC Studio AI Platform - 厂商适配器与计费共享模块
// 供 ai-chat 和 ai-api-proxy 两个 Edge Function 共用

// ============================================================
// 类型定义
// ============================================================
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ModelConfig {
  id: string;
  provider: string;
  display_name: Record<string, string>;
  input_price: number;   // 每千 input token 研点
  output_price: number;  // 每千 output token 研点
  free_daily_quota: number;
  min_tier: 'lite' | 'plus' | 'pro' | 'max';
  enabled: boolean;
}

// 会员等级排序（free < lite < plus < pro < max）
export const TIER_ORDER: Record<string, number> = {
  free: 0,
  lite: 1,
  plus: 2,
  pro: 3,
  max: 4,
};

/**
 * 校验用户会员等级是否达到模型要求（服务端强制校验）
 */
export function canUseModelWithTier(
  userTier: string,
  membershipExpiresAt: string | null,
  modelMinTier: string
): { ok: boolean; reason?: string } {
  if (modelMinTier === 'free') return { ok: true };
  if (!userTier || userTier === 'free') {
    return { ok: false, reason: `需开通 ${modelMinTier.toUpperCase()} 及以上会员` };
  }
  // 会员过期则视为 free
  if (membershipExpiresAt && new Date(membershipExpiresAt).getTime() <= Date.now()) {
    return { ok: false, reason: '会员已过期，请续费' };
  }
  const userLevel = TIER_ORDER[userTier] ?? 0;
  const modelLevel = TIER_ORDER[modelMinTier] ?? 0;
  if (userLevel < modelLevel) {
    return { ok: false, reason: `该模型需要 ${modelMinTier.toUpperCase()} 及以上会员` };
  }
  return { ok: true };
}

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
}

export interface ProviderResponse {
  content: string;
  usage: TokenUsage | null;
  finish_reason: string | null;
}

export interface StreamChunk {
  delta: string;
  usage: TokenUsage | null;  // 最后一个 chunk 可能携带精确 usage
  finish_reason: string | null;
}

// ============================================================
// 厂商 API 适配
// ============================================================

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

/**
 * 非流式调用：一次性返回完整结果
 */
export async function callProvider(
  model: ModelConfig,
  messages: ChatMessage[],
  apiKey: string,
  opts?: { maxTokens?: number; temperature?: number; topP?: number }
): Promise<ProviderResponse> {
  const url = PROVIDER_ENDPOINTS[model.provider];
  if (!url) throw new Error(`不支持的厂商: ${model.provider}`);

  const body: Record<string, unknown> = {
    model: model.id,
    messages,
    stream: false,
  };
  if (opts?.maxTokens) body.max_tokens = opts.maxTokens;
  if (opts?.temperature !== undefined) body.temperature = opts.temperature;
  if (opts?.topP !== undefined) body.top_p = opts.topP;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`厂商 API 错误 (${res.status}): ${text}`);
  }

  const data = await res.json();
  const choice = data.choices?.[0];
  return {
    content: choice?.message?.content || '',
    usage: data.usage
      ? { input_tokens: data.usage.prompt_tokens, output_tokens: data.usage.completion_tokens }
      : null,
    finish_reason: choice?.finish_reason || null,
  };
}

/**
 * 流式调用：返回 ReadableStream<StreamChunk>
 */
export async function callProviderStream(
  model: ModelConfig,
  messages: ChatMessage[],
  apiKey: string,
  opts?: { maxTokens?: number; temperature?: number; topP?: number }
): Promise<ReadableStream<StreamChunk>> {
  const url = PROVIDER_ENDPOINTS[model.provider];
  if (!url) throw new Error(`不支持的厂商: ${model.provider}`);

  const body: Record<string, unknown> = {
    model: model.id,
    messages,
    stream: true,
  };
  if (opts?.maxTokens) body.max_tokens = opts.maxTokens;
  if (opts?.temperature !== undefined) body.temperature = opts.temperature;
  if (opts?.topP !== undefined) body.top_p = opts.topP;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`厂商 API 错误 (${res.status}): ${text}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  return new ReadableStream<StreamChunk>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          return;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === '[DONE]') {
            controller.close();
            return;
          }
          try {
            const json = JSON.parse(payload);
            const choice = json.choices?.[0];
            const delta = choice?.delta?.content || '';
            const finishReason = choice?.finish_reason || null;
            const usage = json.usage
              ? { input_tokens: json.usage.prompt_tokens, output_tokens: json.usage.completion_tokens }
              : null;

            controller.enqueue({ delta, usage, finish_reason: finishReason });
          } catch {
            // 跳过无法解析的行
          }
        }
      } catch (err) {
        controller.error(err);
      }
    },
    cancel() {
      reader.cancel();
    },
  });
}

/**
 * 获取厂商 API Key（从环境变量）
 */
export function getProviderApiKey(provider: string): string {
  const envKey = PROVIDER_ENV_KEYS[provider];
  if (!envKey) throw new Error(`未知厂商: ${provider}`);
  const key = Deno.env.get(envKey);
  if (!key) throw new Error(`环境变量 ${envKey} 未配置`);
  return key;
}

// ============================================================
// 计费逻辑
// ============================================================

/**
 * 计算 token 消耗研点
 */
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  inputPrice: number,
  outputPrice: number
): number {
  return (inputTokens / 1000) * inputPrice + (outputTokens / 1000) * outputPrice;
}

/**
 * 简单 token 估算（中文约 1.5 字/token，英文约 4 字符/token）
 * 当厂商未返回精确 usage 时使用
 */
export function estimateTokens(text: string): number {
  // 混合估算：CJK 字符按 1.5 字/token，ASCII 按 4 字符/token
  let cjk = 0;
  let ascii = 0;
  for (const ch of text) {
    if (ch.charCodeAt(0) > 127) cjk++;
    else ascii++;
  }
  return Math.ceil(cjk / 1.5) + Math.ceil(ascii / 4);
}

/**
 * 免费额度重置检查
 */
export function shouldResetFreeQuota(freeResetDate: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return freeResetDate < today;
}
