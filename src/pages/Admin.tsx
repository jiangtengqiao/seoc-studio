import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../lib/auth';
import { isCloudEnabled, supabase } from '../lib/supabase';
import { getProduct, minimumWords, PRODUCTS, purchaseTitle } from '../data/products';
import { PageHeader, Spinner } from '../components/ui';
import { fetchAllInquiries, replyInquiry, type Inquiry } from '../lib/inquiries';
import SurveyAdmin from '../components/SurveyAdmin';
import SecurityPanel from '../components/SecurityPanel';
import AIAdminPanel from '../components/AIAdminPanel';

export default function Admin() {
  const { profile, loading } = useAuth();
  const [tab, setTab] = useState<'issue' | 'announcement' | 'purchase' | 'inquiry' | 'survey' | 'ai' | 'security'>('issue');
  const [msg, setMsg] = useState<string | null>(null);

  const [slug, setSlug] = useState(PRODUCTS[0].slug);
  const [issueNo, setIssueNo] = useState(1);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const [pending, setPending] = useState<{ id: string; email: string; product_slug: string; note: string | null; created_at: string }[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (tab === 'inquiry' && profile?.role === 'admin') {
      fetchAllInquiries().then(setInquiries);
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
      <div className={tab === 'survey' || tab === 'security' ? 'container-x max-w-6xl py-10' : 'container-x max-w-4xl py-10'}>
        <div className="mb-6 flex gap-2">
          {([
            ['issue', '发布期刊'],
            ['announcement', '发布公告'],
            ['purchase', '选购确认'],
            ['inquiry', '咨询与选购申请'],
            ['survey', '问卷中心'],
            ['security', '访问与安全'],
            ['ai', 'AI 平台管理']
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
        {tab === 'security' && <SecurityPanel />}

        {tab === 'ai' && <AIAdminPanel />}

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
