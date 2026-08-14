import { useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getLegalDoc, LEGAL_TITLES, LEGAL_CATEGORIES, listLegalDocs } from '../lib/content';
import { EmptyState, PageHeader } from '../components/ui';
import { BackButton } from '../components/fx';

const CATEGORY_ICONS: Record<string, string> = {
  '基础协议': '📋',
  '知识产权': '©️',
  '社区与内容': '👥',
  'AI 服务协议': '🤖',
  '账号与安全': '🔐',
  '数据与隐私': '🔒',
  '企业合作': '🏢',
  '内容分级': '📊',
};

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
              <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.817-4.817A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索协议名称…"
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>
            {/* 分类筛选 */}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setActiveCat('全部')}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  activeCat === '全部'
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-brand-50 hover:text-brand-700 dark:bg-slate-800 dark:text-slate-300'
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
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-brand-50 hover:text-brand-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* 分类卡片展示 */}
          {filteredCats.length === 0 ? (
            <div className="card p-10 text-center text-sm text-slate-400">
              未找到匹配的协议文档
            </div>
          ) : (
            <div className="space-y-8">
              {filteredCats.map((cat) => (
                <div key={cat.name}>
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    <span className="text-base">{CATEGORY_ICONS[cat.name] || '📄'}</span>
                    {cat.name}
                    <span className="text-xs font-normal text-slate-400">({cat.items.length})</span>
                  </h2>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {cat.items.map((d) => (
                      <Link
                        key={d.key}
                        to={`/legal/${d.key}`}
                        className="card group flex flex-col gap-1 p-4 transition hover:-translate-y-0.5 hover:shadow-lift"
                      >
                        <p className="text-sm font-medium leading-5 text-slate-800 group-hover:text-brand-700 dark:text-slate-100 dark:group-hover:text-brand-300">
                          {d.title}
                        </p>
                        <p className="mt-auto text-xs text-slate-400">
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
                    <Link to={`/legal/${href}`} className="text-brand-600 hover:underline">{children}</Link>
                  ) : (
                    <a href={href} className="text-brand-600 hover:underline">{children}</a>
                  )
              }}
            >
              {md}
            </ReactMarkdown>
          </div>
        </article>
        <div className="mt-6 flex items-center justify-between">
          <Link to="/legal" className="text-sm text-brand-600 hover:underline">
            ← 返回协议与声明目录
          </Link>
          <Link to="/legal" className="text-sm text-slate-400 hover:text-brand-600">
            查看全部 {LEGAL_TITLES && Object.keys(LEGAL_TITLES).length} 份协议
          </Link>
        </div>
      </div>
    </div>
  );
}
