import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PRODUCTS } from '../data/products';
import { LEGAL_TITLES, listLocalIssues } from '../lib/content';
import { CATEGORY_META, CONTACT_EMAIL } from '../lib/types';
import { PageHeader } from '../components/ui';

interface Hit {
  kind: string;
  title: string;
  to: string;
  desc?: string;
}

export function SearchPage() {
  const [q, setQ] = useState('');

  const hits = useMemo<Hit[]>(() => {
    const kw = q.trim().toLowerCase();
    if (!kw) return [];
    const out: Hit[] = [];
    for (const p of PRODUCTS) {
      if ((p.title + p.description + (p.titleEn || '')).toLowerCase().includes(kw)) {
        out.push({
          kind: CATEGORY_META[p.category].name,
          title: p.title,
          to: `/product/${p.slug}`,
          desc: `¥${p.price} · ${p.unit}`
        });
      }
      for (const t of p.toc) {
        if (t.title.toLowerCase().includes(kw)) {
          out.push({ kind: '目录', title: `${p.title} · ${t.title}`, to: `/product/${p.slug}` });
        }
      }
      for (const iss of listLocalIssues(p.slug)) {
        if ((iss.title + iss.content_md.slice(0, 400)).toLowerCase().includes(kw)) {
          out.push({
            kind: '期刊正文',
            title: `${p.title} · 第 ${iss.issue_no} 期 ${iss.title}`,
            to: `/reader/${p.slug}/${iss.issue_no}`
          });
        }
      }
    }
    for (const [key, title] of Object.entries(LEGAL_TITLES)) {
      if (title.toLowerCase().includes(kw)) {
        out.push({ kind: '协议与声明', title, to: `/legal/${key}` });
      }
    }
    return out.slice(0, 40);
  }, [q]);

  return (
    <div>
      <PageHeader title="全站搜索" sub="检索项目、目录、已发布期刊正文与法律文本。" />
      <div className="container-x max-w-3xl py-10">
        <input
          className="input !py-3 !text-base"
          placeholder="输入关键词，例如 爬虫、虚拟环境、退款"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
        />
        <p className="mt-2 text-xs text-slate-400">
          {q.trim() ? `共 ${hits.length} 条结果` : '支持搜索产品名、期次标题、正文片段与协议名称'}
        </p>
        <ul className="mt-6 space-y-3">
          {hits.map((h, i) => (
            <li key={i}>
              <Link to={h.to} className="card flex items-center justify-between gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-lift">
                <div>
                  <p className="text-sm font-medium text-slate-800">{h.title}</p>
                  {h.desc && <p className="mt-1 text-xs text-slate-400">{h.desc}</p>}
                </div>
                <span className="badge shrink-0 bg-brand-50 text-brand-700">{h.kind}</span>
              </Link>
            </li>
          ))}
        </ul>
        {q.trim() && hits.length === 0 && (
          <p className="mt-10 text-center text-sm text-slate-500">没有找到匹配内容，换个关键词试试。</p>
        )}
      </div>
    </div>
  );
}

export function CommunityPage() {
  return (
    <div>
      <PageHeader
        title="学术交流社群"
        sub="因探索式项目的特殊性质，平台开放 QQ 群与微信群两种学术交流渠道。"
      />
      <div className="container-x max-w-3xl space-y-6 py-10">
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { name: 'QQ 群', desc: '适合文件共享与长期留档讨论，群内按子项目分话题交流。' },
            { name: '微信群', desc: '适合即时讨论与碎片化答疑，节奏更快。' }
          ].map((g) => (
            <div key={g.name} className="card p-6">
              <h2 className="text-base font-semibold text-slate-900">{g.name}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{g.desc}</p>
              <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                购买任意探索式子项目后可任选其一加入，二者不可兼得。
              </p>
            </div>
          ))}
        </div>
        <div className="card p-6">
          <h2 className="text-base font-semibold text-slate-900">入群流程</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-7 text-slate-600">
            <li>完成探索式子项目的选购与人工确认开通。</li>
            <li>发送邮件至 {CONTACT_EMAIL}，注明账户邮箱、已购项目与期望加入的群类型。</li>
            <li>收到邀请后按指引入群，入群即视为同意《学术交流群社区规范》。</li>
          </ol>
          <Link to="/legal/community-rules" className="btn-outline mt-4">阅读社区规范</Link>
        </div>
      </div>
    </div>
  );
}
