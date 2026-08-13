// SEOC Studio 研智助手 - 前端客户端库
// 双模模式：云端调 Edge Function，本地 localStorage mock

import { supabase, isCloudEnabled } from './supabase';

// ============================================================
// 类型定义
// ============================================================

export interface AIModel {
  id: string;
  provider: string;
  display_name: Record<string, string>;
  input_price: number;
  output_price: number;
  free_daily_quota: number;
  min_tier: 'lite' | 'plus' | 'pro' | 'max';
  enabled: boolean;
  sort_order: number;
}

export interface AIBalance {
  balance: number;
  free_remaining: number;
  free_daily_quota?: number;
  free_reset_date?: string;
}

export interface AIUsageLog {
  id: string;
  model_id: string;
  input_tokens: number;
  output_tokens: number;
  cost: number;
  is_free: boolean;
  interrupted: boolean;
  created_at: string;
}

export interface AITransaction {
  id: string;
  amount: number;
  type: 'purchase' | 'consumption' | 'free_grant' | 'refund' | 'admin_adjust';
  note?: string;
  created_at: string;
}

export interface AIApiKey {
  id: string;
  name: string;
  key_hash: string;
  last_used_at?: string;
  created_at: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface StreamCallbacks {
  onChunk: (text: string) => void;
  onProgress?: (cost: number, tokens: number) => void;
  onInterrupt?: (reason: string, tokensUsed: number, cost: number) => void;
  onDone?: (usage: { input_tokens: number; output_tokens: number }, cost: number, isFree: boolean, balance: number, freeRemaining: number) => void;
  onError?: (error: string) => void;
  onAbort?: () => void;
}

// ============================================================
// 获取模型列表
// ============================================================

export async function getModels(): Promise<AIModel[]> {
  if (!isCloudEnabled || !supabase) {
    // 本地 mock
    return [
      {
        id: 'mock-qwen',
        provider: 'alibaba',
        display_name: { 'zh-CN': '通义千问 Max (演示)', en: 'Qwen Max (Demo)' },
        input_price: 2,
        output_price: 6,
        free_daily_quota: 5,
        min_tier: 'lite' as const,
        enabled: true,
        sort_order: 1,
      },
      {
        id: 'mock-glm',
        provider: 'zhipu',
        display_name: { 'zh-CN': '智谱 GLM-4 (演示)', en: 'GLM-4 (Demo)' },
        input_price: 5,
        output_price: 15,
        free_daily_quota: 3,
        min_tier: 'plus' as const,
        enabled: true,
        sort_order: 2,
      },
      {
        id: 'mock-deepseek',
        provider: 'deepseek',
        display_name: { 'zh-CN': 'DeepSeek Chat (演示)', en: 'DeepSeek Chat (Demo)' },
        input_price: 2,
        output_price: 8,
        free_daily_quota: 5,
        min_tier: 'lite' as const,
        enabled: true,
        sort_order: 3,
      },
    ];
  }

  const { data, error } = await supabase
    .from('ai_models')
    .select('*')
    .eq('enabled', true)
    .order('sort_order');

  if (error) throw error;
  return data as AIModel[];
}

// ============================================================
// 获取余额
// ============================================================

export async function getBalance(): Promise<AIBalance> {
  if (!isCloudEnabled || !supabase) {
    const stored = localStorage.getItem('seoc.local.ai_balance');
    if (stored) return JSON.parse(stored);
    const defaultBalance: AIBalance = { balance: 10000, free_remaining: 5, free_daily_quota: 5 };
    localStorage.setItem('seoc.local.ai_balance', JSON.stringify(defaultBalance));
    return defaultBalance;
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('未登录');

  const { data, error } = await supabase
    .from('ai_credits')
    .select('balance, free_remaining, free_reset_date')
    .eq('user_id', userData.user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return { balance: 0, free_remaining: 0 };

  return {
    balance: Number(data.balance),
    free_remaining: data.free_remaining || 0,
    free_reset_date: data.free_reset_date,
  };
}

// ============================================================
// 流式聊天
// ============================================================

export async function sendMessage(
  modelId: string,
  messages: ChatMessage[],
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  if (!isCloudEnabled || !supabase) {
    // 本地 mock 模式
    await mockStreamChat(modelId, messages, callbacks);
    return;
  }

  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  if (!token) throw new Error('未登录');

  // 处理 SSE 流
  // 注意：supabase.functions.invoke 不支持 SSE，直接用 fetch。
  // 修复：原先这里先用 invoke 调用了一次（完整执行并计费），再 fetch 一次，
  // 导致每条消息被计费两次、厂商 API 成本翻倍。现只保留一次 fetch 流式调用。
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const response = await fetch(`${supabaseUrl}/functions/v1/ai-chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ model: modelId, messages }),
    signal,
  });

  if (!response.ok) {
    let message = '请求失败';
    try {
      const err = await response.json();
      message = err.error || message;
    } catch {
      /* 非 JSON 响应 */
    }
    if (signal?.aborted) {
      callbacks.onAbort?.();
    } else {
      callbacks.onError?.(message);
    }
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    callbacks.onError?.('无法读取响应流');
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === '[DONE]') return;

        try {
          const data = JSON.parse(payload);

          if (data.type === 'chunk') {
            callbacks.onChunk(data.delta);
          } else if (data.type === 'progress') {
            callbacks.onChunk(data.delta);
            callbacks.onProgress?.(data.estimated_cost, data.estimated_tokens);
          } else if (data.type === 'interrupted') {
            callbacks.onInterrupt?.(data.reason, data.tokens_used, data.cost);
            return;
          } else if (data.type === 'done') {
            callbacks.onDone?.(data.usage, data.cost, data.is_free, data.balance, data.free_remaining);
            return;
          } else if (data.type === 'error') {
            callbacks.onError?.(data.message);
            return;
          }
        } catch {
          // 跳过无法解析的行
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  // 用户主动停止：fetch 会抛 AbortError，不当作错误展示
  if (signal?.aborted) {
    callbacks.onAbort?.();
  }
}

// ============================================================
// 本地 Mock 流式聊天
// ============================================================

async function mockStreamChat(
  modelId: string,
  messages: ChatMessage[],
  callbacks: StreamCallbacks
): Promise<void> {
  // 检查本地余额
  const balanceKey = 'seoc.local.ai_balance';
  const stored = localStorage.getItem(balanceKey);
  const credits: AIBalance = stored ? JSON.parse(stored) : { balance: 10000, free_remaining: 5, free_daily_quota: 5 };

  if (credits.balance <= 0 && credits.free_remaining <= 0) {
    callbacks.onError?.('研点不足');
    return;
  }

  // Mock 回复
  const lastMsg = messages[messages.length - 1]?.content || '';
  const mockResponse = `这是来自 ${modelId} 的演示回复。\n\n您说："${lastMsg}"\n\n这是一个本地演示模式，实际的 AI 模型调用需要配置 Supabase Edge Function 和厂商 API Key。`;

  // 模拟流式输出
  const words = mockResponse.split('');
  let accumulated = '';
  const inputTokens = Math.ceil(messages.reduce((sum, m) => sum + m.content.length, 0) / 2);

  for (let i = 0; i < words.length; i++) {
    await new Promise((resolve) => setTimeout(resolve, 30));
    accumulated += words[i];
    callbacks.onChunk(words[i]);

    // 每 20 个字符发一次进度
    if (i % 20 === 0 && i > 0) {
      const outputTokens = Math.ceil(accumulated.length / 2);
      const cost = (inputTokens / 1000) * 2 + (outputTokens / 1000) * 6;
      callbacks.onProgress?.(cost, outputTokens);
    }
  }

  // 扣费
  const outputTokens = Math.ceil(accumulated.length / 2);
  const cost = (inputTokens / 1000) * 2 + (outputTokens / 1000) * 6;
  let isFree = false;

  if (credits.free_remaining > 0) {
    credits.free_remaining--;
    isFree = true;
  } else {
    credits.balance = Math.max(0, credits.balance - cost);
  }

  localStorage.setItem(balanceKey, JSON.stringify(credits));

  callbacks.onDone?.(
    { input_tokens: inputTokens, output_tokens: outputTokens },
    cost,
    isFree,
    credits.balance,
    credits.free_remaining
  );
}

// ============================================================
// 使用日志
// ============================================================

export async function getUsageLogs(limit = 50, offset = 0): Promise<AIUsageLog[]> {
  if (!isCloudEnabled || !supabase) {
    const stored = localStorage.getItem('seoc.local.ai_usage_logs');
    return stored ? JSON.parse(stored) : [];
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];

  const { data, error } = await supabase
    .from('ai_usage_logs')
    .select('*')
    .eq('user_id', userData.user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data as AIUsageLog[];
}

// ============================================================
// 交易流水
// ============================================================

export async function getTransactions(limit = 50, offset = 0): Promise<AITransaction[]> {
  if (!isCloudEnabled || !supabase) {
    const stored = localStorage.getItem('seoc.local.ai_transactions');
    return stored ? JSON.parse(stored) : [];
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];

  const { data, error } = await supabase
    .from('ai_transactions')
    .select('*')
    .eq('user_id', userData.user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data as AITransaction[];
}

// ============================================================
// API Key 管理
// ============================================================

export async function createApiKey(name: string): Promise<string> {
  if (!isCloudEnabled || !supabase) {
    // 本地 mock
    const mockKey = `sk-seoc-mock-${Date.now()}`;
    const keys = JSON.parse(localStorage.getItem('seoc.local.ai_api_keys') || '[]');
    keys.push({
      id: `mock-${Date.now()}`,
      name,
      key_hash: 'mock-hash',
      created_at: new Date().toISOString(),
    });
    localStorage.setItem('seoc.local.ai_api_keys', JSON.stringify(keys));
    return mockKey;
  }

  // 生成随机 key
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  const rawKey = `sk-seoc-${Array.from(randomBytes).map((b) => b.toString(16).padStart(2, '0')).join('')}`;

  // SHA-256 哈希
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawKey));
  const keyHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('未登录');

  const { error } = await supabase.from('ai_api_keys').insert({
    user_id: userData.user.id,
    name,
    key_hash: keyHash,
  });

  if (error) throw error;

  // 返回原始 key（仅显示一次）
  return rawKey;
}

export async function listApiKeys(): Promise<AIApiKey[]> {
  if (!isCloudEnabled || !supabase) {
    const stored = localStorage.getItem('seoc.local.ai_api_keys');
    return stored ? JSON.parse(stored) : [];
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];

  const { data, error } = await supabase
    .from('ai_api_keys')
    .select('id, name, key_hash, last_used_at, created_at')
    .eq('user_id', userData.user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as AIApiKey[];
}

export async function revokeApiKey(id: string): Promise<void> {
  if (!isCloudEnabled || !supabase) {
    const keys = JSON.parse(localStorage.getItem('seoc.local.ai_api_keys') || '[]');
    const filtered = keys.filter((k: AIApiKey) => k.id !== id);
    localStorage.setItem('seoc.local.ai_api_keys', JSON.stringify(filtered));
    return;
  }

  const { error } = await supabase.from('ai_api_keys').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================
// 充值订单（人工确认制，与 purchases 流程一致）
// ============================================================

export interface AITopupOrder {
  id: string;
  yuan: number;
  points: number;
  status: 'pending' | 'confirmed' | 'rejected';
  note: string | null;
  admin_note?: string | null;
  created_at: string;
  confirmed_at: string | null;
  expires_at?: string | null;
}

/**
 * 创建充值订单（服务端价格表 RPC，防客户端伪造金额）。
 * planKey：'t10' | 't50' | 't100'（10/50/100 元档）
 */
export async function createTopupOrder(planKey: string): Promise<{ order: AITopupOrder | null; ok: boolean }> {
  if (!isCloudEnabled || !supabase) {
    const planMap: Record<string, number> = { t10: 10000, t50: 60000, t100: 150000 };
    const points = planMap[planKey] || 10000;
    const balanceKey = 'seoc.local.ai_balance';
    const stored = localStorage.getItem(balanceKey);
    const credits: AIBalance = stored ? JSON.parse(stored) : { balance: 10000, free_remaining: 5, free_daily_quota: 5 };
    credits.balance += points;
    localStorage.setItem(balanceKey, JSON.stringify(credits));

    const txs = JSON.parse(localStorage.getItem('seoc.local.ai_transactions') || '[]');
    txs.unshift({
      id: `local-tx-${Date.now()}`,
      amount: points,
      type: 'purchase',
      note: `充值（演示直接到账）`,
      created_at: new Date().toISOString(),
    });
    localStorage.setItem('seoc.local.ai_transactions', JSON.stringify(txs));

    return { order: null, ok: true };
  }

  const { data, error } = await supabase.rpc('create_ai_topup_order', { p_plan: planKey });
  if (error) throw error;
  return { order: data as AITopupOrder, ok: true };
}

/**
 * 查询本人充值订单
 */
export async function listMyTopupOrders(limit = 20): Promise<AITopupOrder[]> {
  if (!isCloudEnabled || !supabase) return [];

  await cancelExpiredOrders();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];

  const { data, error } = await supabase
    .from('ai_topup_orders')
    .select('*')
    .eq('user_id', userData.user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as AITopupOrder[];
}

/**
 * 管理员查询全部充值订单（按状态筛选，带用户邮箱）
 */
export async function listAllTopupOrders(
  status?: 'pending' | 'confirmed' | 'rejected'
): Promise<(AITopupOrder & { email?: string })[]> {
  if (!isCloudEnabled || !supabase) return [];

  await cancelExpiredOrders();

  let query = supabase.from('ai_topup_orders').select('*, profiles(email)');
  if (status) query = query.eq('status', status);
  const { data, error } = await query.order('created_at', { ascending: false }).limit(100);

  if (error) throw error;
  return (data || []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    yuan: Number(r.yuan),
    points: Number(r.points),
    status: r.status as AITopupOrder['status'],
    note: (r.note as string | null) || null,
    admin_note: (r.admin_note as string | null) || null,
    created_at: r.created_at as string,
    confirmed_at: (r.confirmed_at as string | null) || null,
    expires_at: (r.expires_at as string | null) || null,
    email: ((r.profiles as { email?: string } | null)?.email) || '',
  }));
}

/**
 * 管理员确认或驳回充值订单。确认时数据库触发器自动加余额并记交易。
 */
export async function confirmTopupOrder(id: string, ok: boolean): Promise<void> {
  if (!isCloudEnabled || !supabase) return;
  const { error } = await supabase
    .from('ai_topup_orders')
    .update({ status: ok ? 'confirmed' : 'rejected' })
    .eq('id', id);
  if (error) throw error;
}

// ============================================================
// 使用统计
// ============================================================

export async function getUsageSummary(): Promise<{
  total_calls: number;
  total_cost: number;
  recent_models: string[];
}> {
  if (!isCloudEnabled || !supabase) {
    return { total_calls: 0, total_cost: 0, recent_models: [] };
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { total_calls: 0, total_cost: 0, recent_models: [] };

  const { data, error } = await supabase
    .from('ai_usage_logs')
    .select('model_id, cost')
    .eq('user_id', userData.user.id);

  if (error || !data) return { total_calls: 0, total_cost: 0, recent_models: [] };

  const totalCost = data.reduce((sum, log) => sum + Number(log.cost), 0);
  const modelSet = new Set(data.map((log) => log.model_id));

  return {
    total_calls: data.length,
    total_cost: Math.round(totalCost * 10000) / 10000,
    recent_models: Array.from(modelSet).slice(0, 5),
  };
}

// ============================================================
// 会员系统（Lite / Plus / Pro / Max）
// ============================================================

export type MembershipTier = 'free' | 'lite' | 'plus' | 'pro' | 'max';

export const TIER_ORDER: Record<MembershipTier, number> = {
  free: 0,
  lite: 1,
  plus: 2,
  pro: 3,
  max: 4,
};

export const TIER_INFO: Record<MembershipTier, { name: string; priceMonthly: number; priceYearly: number; grantedPoints: number; color: string; perks: string[] }> = {
  free: {
    name: '免费用户',
    priceMonthly: 0,
    priceYearly: 0,
    grantedPoints: 0,
    color: 'slate',
    perks: ['无法使用 AI 研智助手'],
  },
  lite: {
    name: 'Lite 会员',
    priceMonthly: 19,
    priceYearly: 128,
    grantedPoints: 5000,
    color: 'blue',
    perks: ['解锁 7 个基础 AI 模型', '每月赠送 5000 研点', '每日免费额度', '基础 API 调用'],
  },
  plus: {
    name: 'Plus 会员',
    priceMonthly: 39,
    priceYearly: 268,
    grantedPoints: 15000,
    color: 'purple',
    perks: ['解锁全部 10 个 AI 模型', '每月赠送 15000 研点', '更高每日免费额度', '优先 API 调用'],
  },
  pro: {
    name: 'Pro 会员',
    priceMonthly: 79,
    priceYearly: 588,
    grantedPoints: 40000,
    color: 'amber',
    perks: ['解锁全部 12 个模型含 R1 推理', '每月赠送 40000 研点', '最高优先级', 'API 高并发'],
  },
  max: {
    name: 'Max 会员',
    priceMonthly: 128,
    priceYearly: 998,
    grantedPoints: 80000,
    color: 'rose',
    perks: ['全部模型无限制', '每月赠送 80000 研点', '最高优先级', '专属客服通道'],
  },
};

/**
 * 检查用户会员等级是否满足模型要求
 */
export function canUseModel(userTier: MembershipTier, model: AIModel): boolean {
  return TIER_ORDER[userTier] >= TIER_ORDER[model.min_tier];
}

/**
 * 判断会员是否有效（未过期）
 */
export function isMembershipActive(tier: MembershipTier, expiresAt?: string | null): boolean {
  if (tier === 'free') return false;
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() > Date.now();
}

export interface AIMembershipOrder {
  id: string;
  tier: MembershipTier;
  period: 'monthly' | 'yearly';
  yuan: number;
  granted_points: number;
  status: 'pending' | 'confirmed' | 'rejected';
  note: string | null;
  admin_note?: string | null;
  created_at: string;
  confirmed_at: string | null;
  expires_at?: string | null;
}

/**
 * 创建会员订单（服务端价格表 RPC，防客户端伪造金额）
 */
export async function createMembershipOrder(
  tier: Exclude<MembershipTier, 'free'>,
  period: 'monthly' | 'yearly'
): Promise<{ order: AIMembershipOrder | null; ok: boolean }> {
  if (!isCloudEnabled || !supabase) {
    return { order: null, ok: true };
  }

  const { data, error } = await supabase.rpc('create_ai_membership_order', {
    p_tier: tier,
    p_period: period,
  });

  if (error) throw error;
  return { order: data as AIMembershipOrder, ok: true };
}

/**
 * 查询本人会员订单
 */
export async function listMyMembershipOrders(limit = 20): Promise<AIMembershipOrder[]> {
  if (!isCloudEnabled || !supabase) return [];

  await cancelExpiredOrders();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];

  const { data, error } = await supabase
    .from('ai_membership_orders')
    .select('*')
    .eq('user_id', userData.user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as AIMembershipOrder[];
}

/**
 * 管理员查询全部会员订单
 */
export async function listAllMembershipOrders(
  status?: 'pending' | 'confirmed' | 'rejected'
): Promise<(AIMembershipOrder & { email?: string })[]> {
  if (!isCloudEnabled || !supabase) return [];

  await cancelExpiredOrders();

  let query = supabase.from('ai_membership_orders').select('*, profiles(email)');
  if (status) query = query.eq('status', status);
  const { data, error } = await query.order('created_at', { ascending: false }).limit(100);

  if (error) throw error;
  return (data || []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    tier: r.tier as MembershipTier,
    period: r.period as 'monthly' | 'yearly',
    yuan: Number(r.yuan),
    granted_points: Number(r.granted_points),
    status: r.status as AIMembershipOrder['status'],
    note: (r.note as string | null) || null,
    admin_note: (r.admin_note as string | null) || null,
    created_at: r.created_at as string,
    confirmed_at: (r.confirmed_at as string | null) || null,
    expires_at: (r.expires_at as string | null) || null,
    email: ((r.profiles as { email?: string } | null)?.email) || '',
  }));
}

/**
 * 管理员确认或驳回会员订单。确认时触发器自动升级 tier + 发放研点。
 */
export async function confirmMembershipOrder(id: string, ok: boolean): Promise<void> {
  if (!isCloudEnabled || !supabase) return;
  const { error } = await supabase
    .from('ai_membership_orders')
    .update({ status: ok ? 'confirmed' : 'rejected' })
    .eq('id', id);
  if (error) throw error;
}

/**
 * 用户主动取消订单（仅 pending 状态可取消，服务端 RPC 校验归属）
 */
export async function cancelTopupOrder(id: string): Promise<void> {
  if (!isCloudEnabled || !supabase) return;
  const { error } = await supabase.rpc('cancel_ai_topup_order', { p_order: id });
  if (error) throw error;
}

export async function cancelMembershipOrder(id: string): Promise<void> {
  if (!isCloudEnabled || !supabase) return;
  const { error } = await supabase.rpc('cancel_ai_membership_order', { p_order: id });
  if (error) throw error;
}

/**
 * 调用数据库自动取消过期订单（前端加载订单列表时调用）
 */
export async function cancelExpiredOrders(): Promise<void> {
  if (!isCloudEnabled || !supabase) return;
  await supabase.rpc('cancel_expired_orders');
}

// ============================================================
// 聊天历史会话（ai_conversations / ai_messages）
// ============================================================

export interface AIConversation {
  id: string;
  model_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface AIConversationMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  cost: number;
  is_free: boolean;
  interrupted: boolean;
  created_at: string;
}

/**
 * 查询本人的会话列表（最近更新优先）
 */
export async function listConversations(limit = 30): Promise<AIConversation[]> {
  if (!isCloudEnabled || !supabase) {
    const stored = localStorage.getItem('seoc.local.ai_conversations');
    return stored ? JSON.parse(stored) : [];
  }

  const { data, error } = await supabase
    .from('ai_conversations')
    .select('id, model_id, title, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as AIConversation[];
}

/**
 * 查询会话消息
 */
export async function listConversationMessages(conversationId: string): Promise<AIConversationMessage[]> {
  if (!isCloudEnabled || !supabase) {
    const stored = localStorage.getItem(`seoc.local.ai_messages_${conversationId}`);
    return stored ? JSON.parse(stored) : [];
  }

  const { data, error } = await supabase
    .from('ai_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as AIConversationMessage[];
}

/**
 * 新建或更新会话（服务端 RPC 校验归属）。返回会话 ID。
 */
export async function saveConversation(
  conversationId: string | null,
  modelId: string,
  title: string
): Promise<string> {
  if (!isCloudEnabled || !supabase) {
    const list = JSON.parse(localStorage.getItem('seoc.local.ai_conversations') || '[]') as AIConversation[];
    const now = new Date().toISOString();
    if (conversationId) {
      const idx = list.findIndex((c) => c.id === conversationId);
      if (idx >= 0) {
        list[idx] = { ...list[idx], model_id: modelId, updated_at: now, title: list[idx].title === '新对话' ? title : list[idx].title };
        localStorage.setItem('seoc.local.ai_conversations', JSON.stringify(list));
        return conversationId;
      }
    }
    const id = `local-conv-${Date.now()}`;
    list.unshift({ id, model_id: modelId, title: title || '新对话', created_at: now, updated_at: now });
    localStorage.setItem('seoc.local.ai_conversations', JSON.stringify(list));
    return id;
  }

  const { data, error } = await supabase.rpc('save_ai_conversation', {
    p_conversation: conversationId,
    p_model: modelId,
    p_title: title,
  });
  if (error) throw error;
  return data as string;
}

/**
 * 保存一条消息（服务端 RPC 校验归属）
 */
export async function saveConversationMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string,
  cost = 0,
  isFree = false,
  interrupted = false
): Promise<void> {
  if (!isCloudEnabled || !supabase) {
    const key = `seoc.local.ai_messages_${conversationId}`;
    const list = JSON.parse(localStorage.getItem(key) || '[]') as AIConversationMessage[];
    list.push({
      id: `local-msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      conversation_id: conversationId,
      role,
      content,
      cost,
      is_free: isFree,
      interrupted,
      created_at: new Date().toISOString(),
    });
    localStorage.setItem(key, JSON.stringify(list));
    return;
  }

  const { error } = await supabase.rpc('save_ai_message', {
    p_conversation: conversationId,
    p_role: role,
    p_content: content,
    p_cost: cost,
    p_is_free: isFree,
    p_interrupted: interrupted,
  });
  if (error) throw error;
}

// ============================================================
// 全站统计（仅管理员可用的 RPC）
// ============================================================

export async function getPlatformStats(): Promise<{
  total_calls: number;
  total_cost: number;
  active_users: number;
  today_calls: number;
  pending_topup: number;
  pending_membership: number;
} | null> {
  if (!isCloudEnabled || !supabase) {
    return {
      total_calls: 0,
      total_cost: 0,
      active_users: 0,
      today_calls: 0,
      pending_topup: 0,
      pending_membership: 0,
    };
  }

  const { data, error } = await supabase.rpc('get_ai_platform_stats');
  if (error) return null;
  return data as {
    total_calls: number;
    total_cost: number;
    active_users: number;
    today_calls: number;
    pending_topup: number;
    pending_membership: number;
  };
}
