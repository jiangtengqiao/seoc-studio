import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useI18n } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { Reveal } from '../components/fx';
import {
  sendMessage,
  getModels,
  getBalance,
  type AIModel,
  type AIBalance,
  type ChatMessage,
} from '../lib/ai';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  interrupted?: boolean;
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
  const [interruptNotice, setInterruptNotice] = useState<{
    reason: string;
    tokensUsed: number;
    cost: number;
    balance: number;
    freeRemaining: number;
  } | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 初始加载
  useEffect(() => {
    (async () => {
      const [m, b] = await Promise.all([getModels(), getBalance()]);
      setModels(m);
      setBalance(b);
      if (m.length > 0) setSelectedModel(m[0].id);
    })();
  }, []);

  // 自动滚动到底部
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const currentModel = models.find((m) => m.id === selectedModel);

  const getModelName = useCallback(
    (model: AIModel) => {
      return (model.display_name[lang] || model.display_name['zh-CN'] || model.id);
    },
    [lang]
  );

  const handleSend = async () => {
    const text = input.trim();
    if (!text || streaming || !selectedModel) return;

    // 预检余额
    if (balance.balance <= 0 && balance.free_remaining <= 0) {
      const m = models.find((x) => x.id === selectedModel);
      if (m && m.input_price + m.output_price > 0) {
        setInterruptNotice({
          reason: t('ai.chat.noBalance'),
          tokensUsed: 0,
          cost: 0,
          balance: balance.balance,
          freeRemaining: balance.free_remaining,
        });
        return;
      }
    }

    setInput('');
    setStreaming(true);
    setEstimatedCost(0);
    setInterruptNotice(null);

    const userMsg: Message = { role: 'user', content: text };
    const assistantMsg: Message = { role: 'assistant', content: '' };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);

    // 构建历史消息（最近 20 条）
    const history: ChatMessage[] = [
      { role: 'system', content: `你是 SEOC Studio 研智助手，一个专业的编程学习助手。请用清晰、准确的语言回答用户的编程相关问题。` },
      ...messages.slice(-20).map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: text },
    ];

    let accumulated = '';

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
        },
      });
    } finally {
      setStreaming(false);
      setEstimatedCost(0);
      // 刷新余额
      const b = await getBalance();
      setBalance(b);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* 顶部栏 */}
      <div className="border-b border-slate-200 bg-white">
        <div className="container-x flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <span className="mark-r text-2xl font-bold">R</span>
            <div>
              <h1 className="text-lg font-bold text-brand-950">{t('ai.chat.title')}</h1>
              <p className="text-xs text-slate-500">{t('ai.chat.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* 模型选择 */}
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="input w-48 text-sm"
              disabled={streaming}
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {getModelName(m)} ({m.input_price}/{m.output_price})
                </option>
              ))}
            </select>
            {/* 余额 */}
            <Link to="/ai/credits" className="badge bg-brand-50 text-brand-700 hover:bg-brand-100 transition">
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
                {t('ai.chat.interrupted')} {interruptNotice.reason}
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
      <div className="flex-1 overflow-y-auto bg-slate-50">
        <div className="container-x py-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <span className="mark-r mb-4 text-6xl font-bold opacity-30">R</span>
              <h2 className="text-xl font-semibold text-slate-700">{t('ai.chat.welcome')}</h2>
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
            <div key={i} className={`mb-4 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-1' : 'order-0'}`}>
                {/* 头像 */}
                <div className={`mb-1 flex items-center gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  {msg.role === 'assistant' ? (
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-800 text-xs font-bold text-white">
                      R
                    </span>
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-100 text-xs font-medium text-brand-700">
                      {(profile?.nickname || profile?.email || 'U').charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="text-xs text-slate-400">
                    {msg.role === 'assistant' ? t('ai.chat.title') : profile?.nickname || profile?.email}
                  </span>
                </div>
                {/* 气泡 */}
                <div
                  className={`rounded-2xl px-4 py-3 text-sm ${
                    msg.role === 'user'
                      ? 'ai-bubble-user rounded-br-md'
                      : 'ai-bubble-assistant rounded-bl-md'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="prose-seoc !text-sm !leading-7">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content || (streaming && i === messages.length - 1 ? '' : '')}</ReactMarkdown>
                      {streaming && i === messages.length - 1 && <span className="ai-streaming-cursor" />}
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
                {/* 底部信息 */}
                {msg.role === 'assistant' && msg.content && !streaming && (
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                    {msg.isFree && <span className="badge bg-emerald-50 text-emerald-600">{t('ai.chat.freeUsed')}</span>}
                    {msg.cost != null && msg.cost > 0 && (
                      <span>{t('ai.chat.tokenCost')}: {msg.cost.toFixed(4)} {t('ai.credits.name')}</span>
                    )}
                    {msg.interrupted && (
                      <span className="text-amber-500">{t('ai.chat.interrupted')}</span>
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
        <div className="container-x py-4">
          <div className="flex gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('ai.chat.placeholder')}
              rows={1}
              className="input min-h-[44px] max-h-[120px] resize-none"
              disabled={streaming}
            />
            <button
              onClick={handleSend}
              disabled={streaming || !input.trim()}
              className="btn-primary shrink-0 self-end"
            >
              {streaming ? (
                <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
              <span className="hidden sm:inline">{t('ai.chat.send')}</span>
            </button>
          </div>
          <p className="mt-2 text-center text-xs text-slate-400">
            {t('ai.chat.footerNote')}
            {currentModel && (
              <span className="ml-2">
                {getModelName(currentModel)} | {currentModel.input_price}/{currentModel.output_price} {t('ai.credits.name')}/1K token
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
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
