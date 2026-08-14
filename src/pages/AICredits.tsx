import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { Reveal, BackButton } from '../components/fx';
import { ConsentGate } from '../components/ConsentGate';
import {
  getBalance,
  getTransactions,
  getUsageLogs,
  createTopupOrder,
  createCustomTopupOrder,
  listMyTopupOrders,
  createMembershipOrder,
  listMyMembershipOrders,
  cancelTopupOrder,
  cancelMembershipOrder,
  claimTopupOrderPaid,
  claimMembershipOrderPaid,
  isMembershipActive,
  TIER_INFO,
  type AIBalance,
  type AITransaction,
  type AIUsageLog,
  type AITopupOrder,
  type AIMembershipOrder,
  type MembershipTier,
} from '../lib/ai';

const PAYMENT_METHODS = {
  alipay: {
    label: '支付宝',
    qr: `${import.meta.env.BASE_URL}pay/alipay.png`
  },
  wechat: {
    label: '微信支付',
    qr: `${import.meta.env.BASE_URL}pay/wechatpay.png`
  }
} as const;
type PaymentMethod = keyof typeof PAYMENT_METHODS;

const TOPUP_PLANS = [
  { key: 't10', yuan: 10, points: 10000, label: '10 元' },
  { key: 't50', yuan: 50, points: 60000, label: '50 元', bonus: '多送 20%' },
  { key: 't100', yuan: 100, points: 150000, label: '100 元', bonus: '多送 50%' },
];

const TIER_LIST: Exclude<MembershipTier, 'free'>[] = ['lite', 'plus', 'pro', 'max'];

export default function AICredits() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const [balance, setBalance] = useState<AIBalance>({ balance: 0, free_remaining: 0 });
  const [transactions, setTransactions] = useState<AITransaction[]>([]);
  const [usageLogs, setUsageLogs] = useState<AIUsageLog[]>([]);
  const [topupOrders, setTopupOrders] = useState<AITopupOrder[]>([]);
  const [membershipOrders, setMembershipOrders] = useState<AIMembershipOrder[]>([]);
  const [activeTab, setActiveTab] = useState<'transactions' | 'usage'>('transactions');
  // 板块化：概览 / 充值 / 会员 / 流水，互不堆叠，减少长页滑动
  const [section, setSection] = useState<'overview' | 'topup' | 'membership' | 'history'>('overview');
  const [topupResult, setTopupResult] = useState<string | null>(null);
  const [membershipResult, setMembershipResult] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('alipay');
  const [customYuan, setCustomYuan] = useState('');
  const [payConsented, setPayConsented] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [b, tx, logs, orders, mOrders] = await Promise.all([
      getBalance(),
      getTransactions(100),
      getUsageLogs(50),
      listMyTopupOrders(),
      listMyMembershipOrders(),
    ]);
    setBalance(b);
    setTransactions(tx);
    setUsageLogs(logs);
    setTopupOrders(orders);
    setMembershipOrders(mOrders);
  };

  const handleCancelTopup = async (id: string) => {
    try {
      await cancelTopupOrder(id);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleClaimTopupPaid = async (id: string) => {
    try {
      await claimTopupOrderPaid(id);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCancelMembership = async (id: string) => {
    try {
      await cancelMembershipOrder(id);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleClaimMembershipPaid = async (id: string) => {
    try {
      await claimMembershipOrderPaid(id);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleTopup = async (plan: typeof TOPUP_PLANS[0]) => {
    setTopupResult(null);
    try {
      const { order } = await createTopupOrder(plan.key);
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

  const handleCustomTopup = async () => {
    const yuan = Number(customYuan);
    if (!Number.isInteger(yuan) || yuan < 1) {
      setTopupResult('自定义金额必须为不小于 1 的正整数（元）');
      return;
    }
    setTopupResult(null);
    try {
      const { order } = await createCustomTopupOrder(yuan);
      if (order) {
        setTopupResult(`订单已提交（自定义 ¥${yuan}，${(yuan * 1000).toLocaleString()} 研点）。请扫描下方收款码完成支付，管理员核验到账后研点自动入账。`);
      } else {
        setTopupResult(`演示模式：${(yuan * 1000).toLocaleString()} 研点已到账。`);
      }
      await loadData();
    } catch (e) {
      setTopupResult(`提交失败: ${e}`);
    }
  };

  const handleMembership = async (tier: Exclude<MembershipTier, 'free'>, period: 'monthly' | 'yearly') => {
    setMembershipResult(null);
    try {
      const { order } = await createMembershipOrder(tier, period);
      if (order) {
        setMembershipResult(`会员订单已提交（${TIER_INFO[tier].name} · ${period === 'monthly' ? '月付' : '年付'}，¥${order.yuan}）。请扫描下方收款码完成支付，管理员核验后会员自动开通并发放赠送研点。`);
      } else {
        setMembershipResult(`演示模式：已开通 ${TIER_INFO[tier].name}（${period === 'monthly' ? '月' : '年'}）并发放 ${TIER_INFO[tier].grantedPoints.toLocaleString()} 研点。`);
      }
      await loadData();
    } catch (e) {
      setMembershipResult(`提交失败: ${e}`);
    }
  };

  // 当前会员状态
  const userTier: MembershipTier = (profile?.membership_tier as MembershipTier) || 'free';
  const membershipActive = isMembershipActive(userTier, profile?.membership_expires_at);
  const effectiveTier: MembershipTier = membershipActive ? userTier : 'free';
  const tierBadgeMap: Record<MembershipTier, string> = {
    free: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    lite: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    plus: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    pro: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    max: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  };

  const totalSpent = transactions
    .filter((tx) => tx.type === 'consumption')
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  const pendingTopup = topupOrders.filter((o) => o.status === 'pending').length;
  const pendingMembership = membershipOrders.filter((o) => o.status === 'pending').length;

  return (
    <ConsentGate title="购买前请确认协议">
    <div className="container-x py-8">
      <Reveal>
        <div className="mb-8 flex items-center gap-3">
          <BackButton to="/ai" />
          <div>
            <h1 className="text-2xl font-bold text-brand-950">{t('ai.credits.title')}</h1>
            <p className="mt-1 text-sm text-slate-500">{t('ai.credits.subtitle')}</p>
          </div>
        </div>
      </Reveal>

      {/* 板块导航：四个分区互不堆叠，避免整页滑动 */}
      <div className="mb-6 flex flex-wrap gap-2">
        {([
          ['overview', '概览'],
          ['topup', `充值研点${pendingTopup > 0 ? `（${pendingTopup}）` : ''}`],
          ['membership', `开通会员${pendingMembership > 0 ? `（${pendingMembership}）` : ''}`],
          ['history', '流水与用量'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSection(key)}
            className={section === key ? 'btn-primary !py-1.5 !text-xs' : 'btn-outline !py-1.5 !text-xs'}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 会员 + 余额状态卡片（概览） */}
      {section === 'overview' && (
      <Reveal>
        <div className="card mb-8 overflow-hidden">
          <div className="panel-strip" />
          <div className="grid gap-6 p-6 md:grid-cols-4">
            <div className="text-center md:col-span-1">
              <p className="text-sm text-slate-500">会员等级</p>
              <div className="mt-2">
                <span className={`badge px-3 py-1 text-sm font-semibold ${tierBadgeMap[userTier]}`}>
                  {userTier === 'free' ? '免费' : TIER_INFO[userTier].name}
                </span>
              </div>
              {membershipActive && profile?.membership_expires_at ? (
                <p className="mt-1.5 text-xs text-slate-400">
                  有效期至 {new Date(profile.membership_expires_at).toLocaleDateString('zh-CN')}
                </p>
              ) : userTier !== 'free' ? (
                <p className="mt-1.5 text-xs text-amber-600">已过期，续费可恢复</p>
              ) : (
                <p className="mt-1.5 text-xs text-slate-400">未开通</p>
              )}
              {!membershipActive && effectiveTier === 'free' && (
                <p className="mt-1 text-[11px] text-slate-400">AI 研智助手需 Lite 及以上</p>
              )}
            </div>
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
          <div className="flex flex-wrap items-center justify-center gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
            <button onClick={() => setSection('membership')} className="btn-primary">
              开通 / 续费会员
            </button>
            <button onClick={() => setSection('topup')} className="btn-outline">
              {t('ai.credits.topup')}
            </button>
            <button onClick={() => setSection('history')} className="btn-outline">
              {t('ai.credits.history')}
            </button>
            <Link to="/ai" className="btn-ghost">
              {t('ai.chat.title')}
            </Link>
            <Link to="/ai/api" className="btn-outline">
              {t('ai.api.title')}
            </Link>
          </div>
        </div>
      </Reveal>
      )}

      {/* 会员购买面板 */}
      {section === 'membership' && (
        <Reveal>
          <div className="card mb-8 p-6">
            <h3 className="mb-1 text-lg font-semibold text-slate-800">开通会员（使用 AI 的门槛）</h3>
            <p className="mb-4 text-xs text-slate-400">
              会员是使用研智助手的门票，不同等级解锁不同模型档位；开通时赠送对应研点，可用研点再叠加充值。
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {TIER_LIST.map((tier) => {
                const info = TIER_INFO[tier];
                const isOwned = userTier === tier && membershipActive;
                return (
                  <div key={tier} className={`card relative p-5 transition hover:border-brand-400 hover:shadow-lg ${isOwned ? 'border-brand-400 ring-1 ring-brand-400' : ''}`}>
                    {isOwned && (
                      <span className="badge absolute -top-2 right-3 bg-brand-600 text-white">当前会员</span>
                    )}
                    <span className={`badge px-2 py-0.5 text-xs font-medium ${tierBadgeMap[tier]}`}>{info.name}</span>
                    <p className="mt-3 text-2xl font-bold text-brand-700">
                      ¥{info.priceMonthly}
                      <span className="text-xs font-normal text-slate-400">/月</span>
                    </p>
                    <p className="mt-1 text-xs text-slate-500">年付 ¥{info.priceYearly}（省 ¥{info.priceYearly ? (info.priceMonthly * 12 - info.priceYearly) : 0}）</p>
                    <ul className="mt-3 space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                      {info.perks.map((perk, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <svg className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                          <span>{perk}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => handleMembership(tier, 'monthly')}
                        className="btn-primary flex-1 py-1.5 text-xs"
                      >
                        月付
                      </button>
                      <button
                        onClick={() => handleMembership(tier, 'yearly')}
                        className="btn-outline flex-1 py-1.5 text-xs"
                      >
                        年付
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {membershipResult && (
              <div className={`mt-4 rounded-lg px-4 py-3 text-sm ${membershipResult.includes('失败') ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}>
                {membershipResult}
              </div>
            )}
            {/* 支付同意 */}
            <div className="mt-5 rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
              <label className="flex items-start gap-2 text-xs leading-5 text-amber-800 dark:text-amber-200">
                <input
                  type="checkbox"
                  checked={payConsented}
                  onChange={(e) => setPayConsented(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-amber-300 text-brand-600 focus:ring-brand-400"
                />
                <span>
                  我已阅读并同意
                  <Link to="/legal/purchase-agreement" className="text-brand-600 hover:underline" target="_blank">《数字内容购买协议》</Link>
                  、
                  <Link to="/legal/ai-credits-policy" className="text-brand-600 hover:underline" target="_blank">《研点购买与消费协议》</Link>
                  及
                  <Link to="/legal/refund-policy" className="text-brand-600 hover:underline" target="_blank">《退款政策》</Link>
                  ，知悉会员费用不退还。
                </span>
              </label>
            </div>
            {/* 会员收款码 */}
            {payConsented && (
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
              <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-200">扫码支付（选中一种方式，扫码清晰呈现）</p>
              <div className="flex flex-wrap items-start gap-4">
                {(Object.keys(PAYMENT_METHODS) as PaymentMethod[]).map((key) => {
                  const selected = payMethod === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPayMethod(key)}
                      className={`rounded-xl border-2 bg-white p-2 text-center transition dark:bg-slate-800 ${
                        selected ? 'border-brand-500 shadow-lg' : 'border-slate-200 hover:border-brand-300 dark:border-slate-600'
                      }`}
                    >
                      <span className="pay-qr-wrap block">
                        <img
                          src={PAYMENT_METHODS[key].qr}
                          alt={`${PAYMENT_METHODS[key].label}收款码`}
                          className={`block h-32 w-32 rounded-lg object-contain transition ${selected ? '' : 'scale-105 blur-[6px] grayscale-[40%]'}`}
                        />
                        {selected && <span className="pay-qr-scan" />}
                      </span>
                      <p className={`mt-1.5 text-xs font-medium ${selected ? 'text-brand-700 dark:text-brand-300' : 'text-slate-500'}`}>
                        {PAYMENT_METHODS[key].label}
                      </p>
                    </button>
                  );
                })}
                <div className="text-xs leading-6 text-slate-500 dark:text-slate-400">
                  <p>支付时请在备注中填写您的<strong className="text-brand-700">注册邮箱</strong>，便于核验。</p>
                  <p>支付完成后请点击订单上的「我已支付」，管理员将在 24 小时内核验并回复（同意或驳回，在订单列表中可见）。</p>
                  <p>如长时间未处理，请将付款凭证发送至 jiangtengqiao@qq.com。</p>
                  <p className="mt-1 text-amber-600 dark:text-amber-400">订单 24 小时内未确认将自动取消。</p>
                </div>
              </div>
            </div>
            )}
            {/* 待确认会员订单 */}
            {pendingMembership > 0 && (
              <div className="mt-5">
                <h4 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">待确认会员订单</h4>
                <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-300">套餐</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-300">金额</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-300">赠送研点</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-300">提交时间</th>
                        <th className="px-3 py-2 text-center font-medium text-slate-600 dark:text-slate-300">剩余时间</th>
                        <th className="px-3 py-2 text-center font-medium text-slate-600 dark:text-slate-300">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {membershipOrders.filter((o) => o.status === 'pending').map((o) => (
                        <tr key={o.id} className="border-t border-slate-100 dark:border-slate-700">
                          <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{TIER_INFO[o.tier].name}（{o.period === 'monthly' ? '月付' : '年付'}）</td>
                          <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{o.yuan} 元</td>
                          <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{o.granted_points.toLocaleString()}</td>
                          <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{new Date(o.created_at).toLocaleString('zh-CN')}</td>
                          <td className="px-3 py-2 text-center">
                            <Countdown expiresAt={o.expires_at} />
                          </td>
                          <td className="px-3 py-2 text-center">
                            {o.payment_claimed ? (
                              <span className="badge bg-emerald-50 text-emerald-600">已声称支付 · 等待核验</span>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleClaimMembershipPaid(o.id)}
                                  className="mr-1.5 rounded-md border border-brand-200 px-2 py-1 text-xs text-brand-700 transition hover:bg-brand-50 dark:border-brand-700 dark:text-brand-300 dark:hover:bg-brand-900/30"
                                >
                                  我已支付
                                </button>
                                <button
                                  onClick={() => handleCancelMembership(o.id)}
                                  className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 transition hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/30"
                                >
                                  取消
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <p className="mt-4 text-xs text-slate-400">
              会员费用不退还；会员到期后不再赠送研点，已购研点余额永久保留。
            </p>
          </div>
        </Reveal>
      )}

      {/* 充值面板 */}
      {section === 'topup' && (
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
            {/* 自定义金额充值（正整数） */}
            <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-4 dark:border-slate-600">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                自定义金额充值
                <span className="ml-1 text-xs font-normal text-slate-400">（正整数元 · 1 元 = 1000 研点 · 无赠送比例）</span>
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">¥</span>
                  <input
                    type="number"
                    min={1}
                    max={100000}
                    step={1}
                    value={customYuan}
                    onChange={(e) => setCustomYuan(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCustomTopup()}
                    placeholder="如 200"
                    className="input !w-36 text-center"
                  />
                </div>
                <p className="text-xs text-slate-400">
                  {customYuan && Number.isInteger(Number(customYuan)) && Number(customYuan) >= 1
                    ? `= ${(Number(customYuan) * 1000).toLocaleString()} 研点`
                    : '输入金额后自动换算研点'}
                </p>
                <button
                  onClick={handleCustomTopup}
                  disabled={!customYuan || !(Number.isInteger(Number(customYuan)) && Number(customYuan) >= 1)}
                  className="btn-primary shrink-0"
                >
                  提交订单
                </button>
              </div>
            </div>
            {topupResult && (
              <div className={`mt-4 rounded-lg px-4 py-3 text-sm ${topupResult.includes('失败') ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}>
                {topupResult}
              </div>
            )}
            {/* 支付同意 */}
            <div className="mt-5 rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
              <label className="flex items-start gap-2 text-xs leading-5 text-amber-800 dark:text-amber-200">
                <input
                  type="checkbox"
                  checked={payConsented}
                  onChange={(e) => setPayConsented(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-amber-300 text-brand-600 focus:ring-brand-400"
                />
                <span>
                  我已阅读并同意
                  <Link to="/legal/purchase-agreement" className="text-brand-600 hover:underline" target="_blank">《数字内容购买协议》</Link>
                  、
                  <Link to="/legal/ai-credits-policy" className="text-brand-600 hover:underline" target="_blank">《研点购买与消费协议》</Link>
                  及
                  <Link to="/legal/refund-policy" className="text-brand-600 hover:underline" target="_blank">《退款政策》</Link>
                </span>
              </label>
            </div>
            {/* 收款码 */}
            {payConsented && (
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
              <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-200">扫码支付（选中一种方式，扫码清晰呈现）</p>
              <div className="flex flex-wrap items-start gap-4">
                {(Object.keys(PAYMENT_METHODS) as PaymentMethod[]).map((key) => {
                  const selected = payMethod === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPayMethod(key)}
                      className={`rounded-xl border-2 bg-white p-2 text-center transition dark:bg-slate-800 ${
                        selected ? 'border-brand-500 shadow-lg' : 'border-slate-200 hover:border-brand-300 dark:border-slate-600'
                      }`}
                    >
                      <span className="pay-qr-wrap block">
                        <img
                          src={PAYMENT_METHODS[key].qr}
                          alt={`${PAYMENT_METHODS[key].label}收款码`}
                          className={`block h-32 w-32 rounded-lg object-contain transition ${selected ? '' : 'scale-105 blur-[6px] grayscale-[40%]'}`}
                        />
                        {selected && <span className="pay-qr-scan" />}
                      </span>
                      <p className={`mt-1.5 text-xs font-medium ${selected ? 'text-brand-700 dark:text-brand-300' : 'text-slate-500'}`}>
                        {PAYMENT_METHODS[key].label}
                      </p>
                    </button>
                  );
                })}
                <div className="text-xs leading-6 text-slate-500 dark:text-slate-400">
                  <p>支付时请在备注中填写您的<strong className="text-brand-700">注册邮箱</strong>，便于核验。</p>
                  <p>支付完成后请点击订单上的「我已支付」，管理员将在 24 小时内核验并回复。</p>
                  <p>如长时间未到账，请将付款凭证发送至 jiangtengqiao@qq.com。</p>
                  <p className="mt-1 text-amber-600 dark:text-amber-400">订单 24 小时内未确认将自动取消。</p>
                </div>
              </div>
            </div>
            )}
            {/* 待确认订单 */}
            {pendingTopup > 0 && (
              <div className="mt-5">
                <h4 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">待确认订单</h4>
                <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-300">金额</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-300">研点</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-300">提交时间</th>
                        <th className="px-3 py-2 text-center font-medium text-slate-600 dark:text-slate-300">剩余时间</th>
                        <th className="px-3 py-2 text-center font-medium text-slate-600 dark:text-slate-300">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topupOrders.filter((o) => o.status === 'pending').map((o) => (
                        <tr key={o.id} className="border-t border-slate-100 dark:border-slate-700">
                          <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{o.yuan} 元</td>
                          <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{o.points.toLocaleString()}</td>
                          <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{new Date(o.created_at).toLocaleString('zh-CN')}</td>
                          <td className="px-3 py-2 text-center">
                            <Countdown expiresAt={o.expires_at} />
                          </td>
                          <td className="px-3 py-2 text-center">
                            {o.payment_claimed ? (
                              <span className="badge bg-emerald-50 text-emerald-600">已声称支付 · 等待核验</span>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleClaimTopupPaid(o.id)}
                                  className="mr-1.5 rounded-md border border-brand-200 px-2 py-1 text-xs text-brand-700 transition hover:bg-brand-50 dark:border-brand-700 dark:text-brand-300 dark:hover:bg-brand-900/30"
                                >
                                  我已支付
                                </button>
                                <button
                                  onClick={() => handleCancelTopup(o.id)}
                                  className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 transition hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/30"
                                >
                                  取消
                                </button>
                              </>
                            )}
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

      {/* 流水与用量 */}
      {section === 'history' && (
      <>
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
      </>
      )}
    </div>
    </ConsentGate>
  );
}

function Countdown({ expiresAt }: { expiresAt: string | null | undefined }) {
  const [remaining, setRemaining] = useState<number>(0);

  useEffect(() => {
    if (!expiresAt) return;
    const update = () => {
      const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setRemaining(diff);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  if (!expiresAt) return <span className="text-xs text-slate-400">-</span>;
  if (remaining <= 0) return <span className="badge bg-red-50 text-red-600">已过期</span>;

  const d = Math.floor(remaining / 86400);
  const h = Math.floor((remaining % 86400) / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <span className="order-countdown text-xs text-amber-600">
      {d > 0 && <span className="num">{d}</span>}
      {d > 0 && '天 '}
      <span className="num">{pad(h)}</span>:
      <span className="num">{pad(m)}</span>:
      <span className="num">{pad(s)}</span>
    </span>
  );
}
