import { Link, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getLegalDoc, LEGAL_TITLES, listLegalDocs } from '../lib/content';
import { EmptyState, PageHeader } from '../components/ui';

export default function Legal() {
  const { doc } = useParams();
  const docs = listLegalDocs();

  if (!doc) {
    return (
      <div>
        <PageHeader title="协议与声明" sub="本站全部法律文本，购买前请仔细阅读。" />
        <div className="container-x max-w-3xl py-10">
          <ul className="card divide-y divide-slate-100">
            {docs.map((d) => (
              <li key={d.key}>
                <Link to={`/legal/${d.key}`} className="flex items-center justify-between px-5 py-4 text-sm hover:bg-brand-50/50">
                  <span className="font-medium text-slate-800">{d.title}</span>
                  <span className="text-xs text-slate-400">查看全文</span>
                </Link>
              </li>
            ))}
          </ul>
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
        <article className="card p-6 sm:p-10">
          <div className="prose-seoc">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{md}</ReactMarkdown>
          </div>
        </article>
        <p className="mt-6 text-sm">
          <Link to="/legal" className="text-brand-600 hover:underline">返回协议与声明目录</Link>
        </p>
      </div>
    </div>
  );
}
