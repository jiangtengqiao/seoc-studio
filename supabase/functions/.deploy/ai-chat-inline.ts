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

// SEOC Studio 研智助手 - AI 聊天 Edge Function
// 支持流式 SSE、实时 token 监测、余额不足强制中断
// v7 加固：
//  - 服务端输入长度/token 上限（防免费额度无限长输入刷成本）
//  - 原子扣费（spend_ai_credits / spend_ai_free_quota RPC，防并发透支）
//  - 客户端断开（停止生成）时中断上游并做部分结算
//  - 每用户每分钟请求限流
// v12：移除 esm.sh supabase-js 依赖，改用零依赖 PostgREST 客户端（_shared/rest.ts）
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 服务端护栏
const MAX_INPUT_CHARS = 20000; // 单条消息最大字符数
const MAX_INPUT_TOKENS = 16000; // 历史总输入 token 上限
const MAX_OUTPUT_TOKENS = 4096; // 单次回复输出上限（厂商 max_tokens）
const RATE_LIMIT_PER_MIN = 15; // 每用户每分钟最多请求数

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    // 1. JWT 验证用户身份
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: '未授权' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const adminClient = new SupabaseRest(supabaseUrl, serviceRoleKey, anonKey);

    // 验证 JWT
    const { data: userData, error: authError } = await adminClient.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !userData.user) {
      return new Response(JSON.stringify({ error: '身份验证失败' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    const userId = userData.user.id;

    // 2. 解析请求
    let parsed: { model?: string; messages?: ChatMessage[] };
    try {
      parsed = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: '请求体不是合法 JSON' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    const { model: modelId, messages } = parsed;
    if (!modelId || !messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: '参数不完整' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // 2.5 输入护栏：角色白名单 + 长度/token 上限
    for (const m of messages) {
      if (!['system', 'user', 'assistant'].includes(m.role)) {
        return new Response(JSON.stringify({ error: '消息角色不合法' }), {
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
      if (typeof m.content !== 'string' || m.content.length > MAX_INPUT_CHARS) {
        return new Response(
          JSON.stringify({ error: `单条消息不能超过 ${MAX_INPUT_CHARS} 字符` }),
          { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
        );
      }
    }
    const totalInputTokens = estimateTokens(messages.map((m) => m.content).join(''));
    if (totalInputTokens > MAX_INPUT_TOKENS) {
      return new Response(
        JSON.stringify({ error: `输入过长（约 ${totalInputTokens} token，上限 ${MAX_INPUT_TOKENS}）` }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    // 2.6 速率限制：按最近 1 分钟 usage_logs 计数
    const oneMinAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { count: recentCount } = await adminClient
      .from('ai_usage_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', oneMinAgo);
    if ((recentCount || 0) >= RATE_LIMIT_PER_MIN) {
      return new Response(
        JSON.stringify({ error: '请求过于频繁，请稍后再试', code: 'rate_limited' }),
        { status: 429, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    // 3. 查询模型配置
    const { data: modelData, error: modelError } = await adminClient
      .from('ai_models')
      .select('*')
      .eq('id', modelId)
      .eq('enabled', true)
      .maybeSingle();

    if (modelError || !modelData) {
      return new Response(JSON.stringify({ error: '模型不存在或已禁用' }), {
        status: 404,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    const model = modelData as unknown as ModelConfig;

    // 3.5 会员等级校验（服务端强制）
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
        JSON.stringify({ error: '账户已被封禁，如有疑问请联系管理员', code: 'banned' }),
        { status: 403, headers: { ...cors, 'Content-Type': 'application/json' } }
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
          JSON.stringify({ error: '输入包含违规内容，请修改后重试', code: 'content_filter' }),
          { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
        );
      }
    }

    const tierCheck = canUseModelWithTier(userTier, membershipExpiresAt, model.min_tier || 'lite');
    if (!tierCheck.ok) {
      return new Response(
        JSON.stringify({ error: tierCheck.reason, code: 'membership_required' }),
        { status: 403, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    // 4. 查询用户余额与免费额度
    let { data: creditsData } = await adminClient
      .from('ai_credits')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    // 如果不存在则创建
    if (!creditsData) {
      const { data: newCredits } = await adminClient
        .from('ai_credits')
        .insert({ user_id: userId, balance: 0, free_remaining: 0, free_reset_date: new Date().toISOString().slice(0, 10) })
        .select()
        .single();
      creditsData = newCredits;
    }

    let balance = Number(creditsData?.balance || 0);
    let freeRemaining = creditsData?.free_remaining || 0;
    const freeResetDate = creditsData?.free_reset_date || new Date().toISOString().slice(0, 10);

    // 免费额度重置
    if (shouldResetFreeQuota(freeResetDate)) {
      freeRemaining = model.free_daily_quota;
      await adminClient
        .from('ai_credits')
        .update({
          free_remaining: freeRemaining,
          free_reset_date: new Date().toISOString().slice(0, 10),
        })
        .eq('user_id', userId);
    }

    // 5. 预检：余额 + 免费额度均为 0 时拒绝（此时免费额度已重置为今日额度）
    if (balance <= 0 && freeRemaining <= 0 && model.input_price + model.output_price > 0) {
      return new Response(
        JSON.stringify({
          error: '研点不足：今日免费额度已用完，请充值研点或明天再试',
          code: 'insufficient_balance',
          balance,
          free_remaining: freeRemaining,
        }),
        { status: 402, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    // 6. 获取厂商 API Key 并发起流式调用
    const providerApiKey = getProviderApiKey(model.provider);
    const stream = await callProviderStream(model, messages as ChatMessage[], providerApiKey, {
      maxTokens: MAX_OUTPUT_TOKENS,
    });

    // 7. 流式 SSE 输出 + 实时监测
    const reader = stream.getReader();
    let accumulatedOutput = '';
    let estimatedOutputTokens = 0;
    let chunkCount = 0;
    let interrupted = false;
    let finalUsage: TokenUsage | null = null;
    let settled = false; // 防止重复结算

    const encoder = new TextEncoder();

    // 结算：扣费 + 记录日志/流水。safeEnqueue 保证客户端断开后也不会抛错。
    const settle = async (): Promise<{ cost: number; isFree: boolean; balance: number; freeRemaining: number } | null> => {
      if (settled) return null;
      settled = true;

      const inputTokens = finalUsage?.input_tokens || totalInputTokens;
      const outputTokens = finalUsage?.output_tokens || estimatedOutputTokens;
      const cost = calculateCost(inputTokens, outputTokens, model.input_price, model.output_price);

      let isFree = false;

      if (freeRemaining > 0 && !interrupted) {
        // 走免费额度（原子扣减一次）
        const { data: newFree } = await adminClient.rpc('spend_ai_free_quota', { p_user: userId });
        if (typeof newFree === 'number' && newFree >= 0) {
          isFree = true;
          freeRemaining = newFree;
        } else {
          // 免费额度竞争失败：转为余额扣费
          const { data: newBalance } = await adminClient.rpc('spend_ai_credits', {
            p_user: userId,
            p_cost: cost,
          });
          if (typeof newBalance === 'number' && newBalance >= 0) balance = newBalance;
          else balance = Math.max(0, balance - cost);
        }
      } else if (cost > 0) {
        // 从余额原子扣费
        const { data: newBalance } = await adminClient.rpc('spend_ai_credits', {
          p_user: userId,
          p_cost: cost,
        });
        if (typeof newBalance === 'number' && newBalance >= 0) balance = newBalance;
        else balance = Math.max(0, balance - cost);
      }

      // 记录使用日志
      try {
        await adminClient.from('ai_usage_logs').insert({
          user_id: userId,
          model_id: model.id,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          cost,
          is_free: isFree,
          interrupted,
        });
      } catch (_) {
        // 日志失败不阻断响应
      }

      // 记录交易流水（非免费时）
      if (!isFree && cost > 0) {
        try {
          await adminClient.from('ai_transactions').insert({
            user_id: userId,
            amount: -cost,
            type: 'consumption',
            note: `使用 ${model.id}，输入 ${inputTokens} token，输出 ${outputTokens} token${interrupted ? '（中断）' : ''}`,
          });
        } catch (_) {
          // 流水失败不阻断响应
        }
      }

      return { cost, isFree, balance, freeRemaining };
    };

    const sseStream = new ReadableStream({
      async start(controller) {
        let closed = false;
        const sendEvent = (data: object) => {
          if (closed) return;
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          } catch {
            closed = true;
          }
        };

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = value as StreamChunk;
            chunkCount++;

            if (chunk.delta) {
              accumulatedOutput += chunk.delta;

              // 估算 token（每 10 个 chunk 或每积累约 500 字符时重新估算）
              if (chunkCount % 10 === 0 || accumulatedOutput.length % 500 < chunk.delta.length) {
                estimatedOutputTokens = estimateTokens(accumulatedOutput);
                const currentCost = calculateCost(
                  totalInputTokens,
                  estimatedOutputTokens,
                  model.input_price,
                  model.output_price
                );

                // 实时消耗通知
                sendEvent({
                  type: 'progress',
                  delta: chunk.delta,
                  estimated_cost: Math.round(currentCost * 10000) / 10000,
                  estimated_tokens: estimatedOutputTokens,
                });

                // 余额检查（仅对付费模型，且有余额上限时）
                if (model.input_price + model.output_price > 0 && balance > 0 && freeRemaining <= 0) {
                  if (currentCost > balance) {
                    interrupted = true;
                    // 先结算（部分输出按实际消耗扣费）
                    const settledInfo = await settle();
                    sendEvent({
                      type: 'interrupted',
                      reason: '研点不足',
                      tokens_used: estimatedOutputTokens,
                      cost: Math.round(currentCost * 10000) / 10000,
                      balance: settledInfo?.balance ?? 0,
                      free_remaining: settledInfo?.freeRemaining ?? 0,
                    });
                    break;
                  }
                }
              } else {
                // 正常文本 chunk
                sendEvent({ type: 'chunk', delta: chunk.delta });
              }
            }

            // 厂商返回精确 usage（通常在最后一个 chunk）
            if (chunk.usage) {
              finalUsage = chunk.usage;
            }

            if (chunk.finish_reason) {
              break;
            }
          }

          // 8. 正常完成：结算并发送 done 事件
          //    中断路径已在上面结算并发送 interrupted 事件，这里不再重复。
          if (!settled) {
            const settledInfo = await settle();
            sendEvent({
              type: 'done',
              usage: {
                input_tokens: finalUsage?.input_tokens || totalInputTokens,
                output_tokens: finalUsage?.output_tokens || estimatedOutputTokens,
              },
              cost: Math.round((settledInfo?.cost ?? 0) * 10000) / 10000,
              is_free: settledInfo?.isFree ?? false,
              interrupted,
              balance: settledInfo?.balance ?? balance,
              free_remaining: settledInfo?.freeRemaining ?? freeRemaining,
            });
          }

          sendEvent({ type: 'eof' });
          if (!closed) {
            try {
              controller.close();
            } catch {
              /* 已关闭 */
            }
          }
        } catch (err) {
          // 上游异常或客户端取消：有部分输出则做部分结算
          if (accumulatedOutput) {
            interrupted = true;
            try {
              await settle();
            } catch {
              /* 结算失败不阻断 */
            }
          }
          sendEvent({ type: 'error', message: String(err?.message || err) });
          if (!closed) {
            try {
              controller.close();
            } catch {
              /* 已关闭 */
            }
          }
        }
      },
      // 客户端断开（停止生成）：中断上游读取
      async cancel() {
        try {
          await reader.cancel();
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
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
