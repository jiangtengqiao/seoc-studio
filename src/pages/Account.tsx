import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';
import { fetchMaterials, fetchPurchases } from '../lib/content';
import { getProduct, purchaseTitle } from '../data/products';
import { CONTACT_EMAIL, type Material, type Purchase } from '../lib/types';
import { PageHeader, Spinner } from '../components/ui';
import { fetchMyInquiries, type Inquiry } from '../lib/inquiries';
import BenefitsPanel from '../components/BenefitsPanel';
import { getBalance, getUsageSummary, type AIBalance } from '../lib/ai';

export default function Account() {
  const { t } = useI18n();
  const { profile, loading } = useAuth();
  const nav = useNavigate();
  const [purchases, setPurchases] = useState<Purchase[] | null>(null);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [materials, setMaterials] = useState<Record<string, Material[]>>({});
  const [aiBalance, setAiBalance] = useState<AIBalance | null>(null);
  const [aiSummary, setAiSummary] = useState<{ total_calls: number; total_cost: number; recent_models: string[] } | null>(null);

  useEffect(() => {
    if (!loading && !profile) nav('/auth/login');
  }, [loading, profile, nav]);

  useEffect(() => {
    if (!profile) return;
    fetchMyInquiries(profile.id).then(setInquiries);
    fetchPurchases(profile.id).then(async (ps) => {
      setPurchases(ps);
      const map: Record<string, Material[]> = {};
      for (const p of ps.filter((x) => x.status === 'confirmed')) {
        map[p.product_slug] = await fetchMaterials(p.product_slug);
      }
      setMaterials(map);
    });
    getBalance().then(setAiBalance);
    getUsageSummary().then(setAiSummary);
  }, [profile]);

  if (loading || !profile) return <Spinner />;

  const confirmed = (purchases || []).filter((p) => p.status === 'confirmed');
  const pending = (purchases || []).filter((p) => p.status === 'pending');

  return (
    <div>
      <PageHeader title={t('account.title')} sub={`账户邮箱：${profile.email}`} />
      <div className="container-x grid gap-6 py-10 lg:grid-cols-3">
        <section className="card p-6">
          <h2 className="mb-4 text-base font-semibold text-slate-900">账户信息</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">昵称</dt><dd>{profile.nickname || '未设置'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">角色</dt><dd>{profile.role === 'admin' ? '管理员' : '用户'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">注册时间</dt><dd>{new Date(profile.created_at).toLocaleDateString('zh-CN')}</dd></div>
          </dl>

          <h3 className="mb-3 mt-6 text-sm font-semibold text-slate-900">第三方绑定</h3>
          <div className="space-y-2">
            {[
              { name: 'QQ', bound: profile.qq_bound },
              { name: '微信', bound: profile.wechat_bound }
            ].map((b) => (
              <div key={b.name} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <span>{b.name} 账号</span>
                {b.bound ? (
                  <span className="badge bg-brand-50 text-brand-700">已绑定</span>
                ) : (
                  <span className="badge bg-slate-100 text-slate-500" title="第三方登录将在资质齐备后开放">
                    暂未开放
                  </span>
                )}
              </div>
            ))}
            <p className="text-xs leading-5 text-slate-400">
              QQ 与微信一键登录需要平台开放资质，目前正在筹备，界面上将优先开放绑定入口。
            </p>
          </div>

          <h3 className="mb-3 mt-6 text-sm font-semibold text-slate-900">多账户联动</h3>
          <p className="text-xs leading-5 text-slate-500">
            如您拥有多个账户（例如个人与学习用途分开），可通过邮箱 {CONTACT_EMAIL} 申请账户联动，
            联动后已购内容可在账户间共享查阅。线上自助联动功能将在后续版本开放。
          </p>
        </section>

        <section className="card p-6 lg:col-span-2">
          <h2 className="mb-4 text-base font-semibold text-slate-900">已开通的内容</h2>
          {purchases === null ? (
            <Spinner />
          ) : confirmed.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              暂无已开通的内容。浏览 <Link className="text-brand-600 hover:underline" to="/products/subscription">产品目录</Link> 开始选购。
            </div>
          ) : (
            <ul className="space-y-3">
              {confirmed.map((p) => {
                const prod = getProduct(p.product_slug);
                const ms = materials[p.product_slug] || [];
                return (
                  <li key={p.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-slate-900">{purchaseTitle(p.product_slug)}</p>
                      <div className="flex gap-2">
                        {prod ? (
                          <Link className="btn-outline !py-1 !text-xs" to={`/product/${prod.slug}`}>进入阅读</Link>
                        ) : (
                          <Link className="btn-outline !py-1 !text-xs" to="/products/exploration">查看总包内容</Link>
                        )}
                      </div>
                    </div>
                    {ms.length > 0 && (
                      <ul className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-sm">
                        {ms.map((m) => (
                          <li key={m.id} className="flex justify-between text-slate-600">
                            <span>附赠资料：{m.title}</span>
                            <span className="text-xs text-slate-400">{m.size}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {pending.length > 0 && (
            <>
              <h3 className="mb-3 mt-8 text-sm font-semibold text-slate-900">{t('account.pending')}</h3>
              <ul className="space-y-2 text-sm">
                {pending.map((p) => (
                  <li key={p.id} className="flex justify-between rounded-lg bg-amber-50 px-3 py-2 text-amber-900">
                    <span>{purchaseTitle(p.product_slug)}</span>
                    <span>人工确认中</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
        <section className="card p-6 lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">我的咨询与选购申请</h2>
            <Link to="/assessment" className="text-xs text-brand-600 hover:underline">查看我的评估历史</Link>
          </div>
          {inquiries.length === 0 ? (
            <p className="text-sm text-slate-500">暂无记录。在任何产品页点击「申请选购 / 咨询客服」即可发起。</p>
          ) : (
            <ul className="space-y-3">
              {inquiries.map((q) => (
                <li key={q.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className={`badge ${q.status === 'open' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {q.status === 'open' ? '等待回复' : '已回复'}
                    </span>
                    <span className="text-xs text-slate-400">{new Date(q.created_at).toLocaleString('zh-CN')}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">{q.message}</p>
                  {q.reply && (
                    <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">客服回复：{q.reply}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* AI 使用统计卡片 */}
        <section className="card p-6 lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">AI 使用统计</h2>
            <div className="flex gap-2">
              <Link to="/ai" className="text-xs text-brand-600 hover:underline">使用研智助手</Link>
              <span className="text-slate-300">|</span>
              <Link to="/ai/credits" className="text-xs text-brand-600 hover:underline">管理研点</Link>
              <span className="text-slate-300">|</span>
              <Link to="/ai/api" className="text-xs text-brand-600 hover:underline">API 密钥</Link>
            </div>
          </div>
          {aiBalance === null || aiSummary === null ? (
            <Spinner />
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-brand-50 to-white p-4">
                <p className="text-xs text-slate-500">研点余额</p>
                <p className="mt-1 text-2xl font-bold text-brand-700">{aiBalance.balance.toLocaleString()}</p>
                {aiBalance.free_remaining > 0 && (
                  <p className="mt-1 text-xs text-emerald-600">今日免费剩余：{aiBalance.free_remaining} 次</p>
                )}
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs text-slate-500">总调用次数</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{aiSummary.total_calls}</p>
                <p className="mt-1 text-xs text-slate-400">累计消耗 {aiSummary.total_cost.toFixed(2)} 研点</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs text-slate-500">最近使用模型</p>
                {aiSummary.recent_models.length > 0 ? (
                  <ul className="mt-2 space-y-1">
                    {aiSummary.recent_models.slice(0, 3).map((model) => (
                      <li key={model} className="text-sm text-slate-700">{model}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-slate-400">暂无使用记录</p>
                )}
              </div>
            </div>
          )}
        </section>

        {purchases !== null && <BenefitsPanel purchases={purchases} />}
      </div>
    </div>
  );
}
