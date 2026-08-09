import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { fetchIssue, fetchPurchases, hasAccess } from '../lib/content';
import { getProduct } from '../data/products';
import { useAuth } from '../lib/auth';
import type { Issue } from '../lib/types';
import { EmptyState, Spinner } from '../components/ui';

export default function Reader() {
  const { slug, issue } = useParams();
  const issueNo = Number(issue || 1);
  const product = slug ? getProduct(slug) : undefined;
  const { profile, loading } = useAuth();
  const [data, setData] = useState<Issue | null | undefined>(undefined);
  const [owned, setOwned] = useState(false);
  const [readProgress, setReadProgress] = useState(0);
  const [focus, setFocus] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      setReadProgress(Math.min(100, (h.scrollTop / (h.scrollHeight - h.clientHeight || 1)) * 100));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!slug) return;
    fetchIssue(slug, issueNo).then((d) => setData(d));
  }, [slug, issueNo]);

  useEffect(() => {
    if (!profile || !slug) return;
    fetchPurchases(profile.id).then((ps) => setOwned(hasAccess(ps, slug)));
  }, [profile, slug]);

  if (!product) {
    return (
      <div className="container-x py-16">
        <EmptyState title="未找到该项目" />
      </div>
    );
  }

  if (loading || data === undefined) return <Spinner text="正在载入期刊" />;

  if (!profile) {
    return (
      <div className="container-x max-w-xl py-16">
        <EmptyState title="请先登录" hint="登录后即可阅读已开通的内容。" />
        <div className="mt-4 text-center">
          <Link to="/auth/login" className="btn-primary">前往登录</Link>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container-x max-w-xl py-16">
        <EmptyState title="该期尚未发布" hint="连载中的期次将在发布后自动出现在目录中。" />
        <div className="mt-4 text-center">
          <Link to={`/product/${product.slug}`} className="btn-outline">返回目录</Link>
        </div>
      </div>
    );
  }

  const isPreview = !owned && issueNo === 1;
  if (!owned && !isPreview) {
    return (
      <div className="container-x max-w-xl py-16">
        <EmptyState title="尚未开通本项目" hint="首期可供注册用户试读，其余期次开通后永久查阅。" />
        <div className="mt-4 text-center">
          <Link to={`/product/${product.slug}`} className="btn-primary">查看项目详情</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`container-x py-10 transition-all duration-500 ${focus ? 'max-w-2xl' : 'max-w-3xl'}`}>
      <div className="fixed left-0 top-16 z-40 h-1 bg-gradient-to-r from-brand-500 to-accent-500 transition-[width] duration-150" style={{ width: `${readProgress}%` }} />
      <nav className="mb-6 text-sm text-slate-500">
        <Link to={`/product/${product.slug}`} className="hover:text-brand-600">{product.title}</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-800">第 {issueNo} 期 · {data.title}</span>
      </nav>
      {isPreview && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent-400/40 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span>试读模式：您正在免费阅读首期正文，后续期次需开通。</span>
          <Link to={`/product/${product.slug}`} className="font-medium text-accent-600 hover:underline">立即开通</Link>
        </div>
      )}
      <div className="mb-4 flex justify-end">
        <button className="btn-ghost !text-xs" onClick={() => setFocus(!focus)}>
          {focus ? '退出专注模式' : '专注模式'}
        </button>
      </div>
      <article className="card p-6 sm:p-10" style={{ animation: 'rise-in 0.5s ease both' }}>
        <header className="mb-6 border-b border-slate-100 pb-5">
          <h1 className="text-2xl font-bold text-brand-950">{data.title}</h1>
          <p className="mt-2 text-xs text-slate-400">
            {product.title} · 第 {issueNo} 期 · 全文约 {data.word_count || '—'} 字 · {data.lang}
          </p>
        </header>
        <div className="prose-seoc">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.content_md}</ReactMarkdown>
        </div>
        {data.patches.length > 0 && (
          <section className="mt-10 rounded-xl border border-accent-400/40 bg-amber-50 p-5">
            <h2 className="text-sm font-semibold text-amber-900">本期补丁</h2>
            <ul className="mt-2 space-y-3">
              {data.patches.map((p, i) => (
                <li key={i}>
                  <p className="text-sm font-medium text-amber-900">{p.title}</p>
                  <p className="text-sm leading-6 text-amber-800">{p.body}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
      <div className="mt-6 flex justify-between text-sm">
        {issueNo > 1 ? (
          <Link className="btn-outline" to={`/reader/${product.slug}/${issueNo - 1}`}>上一期</Link>
        ) : (
          <span />
        )}
        {issueNo < (product.issuesTotal || 1) && (
          <Link className="btn-outline" to={`/reader/${product.slug}/${issueNo + 1}`}>下一期</Link>
        )}
      </div>
    </div>
  );
}
