import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { Reveal } from '../components/fx';
import {
  getBalance,
  getTransactions,
  getUsageLogs,
  createTopupOrder,
  listMyTopupOrders,
  type AIBalance,
  type AITransaction,
  type AIUsageLog,
  type AITopupOrder,
} from '../lib/ai';

const TOPUP_PLANS = [
  { yuan: 10, points: 10000, label: '10 元' },
  { yuan: 50, points: 60000, label: '50 元', bonus: '多送 20%' },
  { yuan: 100, points: 150000, label: '100 元', bonus: '多送 50%' },
];

export default function AICredits() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const [balance, setBalance] = useState<AIBalance>({ balance: 0, free_remaining: 0 });
  const [transactions, setTransactions] = useState<AITransaction[]>([]);
  const [usageLogs, setUsageLogs] = useState<AIUsageLog[]>([]);
  const [topupOrders, setTopupOrders] = useState<AITopupOrder[]>([]);
  const [activeTab, setActiveTab] = useState<'transactions' | 'usage'>('transactions');
  const [showTopup, setShowTopup] = useState(false);
  const [topupResult, setTopupResult] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [b, tx, logs, orders] = await Promise.all([
      getBalance(),
      getTransactions(100),
      getUsageLogs(50),
      listMyTopupOrders(),
    ]);
    setBalance(b);
    setTransactions(tx);
    setUsageLogs(logs);
    setTopupOrders(orders);
  };

  const handleTopup = async (plan: typeof TOPUP_PLANS[0]) => {
    setTopupResult(null);
    try {
      const { order } = await createTopupOrder(plan.yuan, plan.points);
      if (order) {
        setTopupResult(`订单已提交（${plan.label}，${plan.points.toLocaleString()} 研点）。请扫描下方收款码完成支付，管理员核验到账后研点自动入账。`);
      } else {
        setTopupResult(`演示模式：${plan.points.toLocaleString()} 研点已到账。`);
      }
      await loadData();
    } catch (e) {
      setTopupResult(`提交失败: ${e}`);
    }
  };

  const totalSpent = transactions
    .filter((tx) => tx.type === 'consumption')
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  return (
    <div className="container-x py-8">
      <Reveal>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-brand-950">{t('ai.credits.title')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('ai.credits.subtitle')}</p>
        </div>
      </Reveal>

      {/* 余额卡片 */}
      <Reveal>
        <div className="card mb-8 overflow-hidden">
          <div className="panel-strip" />
          <div className="grid gap-6 p-6 md:grid-cols-3">
            <div className="text-center">
              <p className="text-sm text-slate-500">{t('ai.credits.balance')}</p>
              <p className="mt-1 text-4xl font-bold text-brand-700">
                {balance.balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
              <p className="mt-1 text-xs text-slate-400">{t('ai.credits.name')}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-500">{t('ai.chat.freeRemaining')}</p>
              <p className="mt-1 text-4xl font-bold text-emerald-600">
                {balance.free_remaining}
              </p>
              <p className="mt-1 text-xs text-slate-400">{t('ai.credits.perDay')}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-500">{t('ai.credits.totalSpent')}</p>
              <p className="mt-1 text-4xl font-bold text-slate-700">
                {totalSpent.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
              <p className="mt-1 text-xs text-slate-400">{t('ai.credits.name')}</p>
            </div>
          </div>
          <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 text-center">
            <button onClick={() => setShowTopup(!showTopup)} className="btn-primary">
              {t('ai.credits.topup')}
            </button>
            <Link to="/ai" className="btn-ghost ml-3">
              {t('ai.chat.title')}
            </Link>
            <Link to="/ai/api" className="btn-outline ml-3">
              {t('ai.api.title')}
            </Link>
          </div>
        </div>
      </Reveal>

      {/* 充值面板 */}
      {showTopup && (
        <Reveal>
          <div className="card mb-8 p-6">
            <h3 className="mb-4 text-lg font-semibold text-slate-800">{t('ai.credits.selectPlan')}</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              {TOPUP_PLANS.map((plan) => (
                <div key={plan.yuan} className="card relative cursor-pointer p-5 text-center transition hover:border-brand-400 hover:shadow-lg"
                  onClick={() => handleTopup(plan)}
                >
                  {plan.bonus && (
                    <span className="badge absolute -top-2 right-3 bg-amber-500 text-white">
                      {plan.bonus}
                    </span>
                  )}
                  <p className="text-2xl font-bold text-brand-700">{plan.label}</p>
                  <p className="mt-2 text-sm text-slate-600">
                    {plan.points.toLocaleString()} {t('ai.credits.name')}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    约 {(plan.points / 1000 * 2).toLocaleString()} 次对话
                  </p>
                </div>
              ))}
            </div>
            {topupResult && (
              <div className={`mt-4 rounded-lg px-4 py-3 text-sm ${topupResult.includes('失败') ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}>
                {topupResult}
              </div>
            )}
            {/* 收款码 */}
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="mb-3 text-sm font-medium text-slate-700">扫码支付（支付宝 / 微信同款金额）</p>
              <div className="flex flex-wrap items-center gap-4">
                <img src="/pay/alipay.png" alt="支付宝收款码" className="h-32 w-32 rounded-lg border border-slate-200 bg-white object-contain" />
                <img src="/pay/wechatpay.png" alt="微信收款码" className="h-32 w-32 rounded-lg border border-slate-200 bg-white object-contain" />
                <div className="text-xs leading-6 text-slate-500">
                  <p>支付时请在备注中填写您的注册邮箱，便于核验。</p>
                  <p>支付完成后无需额外操作，管理员核验到账后研点自动入账。</p>
                  <p>如长时间未到账，请将付款凭证发送至 jiangtengqiao@qq.com。</p>
                </div>
              </div>
            </div>
            {/* 待确认订单 */}
            {topupOrders.filter((o) => o.status === 'pending').length > 0 && (
              <div className="mt-5">
                <h4 className="mb-2 text-sm font-semibold text-slate-700">待确认订单</h4>
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-slate-600">金额</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-600">研点</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-600">提交时间</th>
                        <th className="px-3 py-2 text-center font-medium text-slate-600">状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topupOrders.filter((o) => o.status === 'pending').map((o) => (
                        <tr key={o.id} className="border-t border-slate-100">
                          <td className="px-3 py-2 text-slate-700">{o.yuan} 元</td>
                          <td className="px-3 py-2 text-slate-700">{o.points.toLocaleString()}</td>
                          <td className="px-3 py-2 text-slate-500">{new Date(o.created_at).toLocaleString('zh-CN')}</td>
                          <td className="px-3 py-2 text-center">
                            <span className="badge bg-amber-50 text-amber-700">待确认</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <p className="mt-4 text-xs text-slate-400">
              {t('ai.credits.topupNote')}
            </p>
          </div>
        </Reveal>
      )}

      {/* 标签切换 */}
      <div className="mb-4 flex gap-1 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-4 py-2.5 text-sm font-medium transition ${
            activeTab === 'transactions'
              ? 'border-b-2 border-brand-600 text-brand-700'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {t('ai.credits.history')}
        </button>
        <button
          onClick={() => setActiveTab('usage')}
          className={`px-4 py-2.5 text-sm font-medium transition ${
            activeTab === 'usage'
              ? 'border-b-2 border-brand-600 text-brand-700'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {t('ai.credits.usageDetail')}
        </button>
      </div>

      {/* 交易流水 */}
      {activeTab === 'transactions' && (
        <Reveal>
          <div className="card overflow-hidden">
            {transactions.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">{t('ai.credits.noTransactions')}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">{t('ai.credits.time')}</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">{t('ai.credits.type')}</th>
                      <th className="px-4 py-3 text-right font-medium text-slate-600">{t('ai.credits.amount')}</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">{t('ai.credits.note')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-600">
                          {new Date(tx.created_at).toLocaleString('zh-CN')}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`badge ${
                            tx.type === 'purchase' ? 'bg-emerald-50 text-emerald-600' :
                            tx.type === 'consumption' ? 'bg-red-50 text-red-600' :
                            tx.type === 'free_grant' ? 'bg-blue-50 text-blue-600' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {tx.type === 'purchase' ? t('ai.credits.typePurchase') :
                             tx.type === 'consumption' ? t('ai.credits.typeConsumption') :
                             tx.type === 'free_grant' ? t('ai.credits.typeFreeGrant') :
                             tx.type === 'refund' ? t('ai.credits.typeRefund') :
                             t('ai.credits.typeAdjust')}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-right font-medium ${tx.amount > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                        </td>
                        <td className="px-4 py-3 text-slate-500">{tx.note || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Reveal>
      )}

      {/* 使用明细 */}
      {activeTab === 'usage' && (
        <Reveal>
          <div className="card overflow-hidden">
            {usageLogs.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">{t('ai.credits.noUsage')}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">{t('ai.credits.time')}</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">{t('ai.credits.model')}</th>
                      <th className="px-4 py-3 text-right font-medium text-slate-600">Input</th>
                      <th className="px-4 py-3 text-right font-medium text-slate-600">Output</th>
                      <th className="px-4 py-3 text-right font-medium text-slate-600">{t('ai.credits.cost')}</th>
                      <th className="px-4 py-3 text-center font-medium text-slate-600">{t('ai.credits.status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usageLogs.map((log) => (
                      <tr key={log.id} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-600">
                          {new Date(log.created_at).toLocaleString('zh-CN')}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{log.model_id}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{log.input_tokens.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{log.output_tokens.toLocaleString()}</td>
                        <td className={`px-4 py-3 text-right font-medium ${log.is_free ? 'text-emerald-600' : 'text-slate-700'}`}>
                          {log.is_free ? t('ai.chat.freeUsed') : log.cost.toFixed(4)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {log.interrupted ? (
                            <span className="badge bg-amber-50 text-amber-600">{t('ai.chat.interrupted')}</span>
                          ) : (
                            <span className="badge bg-emerald-50 text-emerald-600">{t('ai.credits.completed')}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Reveal>
      )}
    </div>
  );
}
