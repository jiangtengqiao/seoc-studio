// SEOC Studio - 零外部依赖的 Supabase REST 迷你客户端
// 用途：Edge Function 直接通过 fetch 调 PostgREST / Auth API，
// 彻底移除 esm.sh 的 supabase-js 依赖（解决 createClient is not defined / esm 加载失败）
// 仅实现研智助手 Edge Function 用到的能力：getUser / select / insert / update / rpc

export interface RestError {
  message: string;
  status?: number;
}

export interface RestResult<T = unknown> {
  data: T | null;
  error: RestError | null;
  count?: number | null;
}

interface Mutation {
  method: 'POST' | 'PATCH';
  body: Record<string, unknown>;
}

export class SupabaseRest {
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
