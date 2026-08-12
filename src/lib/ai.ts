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
  callbacks: StreamCallbacks
): Promise<void> {
  if (!isCloudEnabled || !supabase) {
    // 本地 mock 模式
    await mockStreamChat(modelId, messages, callbacks);
    return;
  }

  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  if (!token) throw new Error('未登录');

  const { data: funcData, error: funcError } = await supabase.functions.invoke('ai-chat', {
    body: { model: modelId, messages },
  });

  if (funcError) {
    callbacks.onError?.(funcError.message);
    return;
  }

  // 处理 SSE 流
  // 注意：supabase.functions.invoke 不支持 SSE，需要直接用 fetch
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const response = await fetch(`${supabaseUrl}/functions/v1/ai-chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ model: modelId, messages }),
  });

  if (!response.ok) {
    const err = await response.json();
    callbacks.onError?.(err.error || '请求失败');
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
  created_at: string;
  confirmed_at: string | null;
}

/**
 * 创建充值订单。云端模式写入 pending 订单，等待管理员核验到账后确认自动加余额；
 * 本地演示模式直接加余额并记交易，便于离线体验。
 */
export async function createTopupOrder(
  yuan: number,
  points: number,
  note?: string
): Promise<{ order: AITopupOrder | null; ok: boolean }> {
  if (!isCloudEnabled || !supabase) {
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
      note: `充值 ${yuan} 元（演示直接到账）`,
      created_at: new Date().toISOString(),
    });
    localStorage.setItem('seoc.local.ai_transactions', JSON.stringify(txs));

    return { order: null, ok: true };
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('未登录');

  const { data, error } = await supabase
    .from('ai_topup_orders')
    .insert({ user_id: userData.user.id, yuan, points, note: note || null })
    .select()
    .single();

  if (error) throw error;
  return { order: data as AITopupOrder, ok: true };
}

/**
 * 查询本人充值订单
 */
export async function listMyTopupOrders(limit = 20): Promise<AITopupOrder[]> {
  if (!isCloudEnabled || !supabase) return [];

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
    created_at: r.created_at as string,
    confirmed_at: (r.confirmed_at as string | null) || null,
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
