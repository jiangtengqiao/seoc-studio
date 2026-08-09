import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getProduct } from '../data/products';
import { fetchMaterials, fetchPurchases, hasAccess, listLocalIssues } from '../lib/content';
import { useAuth } from '../lib/auth';
import { CATEGORY_META, CONTACT_EMAIL, type Material, type Purchase } from '../lib/types';
import { EmptyState, PageHeader, PriceTag } from '../components/ui';
import { LensGate } from '../components/fx';
import { submitInquiry } from '../lib/inquiries';

export default function ProductDetail() {
  const { slug } = useParams();
  const product = slug ? getProduct(slug) : undefined;
  const { profile } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [showConsult, setShowConsult] = useState(false);
  const [consultMsg, setConsultMsg] = useState('');
  const [consultState, setConsultState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');

  useEffect(() => {
    if (!product) return;
    fetchMaterials(product.slug).then(setMaterials);
    if (profile) fetchPurchases(profile.id).then(setPurchases);
  }, [product, profile]);

  if (!product) {
    return (
      <div className="container-x py-16">
        <EmptyState title="未找到该项目" hint="请从产品目录进入。" />
      </div>
    );
  }

  const meta = CATEGORY_META[product.category];
  const owned = hasAccess(purchases, product.slug);
  const published = listLocalIssues(product.slug);
  const firstIssue = published[0] || null;
  const previewOf = (no: number) => Boolean(profile) && no === 1;
  const publishedSet = new Set(published.map((i) => i.issue_no));
  const mailSubject = encodeURIComponent(`选购咨询：${product.title}`);
  const mailBody = encodeURIComponent(
    `您好，我想了解并选购「${product.title}」（¥${product.price}）。\n我的账户邮箱：\n已完成的免费能力评估结果（探索式必填）：\n`
  );

  return (
    <div>
      <PageHeader title={product.title} sub={product.titleEn} />
      <div className="container-x grid gap-8 py-10 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-8">
          <section className="card p-6">
            <h2 className="mb-3 text-base font-semibold text-slate-900">项目介绍</h2>
            <p className="text-sm leading-7 text-slate-600">{product.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="badge bg-brand-50 text-brand-700">{meta.name}</span>
              <span className="badge bg-slate-100 text-slate-600">{product.maintenance}</span>
              <span className="badge bg-slate-100 text-slate-600">{product.updating}</span>
              <span className="badge bg-slate-100 text-slate-600">{product.lang}</span>
              {product.wordsPerIssue && (
                <span className="badge bg-slate-100 text-slate-600">{product.wordsPerIssue}</span>
              )}
            </div>
          </section>

          <section className="card p-6">
            <h2 className="mb-4 text-base font-semibold text-slate-900">
              {product.category === 'subscription' ? '章节' : '期次与目录'}
            </h2>
            <ol className="divide-y divide-slate-100">
              {product.toc.map((t) => {
                const isPublished = publishedSet.has(t.no);
                const canRead = isPublished && (owned || previewOf(t.no));
                const inner = (
                  <>
                    <span className="w-14 shrink-0 font-mono text-xs text-slate-400">
                      {String(t.no).padStart(2, '0')}
                    </span>
                    <span className="flex-1 text-sm text-slate-700">{t.title}</span>
                    {t.lang && <span className="badge bg-slate-100 text-slate-500">{t.lang}</span>}
                    {isPublished ? (
                      owned ? (
                        <span className="badge bg-brand-50 text-brand-700">可阅读</span>
                      ) : t.no === 1 ? (
                        <span className="badge bg-emerald-50 text-emerald-700">首期试读</span>
                      ) : (
                        <span className="badge bg-brand-50 text-brand-700">已发布</span>
                      )
                    ) : (
                      <span className="badge bg-slate-100 text-slate-400">连载中</span>
                    )}
                  </>
                );
                return (
                  <li key={t.no}>
                    {canRead ? (
                      <Link to={`/reader/${product.slug}/${t.no}`} className="flex items-center gap-3 py-3 hover:bg-brand-50/50">
                        {inner}
                      </Link>
                    ) : (
                      <div className="flex items-center gap-3 py-3">{inner}</div>
                    )}
                  </li>
                );
              })}
            </ol>
            {!owned && published.length > 0 && (
              <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                已发布 {published.length} 期内容。{profile ? '首期可试读，其余开通后解锁。' : '登录后可试读首期。'}
              </p>
            )}
          </section>

          {!owned && firstIssue && (
            <section>
              <h2 className="mb-3 text-base font-semibold text-slate-900">正文节选探照灯</h2>
              <LensGate
                title={`《${product.title}》${firstIssue.title} 节选`}
                className="h-[28rem] rounded-2xl border border-slate-200 shadow-card"
                excerpt={firstIssue.content_md.replace(/[#*`>]/g, '').split('\n').filter((l) => l.trim()).slice(0, 20).join('\n').slice(0, 1600)}
                cta={
                  profile ? undefined : (
                    <Link to="/auth/register" className="btn mt-2 bg-white text-brand-800 hover:bg-brand-50">
                      免费注册试读首期
                    </Link>
                  )
                }
              />
            </section>
          )}

          {product.materialsIncluded && (
            <section className="card p-6">
              <h2 className="mb-3 text-base font-semibold text-slate-900">附赠资料</h2>
              {materials.length === 0 ? (
                <p className="text-sm text-slate-500">资料随开通发放，也可在开通后于用户中心下载。</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {materials.map((m) => (
                    <li key={m.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                      <span>{m.title}</span>
                      <span className="text-xs text-slate-400">{m.size}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>

        <aside className="space-y-4 self-start lg:sticky lg:top-20">
          <div className="card p-6">
            <PriceTag price={product.price} unit={product.unit} />
            <ul className="mt-4 space-y-2">
              {product.perks.map((k) => (
                <li key={k} className="flex items-start gap-2 text-sm text-slate-600">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                  {k}
                </li>
              ))}
            </ul>
            {profile ? (
              <button className="btn-primary mt-6 w-full" onClick={() => setShowConsult(!showConsult)}>
                {showConsult ? '收起咨询表单' : '申请选购 / 咨询客服'}
              </button>
            ) : (
              <Link to={`/auth/login?next=${encodeURIComponent(`/product/${product.slug}`)}`} className="btn-primary mt-6 w-full">
                登录后选购
              </Link>
            )}
            {profile && showConsult && (
              <div className="mt-4 rounded-xl border border-brand-100 bg-brand-50/50 p-4" style={{ animation: 'rise-in 0.3s ease both' }}>
                {consultState === 'done' ? (
                  <p className="text-sm leading-6 text-brand-800">
                    已收到您的申请。客服（负责人 JTQ）会在核实后通过邮件与您确认价格、支付与开通事宜，回复也会同步显示在用户中心的「我的咨询」里。
                  </p>
                ) : (
                  <>
                    <p className="mb-2 text-xs text-slate-500">
                      可填写选购意向、希望购买的组合、或任何疑问，客服将为您提供购买建议与指引。
                    </p>
                    <textarea
                      className="input min-h-24 text-sm"
                      placeholder={`例如：我想购买本项目，请告诉我接下来怎么操作。`}
                      value={consultMsg}
                      onChange={(e) => setConsultMsg(e.target.value)}
                    />
                    <button
                      className="btn-primary mt-3 w-full"
                      disabled={consultState === 'busy' || consultMsg.trim().length < 5}
                      onClick={async () => {
                        setConsultState('busy');
                        const err = await submitInquiry({
                          userId: profile.id,
                          email: profile.email,
                          kind: 'purchase',
                          productSlug: product.slug,
                          message: consultMsg.trim()
                        });
                        setConsultState(err ? 'error' : 'done');
                      }}
                    >
                      {consultState === 'busy' ? '提交中' : '提交选购申请'}
                    </button>
                    {consultState === 'error' && <p className="mt-2 text-xs text-red-600">提交失败，请改用下方邮件方式。</p>}
                  </>
                )}
                <a
                  className="mt-3 block text-center text-xs text-slate-500 hover:text-brand-600"
                  href={`mailto:${CONTACT_EMAIL}?subject=${mailSubject}&body=${mailBody}`}
                >
                  也可以直接发送邮件至 {CONTACT_EMAIL}
                </a>
              </div>
            )}
            {product.category === 'exploration' && (
              <Link to="/assessment" className="btn-outline mt-2 w-full">
                先做免费能力评估
              </Link>
            )}
          </div>
          <div className="card border-amber-200 bg-amber-50 p-5 text-xs leading-6 text-amber-900">
            <p className="font-semibold">购买补丁</p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>数字商品一经下单并支付，概不支持退款。</li>
              <li>下单并支付即视为成年人，本司概不承担相关责任。</li>
              <li>本司秉承不诱骗消费者宗旨，不进行诱导消费，无任何促销优惠活动。</li>
              <li>如有异议，请投送电子邮件至 {CONTACT_EMAIL}。</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
