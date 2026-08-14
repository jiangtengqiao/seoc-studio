import { useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getLegalDoc, LEGAL_TITLES, LEGAL_CATEGORIES, listLegalDocs } from '../lib/content';
import { EmptyState, PageHeader } from '../components/ui';
import { BackButton } from '../components/fx';

const CATEGORY_ICONS: Record<string, JSX.Element> = {
  '基础协议': (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>
  ),
  '知识产权': (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M14.83 9.17a2 2 0 0 0-2.83 0L9 12v3h3l2.83-2.83a2 2 0 0 0 0-2.83z"/></svg>
  ),
  '社区与内容': (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  ),
  'AI 服务协议': (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4M8 16h.01M16 16h.01"/></svg>
  ),
  '账号与安全': (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
  ),
  '数据与隐私': (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
  ),
  '企业合作': (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/></svg>
  ),
  '内容分级': (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
  ),
};

const DOC_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
);

export default function Legal() {
  const { doc } = useParams();
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState<string>('全部');

  const docs = useMemo(() => listLegalDocs(), []);
  const docMap = useMemo(() => {
    const m: Record<string, { key: string; title: string; chars: number }> = {};
    docs.forEach((d) => { m[d.key] = d; });
    return m;
  }, [docs]);

  const filteredCats = useMemo(() => {
    const cats = LEGAL_CATEGORIES.map((cat) => ({
      ...cat,
      items: cat.keys
        .filter((k) => docMap[k])
        .map((k) => docMap[k])
        .filter((d) => {
          if (activeCat !== '全部' && activeCat !== cat.name) return false;
          if (!query.trim()) return true;
          return d.title.toLowerCase().includes(query.toLowerCase()) || d.key.toLowerCase().includes(query.toLowerCase());
        }),
    })).filter((cat) => cat.items.length > 0);
    return cats;
  }, [docMap, query, activeCat]);

  const totalCount = docs.length;

  if (!doc) {
    return (
      <div>
        <PageHeader title="协议与声明" sub={`本站全部法律文本共 ${totalCount} 份，购买前请仔细阅读。`} />
        <div className="container-x max-w-5xl py-8">
          {/* 搜索栏 */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.817-4.817A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索协议名称…"
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-brand-500 dark:focus:ring-brand-900/40"
              />
            </div>
            {/* 分类筛选 */}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setActiveCat('全部')}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  activeCat === '全部'
                    ? 'bg-brand-600 text-white dark:bg-brand-500'
                    : 'bg-slate-100 text-slate-600 hover:bg-brand-50 hover:text-brand-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                全部
              </button>
              {LEGAL_CATEGORIES.map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => setActiveCat(cat.name)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    activeCat === cat.name
                      ? 'bg-brand-600 text-white dark:bg-brand-500'
                      : 'bg-slate-100 text-slate-600 hover:bg-brand-50 hover:text-brand-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* 分类卡片展示 */}
          {filteredCats.length === 0 ? (
            <div className="card p-10 text-center text-sm text-slate-400 dark:text-slate-500">
              未找到匹配的协议文档
            </div>
          ) : (
            <div className="space-y-8">
              {filteredCats.map((cat) => (
                <div key={cat.name}>
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
                      {CATEGORY_ICONS[cat.name]}
                    </span>
                    {cat.name}
                    <span className="text-xs font-normal text-slate-400 dark:text-slate-500">({cat.items.length})</span>
                  </h2>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {cat.items.map((d) => (
                      <Link
                        key={d.key}
                        to={`/legal/${d.key}`}
                        className="card group flex flex-col gap-1 p-4 transition hover:-translate-y-0.5 hover:shadow-lift dark:hover:border-slate-600"
                      >
                        <p className="flex items-center gap-2 text-sm font-medium leading-5 text-slate-800 group-hover:text-brand-700 dark:text-slate-100 dark:group-hover:text-brand-300">
                          <span className="text-slate-300 dark:text-slate-600">{DOC_ICON}</span>
                          {d.title}
                        </p>
                        <p className="mt-auto text-xs text-slate-400 dark:text-slate-500">
                          约 {d.chars.toLocaleString()} 字 · 查看全文 →
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
            <p>上述协议构成您与 SEOC Studio（编程研究与探索）之间的完整约定。各协议之间设有跳转链接，您可随时点击查阅。</p>
            <p className="mt-1">如有疑问，请发送邮件至 jiangtengqiao@qq.com。</p>
          </div>
        </div>
      </div>
    );
  }

  const md = getLegalDoc(doc);
  if (!md) {
    return (
      <div className="container-x py-16">
        <EmptyState title="未找到该文本" hint="请从协议与声明目录进入。" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={LEGAL_TITLES[doc] || doc} sub="最近修订日期以文内标注为准。" />
      <div className="container-x max-w-3xl py-10">
        <div className="mb-4">
          <BackButton to="/legal" label="返回协议目录" />
        </div>
        <article className="card p-6 sm:p-10">
          <div className="prose-seoc">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ href, children }) =>
                  href && !href.includes('://') ? (
                    <Link to={`/legal/${href}`} className="text-brand-600 hover:underline dark:text-brand-400">{children}</Link>
                  ) : (
                    <a href={href} className="text-brand-600 hover:underline dark:text-brand-400">{children}</a>
                  )
              }}
            >
              {md}
            </ReactMarkdown>
          </div>
        </article>
        <div className="mt-6 flex items-center justify-between">
          <Link to="/legal" className="text-sm text-brand-600 hover:underline dark:text-brand-400">
            ← 返回协议与声明目录
          </Link>
          <Link to="/legal" className="text-sm text-slate-400 hover:text-brand-600 dark:text-slate-500 dark:hover:text-brand-400">
            查看全部 {Object.keys(LEGAL_TITLES).length} 份协议
          </Link>
        </div>
      </div>
    </div>
  );
}
