import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../lib/auth';
import { isCloudEnabled, supabase } from '../lib/supabase';
import { getProduct, minimumWords, PRODUCTS, purchaseTitle } from '../data/products';
import { PageHeader, Spinner } from '../components/ui';
import { fetchAllInquiries, replyInquiry, type Inquiry } from '../lib/inquiries';
import SurveyAdmin from '../components/SurveyAdmin';
import { getModels, getPlatformStats, listAllTopupOrders, confirmTopupOrder, listAllMembershipOrders, confirmMembershipOrder, TIER_INFO, type AIModel, type AITopupOrder, type AIMembershipOrder } from '../lib/ai';

export default function Admin() {
  const { profile, loading } = useAuth();
  const [tab, setTab] = useState<'issue' | 'announcement' | 'purchase' | 'inquiry' | 'survey' | 'ai'>('issue');
  const [msg, setMsg] = useState<string | null>(null);

  const [slug, setSlug] = useState(PRODUCTS[0].slug);
  const [issueNo, setIssueNo] = useState(1);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const [pending, setPending] = useState<{ id: string; email: string; product_slug: string; note: string | null; created_at: string }[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [aiModels, setAiModels] = useState<AIModel[]>([]);
  const [aiSummary, setAiSummary] = useState<{
    total_calls: number;
    total_cost: number;
    active_users: number;
    today_calls: number;
    pending_topup: number;
    pending_membership: number;
  }>({ total_calls: 0, total_cost: 0, active_users: 0, today_calls: 0, pending_topup: 0, pending_membership: 0 });
  const [topupOrders, setTopupOrders] = useState<(AITopupOrder & { email?: string })[]>([]);
  const [membershipOrders, setMembershipOrders] = useState<(AIMembershipOrder & { email?: string })[]>([]);

  useEffect(() => {
    if (tab === 'inquiry' && profile?.role === 'admin') {
      fetchAllInquiries().then(setInquiries);
    }
    if (tab === 'ai' && profile?.role === 'admin') {
      getModels().then(setAiModels);
      // 全站统计（RPC）：此前误用 getUsageSummary，显示的是管理员个人数据
      getPlatformStats().then((s) => {
        if (s) setAiSummary(s);
      });
      listAllTopupOrders('pending').then(setTopupOrders).catch(() => {});
      listAllMembershipOrders('pending').then(setMembershipOrders).catch(() => {});
    }
  }, [tab, profile]);

  useEffect(() => {
    if (tab === 'purchase' && isCloudEnabled && supabase && profile?.role === 'admin') {
      supabase
        .from('purchases')
        .select('id, product_slug, note, created_at, profiles(email)')
        .eq('status', 'pending')
        .then(({ data }) => {
          setPending(
            (data || []).map((r: Record<string, unknown>) => ({
              id: r.id as string,
              product_slug: r.product_slug as string,
              note: (r.note as string | null) || null,
              created_at: r.created_at as string,
              email: ((r.profiles as { email?: string } | null)?.email) || ''
            }))
          );
        });
    }
  }, [tab, profile]);

  if (loading) return <Spinner />;
  if (!profile || profile.role !== 'admin') {
    return (
      <div className="container-x max-w-xl py-16 text-center text-sm text-slate-500">
        仅管理员可访问本页面。
      </div>
    );
  }

  async function submitIssue(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!isCloudEnabled || !supabase) {
      setMsg('当前为演示模式，未连接 Supabase。请配置环境变量后使用在线发布，或直接编辑 content/issues 目录下的 Markdown 文件。');
      return;
    }
    const words = body.replace(/\s/g, '').length;
    const product = getProduct(slug);
    const requiredWords = product ? minimumWords(product) : 8000;
    if (words < requiredWords) {
      setMsg(`正文当前约 ${words} 字，低于本项目承诺的 ${requiredWords} 字下限。请补足细节后再发布。`);
      return;
    }
    const { error } = await supabase.from('issues').upsert(
      {
        product_slug: slug,
        issue_no: issueNo,
        title,
        content_md: body,
        word_count: words,
        lang: '中文',
        patches: []
      },
      { onConflict: 'product_slug,issue_no' }
    );
    setMsg(error ? `发布失败：${error.message}` : '发布成功');
  }

  async function submitAnnouncement(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!isCloudEnabled || !supabase) {
      setMsg('演示模式下无法在线发布公告。');
      return;
    }
    const { error } = await supabase.from('announcements').insert({ title, body });
    setMsg(error ? `发布失败：${error.message}` : '公告已发布');
  }

  async function confirmPurchase(id: string, ok: boolean) {
    if (!supabase) return;
    await supabase.from('purchases').update({ status: ok ? 'confirmed' : 'rejected' }).eq('id', id);
    setPending((p) => p.filter((x) => x.id !== id));
  }

  return (
    <div>
      <PageHeader title="管理端" sub="内容发布、公告维护与选购确认。" />
      <div className={tab === 'survey' ? 'container-x max-w-6xl py-10' : 'container-x max-w-4xl py-10'}>
        <div className="mb-6 flex gap-2">
          {([
            ['issue', '发布期刊'],
            ['announcement', '发布公告'],
            ['purchase', '选购确认'],
            ['inquiry', '咨询与选购申请'],
            ['survey', '问卷中心'],
            ['ai', 'AI 模型管理']
          ] as const).map(([k, label]) => (
            <button
              key={k}
              className={tab === k ? 'btn-primary' : 'btn-outline'}
              onClick={() => {
                setTab(k);
                setMsg(null);
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {msg && <p className="mb-4 rounded-lg bg-brand-50 px-4 py-2 text-sm text-brand-800">{msg}</p>}

        {tab === 'issue' && (
          <form onSubmit={submitIssue} className="card space-y-4 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">所属项目</label>
                <select className="input" value={slug} onChange={(e) => setSlug(e.target.value)}>
                  {PRODUCTS.map((p) => (
                    <option key={p.slug} value={p.slug}>{p.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">期号</label>
                <input className="input" type="number" min={1} value={issueNo} onChange={(e) => setIssueNo(Number(e.target.value))} />
              </div>
            </div>
            <div>
              <label className="label">本期标题</label>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div>
              <label className="label">正文（Markdown）</label>
              <textarea className="input min-h-64 font-mono text-xs" value={body} onChange={(e) => setBody(e.target.value)} required />
            </div>
            <button className="btn-primary">发布 / 更新</button>
          </form>
        )}

        {tab === 'announcement' && (
          <form onSubmit={submitAnnouncement} className="card space-y-4 p-6">
            <div>
              <label className="label">公告标题</label>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div>
              <label className="label">公告正文</label>
              <textarea className="input min-h-32" value={body} onChange={(e) => setBody(e.target.value)} required />
            </div>
            <button className="btn-primary">发布公告</button>
          </form>
        )}

        {tab === 'inquiry' && (
          <div className="space-y-4">
            {inquiries.length === 0 ? (
              <div className="card p-6 text-sm text-slate-500">暂无咨询或选购申请。</div>
            ) : (
              inquiries.map((q) => (
                <div key={q.id} className="card p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-900">
                      {q.email}
                      <span className="ml-2 badge bg-brand-50 text-brand-700">
                        {q.kind === 'purchase' ? '选购申请' : q.kind === 'consult' ? '购买咨询' : q.message.startsWith('[累计回馈') ? '累计回馈' : '问题'}
                      </span>
                      {q.product_slug && <span className="ml-2 badge bg-slate-100 text-slate-600">{q.product_slug}</span>}
                    </p>
                    <span className={`badge ${q.status === 'open' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {q.status === 'open' ? '待回复' : '已回复'}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{q.message}</p>
                  <p className="mt-1 text-xs text-slate-400">{new Date(q.created_at).toLocaleString('zh-CN')}</p>
                  {q.reply ? (
                    <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">我的回复：{q.reply}</p>
                  ) : (
                    <div className="mt-3 flex gap-2">
                      <input
                        className="input flex-1 !py-1.5 text-sm"
                        placeholder="输入回复内容（用户可在其账户中看到，建议同时邮件通知）"
                        value={replyDrafts[q.id] || ''}
                        onChange={(e) => setReplyDrafts((d) => ({ ...d, [q.id]: e.target.value }))}
                      />
                      <button
                        className="btn-primary !py-1.5 !text-xs"
                        disabled={!(replyDrafts[q.id] || '').trim()}
                        onClick={async () => {
                          await replyInquiry(q.id, (replyDrafts[q.id] || '').trim());
                          setInquiries(await fetchAllInquiries());
                        }}
                      >
                        回复
                      </button>
                      <a
                        className="btn-outline !py-1.5 !text-xs"
                        href={`mailto:${q.email}?subject=${encodeURIComponent('SEOC Studio 选购咨询回复')}&body=${encodeURIComponent((replyDrafts[q.id] || '').trim() || '您好，')}`}
                      >
                        邮件回复
                      </a>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'survey' && <SurveyAdmin />}

        {tab === 'ai' && (
          <div className="space-y-6">
            {/* 使用统计概览（全站） */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="card p-5 text-center">
                <p className="text-3xl font-bold text-brand-700">{aiSummary.total_calls.toLocaleString()}</p>
                <p className="mt-1 text-sm text-slate-500">全站总调用次数</p>
                <p className="mt-0.5 text-xs text-slate-400">今日 {aiSummary.today_calls.toLocaleString()} 次</p>
              </div>
              <div className="card p-5 text-center">
                <p className="text-3xl font-bold text-amber-600">{Number(aiSummary.total_cost).toFixed(2)}</p>
                <p className="mt-1 text-sm text-slate-500">全站总研点消耗</p>
              </div>
              <div className="card p-5 text-center">
                <p className="text-3xl font-bold text-emerald-600">{aiSummary.active_users}</p>
                <p className="mt-1 text-sm text-slate-500">使用 AI 的用户数</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  待确认：充值 {aiSummary.pending_topup} · 会员 {aiSummary.pending_membership}
                </p>
              </div>
            </div>

            {/* 模型管理表格 */}
            <div className="card overflow-hidden">
              <div className="border-b border-slate-100 px-6 py-4">
                <h3 className="text-base font-semibold text-slate-800">模型定价表</h3>
                <p className="text-xs text-slate-400">管理可用 AI 模型及其研点计费标准（每千 token）</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">模型 ID</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">厂商</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">显示名称</th>
                      <th className="px-4 py-3 text-right font-medium text-slate-600">输入价格</th>
                      <th className="px-4 py-3 text-right font-medium text-slate-600">输出价格</th>
                      <th className="px-4 py-3 text-center font-medium text-slate-600">每日免费</th>
                      <th className="px-4 py-3 text-center font-medium text-slate-600">最低会员</th>
                      <th className="px-4 py-3 text-center font-medium text-slate-600">启用</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aiModels.map((m) => (
                      <tr key={m.id} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-xs text-slate-700">{m.id}</td>
                        <td className="px-4 py-3 text-slate-600">
                          <span className={`badge ${m.provider === 'alibaba' ? 'bg-orange-50 text-orange-600' : m.provider === 'zhipu' ? 'bg-blue-50 text-blue-600' : m.provider === 'deepseek' ? 'bg-violet-50 text-violet-600' : 'bg-sky-50 text-sky-600'}`}>
                            {m.provider === 'alibaba' ? '通义' : m.provider === 'zhipu' ? '智谱' : m.provider === 'deepseek' ? 'DeepSeek' : '豆包'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{m.display_name?.['zh-CN'] || m.id}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-slate-600">{m.input_price}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-slate-600">{m.output_price}</td>
                        <td className="px-4 py-3 text-center text-slate-600">{m.free_daily_quota}</td>
                        <td className="px-4 py-3 text-center">
                          {m.min_tier === 'lite' ? (
                            <span className="badge bg-blue-50 text-blue-600">Lite</span>
                          ) : m.min_tier === 'plus' ? (
                            <span className="badge bg-purple-50 text-purple-600">Plus</span>
                          ) : m.min_tier === 'pro' ? (
                            <span className="badge bg-amber-50 text-amber-600">Pro</span>
                          ) : (
                            <span className="badge bg-rose-50 text-rose-600">Max</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {m.enabled ? (
                            <span className="badge bg-emerald-50 text-emerald-600">启用</span>
                          ) : (
                            <span className="badge bg-slate-100 text-slate-400">禁用</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-slate-100 bg-slate-50 px-6 py-3 text-xs text-slate-400">
                模型配置存储在 Supabase ai_models 表中，如需新增模型或调整定价请在 Supabase SQL Editor 中操作。
              </div>
            </div>

            {/* 会员订单确认 */}
            <div className="card overflow-hidden">
              <div className="border-b border-slate-100 px-6 py-4">
                <h3 className="text-base font-semibold text-slate-800">会员开通确认</h3>
                <p className="text-xs text-slate-400">核验用户付款到账后点确认，会员等级自动开通并发放赠送研点；驳回则订单关闭。</p>
              </div>
              {membershipOrders.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400">暂无待确认的会员订单。</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-slate-600">用户邮箱</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-600">套餐</th>
                        <th className="px-4 py-3 text-right font-medium text-slate-600">金额</th>
                        <th className="px-4 py-3 text-right font-medium text-slate-600">赠送研点</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-600">提交时间</th>
                        <th className="px-4 py-3 text-center font-medium text-slate-600">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {membershipOrders.map((o) => (
                        <tr key={o.id} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-3 text-slate-700">{o.email || '-'}</td>
                          <td className="px-4 py-3">
                            <span className="badge bg-brand-50 text-brand-700">{TIER_INFO[o.tier].name}</span>
                            <span className="ml-1 text-xs text-slate-400">{o.period === 'monthly' ? '月付' : '年付'}</span>
                          </td>
                          <td className="px-4 py-3 text-right text-slate-700">{o.yuan} 元</td>
                          <td className="px-4 py-3 text-right text-slate-700">{o.granted_points.toLocaleString()}</td>
                          <td className="px-4 py-3 text-slate-500">{new Date(o.created_at).toLocaleString('zh-CN')}</td>
                          <td className="px-4 py-3 text-center">
                            <button
                              className="btn-primary !py-1 !text-xs mr-2"
                              onClick={async () => {
                                await confirmMembershipOrder(o.id, true);
                                setMembershipOrders(await listAllMembershipOrders('pending'));
                              }}
                            >
                              确认到账
                            </button>
                            <button
                              className="btn-outline !py-1 !text-xs"
                              onClick={async () => {
                                await confirmMembershipOrder(o.id, false);
                                setMembershipOrders(await listAllMembershipOrders('pending'));
                              }}
                            >
                              驳回
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 充值确认 */}
            <div className="card overflow-hidden">
              <div className="border-b border-slate-100 px-6 py-4">
                <h3 className="text-base font-semibold text-slate-800">研点充值确认</h3>
                <p className="text-xs text-slate-400">核验用户付款到账后点确认，研点自动入账；驳回则订单关闭。</p>
              </div>
              {topupOrders.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400">暂无待确认的充值订单。</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-slate-600">用户邮箱</th>
                        <th className="px-4 py-3 text-right font-medium text-slate-600">金额</th>
                        <th className="px-4 py-3 text-right font-medium text-slate-600">研点</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-600">提交时间</th>
                        <th className="px-4 py-3 text-center font-medium text-slate-600">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topupOrders.map((o) => (
                        <tr key={o.id} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-3 text-slate-700">{o.email || '-'}</td>
                          <td className="px-4 py-3 text-right text-slate-700">{o.yuan} 元</td>
                          <td className="px-4 py-3 text-right text-slate-700">{o.points.toLocaleString()}</td>
                          <td className="px-4 py-3 text-slate-500">{new Date(o.created_at).toLocaleString('zh-CN')}</td>
                          <td className="px-4 py-3 text-center">
                            <button
                              className="btn-primary !py-1 !text-xs mr-2"
                              onClick={async () => {
                                await confirmTopupOrder(o.id, true);
                                setTopupOrders(await listAllTopupOrders('pending'));
                                getPlatformStats().then((s) => s && setAiSummary(s));
                              }}
                            >
                              确认到账
                            </button>
                            <button
                              className="btn-outline !py-1 !text-xs"
                              onClick={async () => {
                                await confirmTopupOrder(o.id, false);
                                setTopupOrders(await listAllTopupOrders('pending'));
                              }}
                            >
                              驳回
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'purchase' && (
          <div className="card p-6">
            {pending.length === 0 ? (
              <p className="text-sm text-slate-500">
                {isCloudEnabled ? '暂无待确认的选购申请。' : '演示模式下无在线申请数据。'}
              </p>
            ) : (
              <ul className="space-y-3">
                {pending.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 text-sm">
                    <div>
                      <p className="font-medium text-slate-900">{p.email}</p>
                      <p className="text-slate-500">{purchaseTitle(p.product_slug)} · {new Date(p.created_at).toLocaleString('zh-CN')}</p>
                      {p.note && <p className="mt-1 max-w-xl text-xs leading-5 text-slate-400">付款信息：{p.note}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button className="btn-primary !py-1 !text-xs" onClick={() => confirmPurchase(p.id, true)}>确认开通</button>
                      <button className="btn-outline !py-1 !text-xs" onClick={() => confirmPurchase(p.id, false)}>驳回</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
