// ============================================================
// 内联模块：rest.ts（零依赖 PostgREST 客户端）+ ai-providers.ts（厂商适配）
// 由 scripts/gen-inline-deploy.cjs 自动生成，请勿手工编辑
// ============================================================

// SEOC Studio - 零外部依赖的 Supabase REST 迷你客户端
// 用途：Edge Function 直接通过 fetch 调 PostgREST / Auth API，
// 彻底移除 esm.sh 的 supabase-js 依赖（解决 createClient is not defined / esm 加载失败）
// 仅实现研智助手 Edge Function 用到的能力：getUser / select / insert / update / rpc

interface RestError {
  message: string;
  status?: number;
}

interface RestResult<T = unknown> {
  data: T | null;
  error: RestError | null;
  count?: number | null;
}

interface Mutation {
  method: 'POST' | 'PATCH';
  body: Record<string, unknown>;
}

class SupabaseRest {
  private url: string;
  private serviceKey: string;
  private anonKey: string;

  constructor(url: string, serviceKey: string, anonKey: string) {
    this.url = url.replace(/\/+$/, '');
    this.serviceKey = serviceKey;
    this.anonKey = anonKey;
  }

  get restUrl(): string {
    return this.url;
  }

  private pgHeaders(prefer?: string): Record<string, string> {
    const h: Record<string, string> = {
      apikey: this.serviceKey,
      Authorization: `Bearer ${this.serviceKey}`,
      'Content-Type': 'application/json',
    };
    if (prefer) h['Prefer'] = prefer;
    return h;
  }

  /** 供 Query 内部使用的公开包装 */
  publicHeaders(prefer?: string): Record<string, string> {
    return this.pgHeaders(prefer);
  }

  /** 校验用户 JWT（等价 adminClient.auth.getUser） */
  async getUser(jwt: string): Promise<{ data: { user: { id: string; email?: string } } | null; error: RestError | null }> {
    try {
      const res = await fetch(`${this.url}/auth/v1/user`, {
        headers: {
          apikey: this.anonKey,
          Authorization: `Bearer ${jwt}`,
        },
      });
      if (!res.ok) {
        return { data: null, error: { message: `身份验证失败 (${res.status})`, status: res.status } };
      }
      const u = await res.json();
      return { data: { user: { id: u.id, email: u.email } }, error: null };
    } catch (e) {
      return { data: null, error: { message: String(e?.message || e) } };
    }
  }

  from<T = Record<string, unknown>>(table: string): Query<T> {
    return new Query<T>(this, table);
  }

  /** 调用数据库 RPC（security definer 函数） */
  async rpc<T = unknown>(fn: string, args: Record<string, unknown> = {}): Promise<{ data: T | null; error: RestError | null }> {
    try {
      const res = await fetch(`${this.url}/rest/v1/rpc/${fn}`, {
        method: 'POST',
        headers: this.pgHeaders(),
        body: JSON.stringify(args),
      });
      if (!res.ok) {
        let detail = '';
        try {
          const j = await res.json();
          detail = j.message || j.error || '';
        } catch {
          /* 忽略 */
        }
        return { data: null, error: { message: `rpc ${fn} 失败 (${res.status}) ${detail}`.trim(), status: res.status } };
      }
      const text = await res.text();
      return { data: text ? (JSON.parse(text) as T) : null, error: null };
    } catch (e) {
      return { data: null, error: { message: String(e?.message || e) } };
    }
  }
}

class Query<T = Record<string, unknown>> {
  private client: SupabaseRest;
  private table: string;
  private cols = '*';
  private filters: string[] = [];
  private orders: string[] = [];
  private limitV: number | null = null;
  private countExact = false;
  private headOnly = false;
  private mutation: Mutation | null = null;

  constructor(client: SupabaseRest, table: string) {
    this.client = client;
    this.table = table;
  }

  select(cols: string | string[], opts?: { count?: 'exact'; head?: boolean }): this {
    this.cols = Array.isArray(cols) ? cols.join(',') : cols;
    if (opts?.count === 'exact') this.countExact = true;
    if (opts?.head) this.headOnly = true;
    return this;
  }

  eq(col: string, val: unknown): this {
    this.filters.push(`${col}=eq.${encodeURIComponent(String(val))}`);
    return this;
  }

  gte(col: string, val: unknown): this {
    this.filters.push(`${col}=gte.${encodeURIComponent(String(val))}`);
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }): this {
    this.orders.push(`${col}.${opts?.ascending === false ? 'desc' : 'asc'}`);
    return this;
  }

  limit(n: number): this {
    this.limitV = n;
    return this;
  }

  insert(row: Partial<T>): this {
    this.mutation = { method: 'POST', body: row as Record<string, unknown> };
    return this;
  }

  update(row: Partial<T>): this {
    this.mutation = { method: 'PATCH', body: row as Record<string, unknown> };
    return this;
  }

  private buildUrl(): string {
    const params: string[] = [];
    if (this.cols !== '*') params.push(`select=${encodeURIComponent(this.cols)}`);
    for (const f of this.filters) params.push(f);
    for (const o of this.orders) params.push(`order=${encodeURIComponent(o)}`);
    if (this.limitV != null) params.push(`limit=${this.limitV}`);
    const qs = params.length ? `?${params.join('&')}` : '';
    return `${this.client.restUrl}/rest/v1/${this.table}${qs}`;
  }

  private async exec(): Promise<RestResult<T[]>> {
    try {
      const isMutation = this.mutation != null;
      const prefer: string[] = [];
      if (isMutation) prefer.push('return=representation');
      if (this.countExact && !isMutation) prefer.push('count=exact');
      const init: RequestInit = {
        method: isMutation ? this.mutation!.method : this.headOnly ? 'HEAD' : 'GET',
        headers: this.client.publicHeaders(prefer.length ? prefer.join(',') : undefined),
      };
      if (isMutation) init.body = JSON.stringify(this.mutation!.body);

      const res = await fetch(this.buildUrl(), init);
      let count: number | null = null;
      if (this.countExact && !isMutation) {
        const cr = res.headers.get('content-range');
        if (cr) {
          const total = cr.split('/')[1];
          count = total ? Number(total) : null;
        }
      }
      if (!res.ok) {
        let msg = `请求失败 (${res.status})`;
        try {
          const j = await res.json();
          msg = j.message || j.error || msg;
        } catch {
          /* 忽略 */
        }
        return { data: null, error: { message: msg, status: res.status }, count };
      }
      if (this.headOnly) {
        return { data: null, error: null, count };
      }
      const text = await res.text();
      const rows = text ? (JSON.parse(text) as T[]) : [];
      return { data: Array.isArray(rows) ? rows : [rows], error: null, count };
    } catch (e) {
      return { data: null, error: { message: String(e?.message || e) } };
    }
  }

  /** 返回第一行或 null（等价 maybeSingle） */
  async maybeSingle(): Promise<RestResult<T>> {
    const r = await this.exec();
    return { data: (r.data && r.data[0]) ?? null, error: r.error };
  }

  /** 返回第一行（等价 single） */
  async single(): Promise<RestResult<T>> {
    const r = await this.exec();
    if (r.error) return { data: null, error: r.error };
    if (!r.data || r.data.length === 0) {
      return { data: null, error: { message: '未找到记录' } };
    }
    return { data: r.data[0], error: null };
  }

  /** 默认直接执行（select 不带 maybeSingle 时） */
  then<TResult1 = RestResult<T[]>, TResult2 = never>(
    onfulfilled?: ((value: RestResult<T[]>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.exec().then(onfulfilled, onrejected);
  }
}

// SEOC Studio AI Platform - 厂商适配器与计费共享模块
// 供 ai-chat 和 ai-api-proxy 两个 Edge Function 共用

// ============================================================
// 类型定义
// ============================================================
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ModelConfig {
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
const TIER_ORDER: Record<string, number> = {
  free: 0,
  lite: 1,
  plus: 2,
  pro: 3,
  max: 4,
};

/**
 * 校验用户会员等级是否达到模型要求（服务端强制校验）
 */
function canUseModelWithTier(
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

interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
}

interface ProviderResponse {
  content: string;
  usage: TokenUsage | null;
  finish_reason: string | null;
}

interface StreamChunk {
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
async function callProvider(
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
async function callProviderStream(
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
function getProviderApiKey(provider: string): string {
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
function calculateCost(
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
function estimateTokens(text: string): number {
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
 * 修复：原判断 freeResetDate < today，当天创建的用户永远不重置（首日 == 今日，
 * free_remaining 永远是 0，免费额度机制完全失效）。改为“不等于今天”即重置。
 */
function shouldResetFreeQuota(freeResetDate: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return freeResetDate !== today;
}

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
