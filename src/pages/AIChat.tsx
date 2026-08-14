import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useI18n } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { Reveal, BackButton } from '../components/fx';
import { ConsentGate } from '../components/ConsentGate';
import {
  sendMessage,
  getModels,
  getBalance,
  canUseModel,
  isMembershipActive,
  listConversations,
  listConversationMessages,
  saveConversation,
  saveConversationMessage,
  TIER_ORDER,
  TIER_INFO,
  type AIModel,
  type AIBalance,
  type ChatMessage,
  type MembershipTier,
  type AIConversation,
} from '../lib/ai';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  interrupted?: boolean;
  interruptReason?: string;
  cost?: number;
  isFree?: boolean;
}

export default function AIChat() {
  const { t, lang } = useI18n();
  const { profile } = useAuth();
  const [models, setModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [balance, setBalance] = useState<AIBalance>({ balance: 0, free_remaining: 0 });
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [interruptNotice, setInterruptNotice] = useState<{
    reason: string;
    tokensUsed: number;
    cost: number;
    balance: number;
    freeRemaining: number;
  } | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // 会话历史
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [stickToBottom, setStickToBottom] = useState(true);

  // 会员等级信息
  const userTier: MembershipTier = (profile?.membership_tier as MembershipTier) || 'free';
  const membershipActive = isMembershipActive(userTier, profile?.membership_expires_at);
  const effectiveTier: MembershipTier = membershipActive ? userTier : 'free';
  const canUseAI = effectiveTier !== 'free';
  // 等级中文名（用于显示）
  const tierNameMap: Record<MembershipTier, string> = {
    free: '免费',
    lite: 'Lite',
    plus: 'Plus',
    pro: 'Pro',
    max: 'Max',
  };
  // 等级徽章配色
  const tierBadgeMap: Record<MembershipTier, string> = {
    free: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    lite: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    plus: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    pro: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    max: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  };

  // 初始加载
  useEffect(() => {
    (async () => {
      const [m, b] = await Promise.all([getModels(), getBalance()]);
      setModels(m);
      setBalance(b);
      if (m.length > 0) setSelectedModel(m[0].id);
      // 加载会话列表，默认打开最近一次会话
      try {
        const convs = await listConversations();
        setConversations(convs);
        if (convs.length > 0) {
          setCurrentConversationId(convs[0].id);
          const msgs = await listConversationMessages(convs[0].id);
          setMessages(
            msgs.map((mm) => ({
              role: mm.role,
              content: mm.content,
              interrupted: mm.interrupted,
              cost: mm.cost,
              isFree: mm.is_free,
            }))
          );
        }
      } catch {
        /* 会话加载失败不影响聊天 */
      }
      setHistoryLoaded(true);
    })();
  }, []);

  // 余额轻量轮询：每 30 秒 + 窗口重新聚焦时刷新一次（单行查询，开销极小）
  // 解决管理端确认充值后右上角余额显示延迟的问题
  useEffect(() => {
    let alive = true;
    const refreshBalance = () => {
      getBalance()
        .then((b) => {
          if (alive) setBalance(b);
        })
        .catch(() => {});
    };
    const timer = setInterval(refreshBalance, 30000);
    window.addEventListener('focus', refreshBalance);
    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener('focus', refreshBalance);
    };
  }, []);

  // 会员等级或模型变化时，自动切换到第一个可用的模型
  useEffect(() => {
    if (!models.length) return;
    const current = models.find((x) => x.id === selectedModel);
    if (current && canUseModel(effectiveTier, current)) return;
    const firstAvailable = models.find((x) => canUseModel(effectiveTier, x));
    if (firstAvailable) setSelectedModel(firstAvailable.id);
  }, [models, effectiveTier, selectedModel]);

  // 自动滚动：只滚动消息容器（不再用 scrollIntoView，避免带动整个页面闪跳）。
  // 用户向上翻看时停止跟随，滑回底部后恢复。
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    setStickToBottom(nearBottom);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !stickToBottom) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, stickToBottom]);

  // 点击外部关闭模型下拉
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setModelDropdownOpen(false);
      }
    };
    if (modelDropdownOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [modelDropdownOpen]);

  const currentModel = models.find((m) => m.id === selectedModel);

  const getModelName = useCallback(
    (model: AIModel) => {
      return (model.display_name[lang] || model.display_name['zh-CN'] || model.id);
    },
    [lang]
  );

  // 厂商中文名与配色
  const providerInfo: Record<string, { name: string; badge: string }> = {
    bytedance: { name: '豆包', badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
    alibaba: { name: '通义千问', badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
    zhipu: { name: '智谱', badge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300' },
    deepseek: { name: 'DeepSeek', badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' },
    anthropic: { name: 'Anthropic', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  };

  const newChat = () => {
    if (streaming) return;
    setMessages([]);
    setCurrentConversationId(null);
    setSidebarOpen(false);
    setInterruptNotice(null);
    setStickToBottom(true);
    inputRef.current?.focus();
  };

  const switchConversation = async (id: string) => {
    if (streaming || id === currentConversationId) {
      if (id !== currentConversationId) setSidebarOpen(false);
      return;
    }
    try {
      const msgs = await listConversationMessages(id);
      setMessages(
        msgs.map((mm) => ({
          role: mm.role,
          content: mm.content,
          interrupted: mm.interrupted,
          cost: mm.cost,
          isFree: mm.is_free,
        }))
      );
      const conv = conversations.find((c) => c.id === id);
      if (conv?.model_id && models.some((m) => m.id === conv.model_id)) {
        setSelectedModel(conv.model_id);
      }
      setCurrentConversationId(id);
      setInterruptNotice(null);
      setStickToBottom(true);
    } catch {
      /* 忽略 */
    }
    setSidebarOpen(false);
  };

  const stopGeneration = () => {
    abortRef.current?.abort();
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || streaming || !selectedModel) return;

    // 门槛检查：未达 Lite 会员不能使用
    if (!canUseAI) return;

    // 模型等级检查
    const model = models.find((x) => x.id === selectedModel);
    if (model && !canUseModel(effectiveTier, model)) return;

    setInput('');
    setStreaming(true);
    setEstimatedCost(0);
    setInterruptNotice(null);
    setStickToBottom(true);

    const userMsg: Message = { role: 'user', content: text };
    const assistantMsg: Message = { role: 'assistant', content: '' };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);

    // 确保会话存在（首条消息建会话，标题取首条内容前 30 字）
    let convId = currentConversationId;
    try {
      convId = await saveConversation(currentConversationId, selectedModel, text.slice(0, 30));
      setCurrentConversationId(convId);
      const convs = await listConversations();
      setConversations(convs);
    } catch {
      /* 会话保存失败不阻断聊天 */
    }
    if (convId) {
      saveConversationMessage(convId, 'user', text).catch(() => {});
    }

    // 构建历史消息（最近 20 条）
    const history: ChatMessage[] = [
      { role: 'system', content: `你是 SEOC Studio 研智助手，一个专业的编程学习助手。请用清晰、准确的语言回答用户的编程相关问题。` },
      ...messages.slice(-20).map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: text },
    ];

    let accumulated = '';
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await sendMessage(selectedModel, history, {
        onChunk: (delta) => {
          accumulated += delta;
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { ...updated[updated.length - 1], content: accumulated };
            return updated;
          });
        },
        onProgress: (cost) => {
          setEstimatedCost(cost);
        },
        onInterrupt: (reason, tokensUsed, cost) => {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              interrupted: true,
              interruptReason: reason,
              cost,
            };
            return updated;
          });
          setInterruptNotice({
            reason,
            tokensUsed,
            cost,
            balance: 0,
            freeRemaining: 0,
          });
          if (convId) {
            saveConversationMessage(convId, 'assistant', accumulated, cost, false, true).catch(() => {});
          }
        },
        onDone: (usage, cost, isFree, newBalance, freeRemaining) => {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              cost,
              isFree,
            };
            return updated;
          });
          setBalance({ balance: newBalance, free_remaining: freeRemaining });
          if (convId) {
            saveConversationMessage(convId, 'assistant', accumulated, cost, isFree, false).catch(() => {});
          }
        },
        onError: (error) => {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              content: accumulated || `**错误**: ${error}`,
            };
            return updated;
          });
          if (convId) {
            saveConversationMessage(convId, 'assistant', accumulated || `**错误**: ${error}`, 0, false, true).catch(() => {});
          }
        },
        onAbort: () => {
          // 用户主动停止：保留已生成内容并标记中断
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              content: accumulated,
              interrupted: true,
              interruptReason: t('ai.chat.stopped'),
            };
            return updated;
          });
          setInterruptNotice({
            reason: t('ai.chat.stopped'),
            tokensUsed: 0,
            cost: 0,
            balance: balance.balance,
            freeRemaining: balance.free_remaining,
          });
          if (convId) {
            saveConversationMessage(convId, 'assistant', accumulated, 0, false, true).catch(() => {});
          }
        },
      }, controller.signal);
    } finally {
      setStreaming(false);
      setEstimatedCost(0);
      abortRef.current = null;
      // 刷新余额与历史
      const b = await getBalance();
      setBalance(b);
      try {
        const convs = await listConversations();
        setConversations(convs);
      } catch {
        /* 忽略 */
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 门槛拦截：未达 Lite 会员，显示购买引导
  if (profile?.is_banned) {
    return (
      <div className="container-x py-12">
        <Reveal>
          <div className="mx-auto max-w-2xl">
            <div className="card overflow-hidden">
              <div className="panel-strip" />
              <div className="p-8 text-center">
                <span className="mb-4 inline-block text-6xl font-bold opacity-30">🚫</span>
                <h1 className="text-2xl font-bold text-brand-950">账户已被封禁</h1>
                <p className="mt-3 text-sm text-slate-500">
                  您的账户已被管理员封禁，研智助手与 API 暂不可用。如有疑问请联系 jiangtengqiao@qq.com。
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    );
  }

  // 门槛拦截：未达 Lite 会员，显示购买引导
  if (!canUseAI) {
    return (
      <ConsentGate title="使用 AI 前请确认协议">
      <div className="container-x py-12">
        <Reveal>
          <div className="mx-auto max-w-2xl">
            <div className="card overflow-hidden">
              <div className="panel-strip" />
              <div className="p-8 text-center">
                <span className="mark-r mb-4 inline-block text-6xl font-bold opacity-30">R</span>
                <h1 className="text-2xl font-bold text-brand-950">研智助手需要会员资格</h1>
                <p className="mt-3 text-sm text-slate-500">
                  AI 研智助手是付费功能。至少需要 <span className="font-semibold text-blue-600">Lite 会员</span> 才能使用 AI 模型对话与 API。
                </p>

                {/* 当前会员状态 */}
                <div className="mt-6 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 dark:border-slate-700 dark:bg-slate-800">
                  <span className="text-xs text-slate-500 dark:text-slate-400">当前等级</span>
                  <span className={`badge px-2 py-0.5 text-xs font-medium ${tierBadgeMap[userTier]}`}>
                    {tierNameMap[userTier]}
                  </span>
                  {!membershipActive && userTier !== 'free' && (
                    <span className="text-xs text-amber-600">（已过期）</span>
                  )}
                </div>

                {/* 会员档位展示 */}
                <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {(['lite', 'plus', 'pro', 'max'] as const).map((tier) => {
                    const info = TIER_INFO[tier];
                    return (
                      <div key={tier} className="card relative p-5 text-left transition hover:border-brand-400 hover:shadow-lg">
                        <div className="mb-2 flex items-center justify-between">
                          <span className={`badge px-2 py-0.5 text-xs font-medium ${tierBadgeMap[tier]}`}>
                            {info.name}
                          </span>
                        </div>
                        <p className="text-2xl font-bold text-brand-700">¥{info.priceMonthly}<span className="text-xs font-normal text-slate-400">/月</span></p>
                        <p className="mt-1 text-xs text-slate-500">年付 ¥{info.priceYearly}（约 {Math.round(info.priceYearly / info.priceMonthly / 12 * 10) / 10} 折）</p>
                        <ul className="mt-3 space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                          {info.perks.map((perk, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <svg className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                              <span>{perk}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-8 flex justify-center gap-3">
                  <Link to="/ai/credits" className="btn-primary">
                    前往购买会员
                  </Link>
                  <Link to="/legal/ai-service-agreement" className="btn-ghost">
                    查看服务协议
                  </Link>
                </div>

                <p className="mt-4 text-xs text-slate-400">
                  购买会员后管理员核验到账即自动开通，无需额外操作。
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
      </ConsentGate>
    );
  }

  return (
    <ConsentGate title="使用 AI 前请确认协议">
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* 会话侧边栏（桌面常驻，移动端开关） */}
      <aside
        className={`${
          sidebarOpen ? 'absolute inset-y-0 left-0 z-40 flex w-72' : 'hidden'
        } shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 lg:relative lg:z-auto lg:flex lg:w-64`}
      >
        <div className="border-b border-slate-100 p-3 dark:border-slate-700">
          <button
            onClick={newChat}
            disabled={streaming}
            className="btn-primary w-full justify-center py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            + {t('ai.chat.newChat')}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto ai-chat-scroll p-2">
          <p className="px-2 pb-2 pt-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
            {t('ai.chat.history')}
          </p>
          {!historyLoaded ? (
            <p className="px-2 text-xs text-slate-400">加载中…</p>
          ) : conversations.length === 0 ? (
            <p className="px-2 text-xs text-slate-400">暂无历史会话</p>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => switchConversation(c.id)}
                disabled={streaming}
                className={`mb-1 block w-full truncate rounded-lg px-3 py-2 text-left text-sm transition disabled:opacity-60 ${
                  c.id === currentConversationId
                    ? 'bg-brand-50 font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                    : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/60'
                }`}
                title={c.title}
              >
                {c.title}
                <span className="mt-0.5 block text-[10px] font-normal text-slate-400">
                  {new Date(c.updated_at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </button>
            ))
          )}
        </div>
        {sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute right-2 top-2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 lg:hidden"
            aria-label="关闭"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        )}
      </aside>

      <div className="flex h-full min-w-0 flex-1 flex-col">
      {/* 顶部栏 */}
      <div className="border-b border-slate-200 bg-white">
        <div className="container-x flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <BackButton to="/" />
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-700 lg:hidden"
              aria-label={t('ai.chat.history')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
            </button>
            <span className="mark-r text-2xl font-bold">R</span>
            <div>
              <h1 className="text-lg font-bold text-brand-950">{t('ai.chat.title')}</h1>
              <p className="text-xs text-slate-500">{t('ai.chat.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* 模型选择 - 自定义下拉 */}
            <div className="relative" ref={modelDropdownRef}>
              <button
                type="button"
                onClick={() => !streaming && setModelDropdownOpen(!modelDropdownOpen)}
                disabled={streaming}
                className="ai-model-trigger flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm transition hover:border-brand-400 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800"
              >
                {currentModel && (
                  <>
                    <span className={`badge px-1.5 py-0.5 text-[10px] font-medium ${providerInfo[currentModel.provider]?.badge || 'bg-slate-100 text-slate-600'}`}>
                      {providerInfo[currentModel.provider]?.name || currentModel.provider}
                    </span>
                    <span className="font-medium text-slate-800 dark:text-slate-100">{getModelName(currentModel)}</span>
                  </>
                )}
                <svg className={`h-4 w-4 shrink-0 text-slate-400 transition ${modelDropdownOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>

              {/* 下拉面板 */}
              {modelDropdownOpen && (
                <div className="ai-model-dropdown absolute right-0 z-50 mt-2 w-[22rem] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
                  <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-700">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">选择 AI 模型</p>
                    <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">价格为研点/千token（1元=1000研点）</p>
                  </div>
                  <div className="max-h-96 overflow-y-auto ai-chat-scroll">
                    {models.map((m) => {
                      const locked = !canUseModel(effectiveTier, m);
                      const yuanInput = (m.input_price / 1000).toFixed(3);
                      const yuanOutput = (m.output_price / 1000).toFixed(3);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          disabled={locked}
                          onClick={() => {
                            setSelectedModel(m.id);
                            setModelDropdownOpen(false);
                          }}
                          className={`flex w-full items-start gap-3 px-3 py-3 text-left transition ${
                            locked
                              ? 'cursor-not-allowed opacity-50'
                              : 'hover:bg-brand-50 dark:hover:bg-slate-700'
                          } ${
                            m.id === selectedModel ? 'bg-brand-50 dark:bg-slate-700' : ''
                          }`}
                        >
                          <span className={`badge mt-0.5 shrink-0 px-1.5 py-0.5 text-[10px] font-medium ${providerInfo[m.provider]?.badge || 'bg-slate-100 text-slate-600'}`}>
                            {providerInfo[m.provider]?.name || m.provider}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                              {getModelName(m)}
                              {locked && (
                                <span className="ml-1.5 align-middle text-[10px] font-medium text-amber-600 dark:text-amber-400">
                                  需 {TIER_INFO[m.min_tier].name}
                                </span>
                              )}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                              <span title={`约 ¥${yuanInput}/百万输入token`}>
                                输入 <span className="font-mono font-medium text-slate-700 dark:text-slate-200">{m.input_price}</span>
                                {m.input_price === 0 ? ' 免费' : ' 研点'}
                              </span>
                              <span title={`约 ¥${yuanOutput}/百万输出token`}>
                                输出 <span className="font-mono font-medium text-slate-700 dark:text-slate-200">{m.output_price}</span>
                                {m.output_price === 0 ? ' 免费' : ' 研点'}
                              </span>
                              {m.free_daily_quota > 0 && (
                                <span className="text-emerald-600 dark:text-emerald-400">免费 {m.free_daily_quota}/天</span>
                              )}
                            </div>
                            <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                              ≈ ¥{yuanInput}/¥{yuanOutput} 每百万token · 需 {TIER_INFO[m.min_tier].name}
                            </p>
                          </div>
                          {locked ? (
                            <svg className="mt-1 h-4 w-4 shrink-0 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            m.id === selectedModel && (
                              <svg className="mt-1 h-4 w-4 shrink-0 text-brand-600" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            {/* 余额 */}
            <Link to="/ai/credits" className="badge bg-brand-50 text-brand-700 hover:bg-brand-100 transition dark:bg-brand-900/30 dark:text-brand-300">
              {t('ai.credits.name')} {balance.balance.toLocaleString()} | {t('ai.chat.freeRemaining')} {balance.free_remaining}
            </Link>
          </div>
        </div>
      </div>

      {/* 中断通知 */}
      {interruptNotice && (
        <div className="ai-interrupt-banner border-b border-amber-300 bg-amber-50 px-4 py-3">
          <div className="container-x flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-600 shrink-0">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span className="text-sm font-medium text-amber-800">
                {interruptNotice.reason}
              </span>
              <span className="text-xs text-amber-600">
                {t('ai.chat.tokenCost')}: {interruptNotice.cost.toFixed(4)} {t('ai.credits.name')}
              </span>
            </div>
            <Link to="/ai/credits" className="btn-outline text-sm">
              {t('ai.credits.topup')}
            </Link>
          </div>
        </div>
      )}

      {/* 消息列表 */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="ai-chat-scroll flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900"
      >
        <div className="mx-auto w-full max-w-3xl px-4 py-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <span className="mark-r mb-4 text-6xl font-bold opacity-30">R</span>
              <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200">{t('ai.chat.welcome')}</h2>
              <p className="mt-2 max-w-md text-sm text-slate-500">{t('ai.chat.welcomeDesc')}</p>
              {currentModel && (
                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <SuggestionCard text={t('ai.chat.suggest1')} onClick={() => setInput(t('ai.chat.suggest1'))} />
                  <SuggestionCard text={t('ai.chat.suggest2')} onClick={() => setInput(t('ai.chat.suggest2'))} />
                  <SuggestionCard text={t('ai.chat.suggest3')} onClick={() => setInput(t('ai.chat.suggest3'))} />
                </div>
              )}
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`mb-5 flex w-full items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {/* 头像（固定在行首） */}
              <div className="shrink-0">
                {msg.role === 'assistant' ? (
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-800 text-xs font-bold text-white">
                    R
                  </span>
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-100 text-xs font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                    {(profile?.nickname || profile?.email || 'U').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              {/* 名称 + 气泡：flex-1 min-w-0 保证不超出容器，w-fit 保证短消息气泡贴字 */}
              <div className={`flex min-w-0 flex-1 flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <span className="mb-1 text-xs text-slate-400">
                  {msg.role === 'assistant' ? t('ai.chat.title') : profile?.nickname || profile?.email}
                </span>
                <div
                  className={`w-fit max-w-full rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed shadow-sm ${
                    msg.role === 'user'
                      ? 'ai-bubble-user rounded-br-md'
                      : 'ai-bubble-assistant rounded-bl-md'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div className={`prose-seoc ai-chat-md ${streaming && i === messages.length - 1 ? 'ai-chat-streaming' : ''}`}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  )}
                </div>
                {/* 底部信息 */}
                {msg.role === 'assistant' && msg.content && !streaming && (
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-400">
                    {msg.isFree && <span className="badge bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">{t('ai.chat.freeUsed')}</span>}
                    {msg.cost != null && msg.cost > 0 && (
                      <span>{t('ai.chat.tokenCost')}: {msg.cost.toFixed(4)} {t('ai.credits.name')}</span>
                    )}
                    {msg.interrupted && (
                      <span className="text-amber-500">{msg.interruptReason || t('ai.chat.stopped')}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* 实时消耗条 */}
          {streaming && estimatedCost > 0 && (
            <div className="mx-auto max-w-2xl">
              <div className="ai-token-bar">
                <div className="ai-token-bar-fill" style={{ width: `${Math.min(100, estimatedCost * 100)}%` }} />
              </div>
              <p className="mt-1 text-center text-xs text-slate-400">
                {t('ai.chat.tokenCost')}: {estimatedCost.toFixed(4)} {t('ai.credits.name')}
              </p>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* 输入区 */}
      <div className="border-t border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-3xl px-4 py-4">
          <div className="flex gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('ai.chat.placeholder')}
              rows={1}
              maxLength={20000}
              className="input min-h-[44px] max-h-[120px] resize-none"
              disabled={streaming}
            />
            {streaming ? (
              <button
                onClick={stopGeneration}
                className="btn-outline shrink-0 self-end border-red-200 text-red-600 hover:bg-red-50"
                title={t('ai.chat.stop')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
                <span className="hidden sm:inline">{t('ai.chat.stop')}</span>
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={streaming || !input.trim()}
                className="btn-primary shrink-0 self-end"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
                <span className="hidden sm:inline">{t('ai.chat.send')}</span>
              </button>
            )}
          </div>
          <p className="mt-2 text-center text-xs text-slate-400">
            {t('ai.chat.footerNote')}
            {currentModel && (
              <span className="ml-2 text-slate-500 dark:text-slate-400">
                {getModelName(currentModel)} · 输入 {currentModel.input_price} 研点/千token · 输出 {currentModel.output_price} 研点/千token
                <span className="ml-1 text-slate-400 dark:text-slate-500">
                  （≈¥{(currentModel.input_price/1000).toFixed(3)}/¥{(currentModel.output_price/1000).toFixed(3)} 每百万token）
                </span>
                {currentModel.free_daily_quota > 0 && ` · 每日免费 ${currentModel.free_daily_quota} 次`}
              </span>
            )}
          </p>
        </div>
      </div>
      </div>
    </div>
    </ConsentGate>
  );
}

function SuggestionCard({ text, onClick }: { text: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="card cursor-pointer p-3 text-left text-sm text-slate-600 transition hover:border-brand-300 hover:shadow-md"
    >
      {text}
    </button>
  );
}
