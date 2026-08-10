import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { fetchIssue, fetchPurchases, hasAccess } from '../lib/content';
import { getProduct } from '../data/products';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';
import type { Issue } from '../lib/types';
import { EmptyState, Spinner } from '../components/ui';
import ContentGuard from '../components/ContentGuard';
import { HighlightButton, MarksPanel, MilestoneToast, QuickQuiz, ReadingTimer, useHighlights } from '../components/ReaderPlay';
import { createHeadingComponents, extractToc, TocMobile, TocSidebar } from '../components/TocNav';

export default function Reader() {
  const { slug, issue } = useParams();
  const issueNo = Number(issue || 1);
  const product = slug ? getProduct(slug) : undefined;
  const { profile, loading } = useAuth();
  const { t } = useI18n();
  const [data, setData] = useState<Issue | null | undefined>(undefined);
  const [owned, setOwned] = useState(false);
  const [readProgress, setReadProgress] = useState(0);
  const [focus, setFocus] = useState(false);
  const articleRef = useRef<HTMLElement>(null);
  const toc = useMemo(() => (data ? extractToc(data.content_md) : []), [data]);
  const mdComponents = useMemo(() => createHeadingComponents(toc), [toc]);
  const { marks, btn, addMark, removeMark } = useHighlights(slug || '', issueNo, articleRef);

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
    setData(undefined);
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
        <EmptyState title={t('common.loginFirst')} hint="登录后即可阅读已开通的内容。" />
        <div className="mt-4 text-center">
          <Link to="/auth/login" className="btn-primary">{t('nav.login')}</Link>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container-x max-w-xl py-16">
        <EmptyState title="该期尚未发布" hint="连载中的期次将在发布后自动出现在目录中。" />
        <div className="mt-4 text-center">
          <Link to={`/product/${product.slug}`} className="btn-outline">{t('reader.backToToc')}</Link>
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

  const total = product.issuesTotal || product.toc.length || 1;
  const prevPlan = issueNo > 1 ? product.toc[issueNo - 2] : undefined;
  const nextPlan = issueNo < total ? product.toc[issueNo] : undefined;

  return (
    <div className={`container-x py-10 transition-all duration-500 ${focus ? 'max-w-2xl' : 'max-w-5xl'}`}>
      <div className="fixed left-0 top-16 z-40 h-1 bg-gradient-to-r from-brand-500 to-accent-500 transition-[width] duration-150" style={{ width: `${readProgress}%` }} />
      <MilestoneToast progress={readProgress} />
      <HighlightButton btn={btn} onAdd={addMark} />
      <QuickQuiz />

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

      <div className="mb-4 flex items-center justify-between">
        <ReadingTimer />
        <button className="btn-ghost !text-xs" onClick={() => setFocus(!focus)}>
          {focus ? t('reader.exitFocus') : t('reader.focus')}
        </button>
      </div>

      <TocMobile toc={toc} />
      <div className="flex items-start gap-8">
        <div className="min-w-0 flex-1">
      <ContentGuard>
        <article ref={articleRef} className="card p-6 sm:p-10" style={{ animation: 'rise-in 0.5s ease both' }}>
          <header className="mb-6 border-b border-slate-100 pb-5">
            <h1 className="text-2xl font-bold text-brand-950">{data.title}</h1>
            <p className="mt-2 text-xs text-slate-400">
              {product.title} · 第 {issueNo} 期 · 全文约 {data.word_count || '—'} 字 · {data.lang}
            </p>
          </header>
          <div className="prose-seoc">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
              {data.content_md}
            </ReactMarkdown>
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
      </ContentGuard>
        </div>
        <TocSidebar toc={toc} />
      </div>

      <MarksPanel marks={marks} onRemove={removeMark} />

      {/* 章节指引 */}
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {issueNo > 1 ? (
          <Link
            to={`/reader/${product.slug}/${issueNo - 1}`}
            className="card group p-4 text-left transition hover:border-brand-400"
          >
            <p className="text-xs text-slate-400">← {t('reader.prev')}</p>
            <p className="mt-1 text-sm font-medium text-slate-800 group-hover:text-brand-700">
              第 {issueNo - 1} 期{prevPlan ? ` · ${prevPlan.title}` : ''}
            </p>
          </Link>
        ) : (
          <Link to={`/product/${product.slug}`} className="card group p-4 text-left transition hover:border-brand-400">
            <p className="text-xs text-slate-400">← {t('reader.backToToc')}</p>
            <p className="mt-1 text-sm font-medium text-slate-800 group-hover:text-brand-700">{product.title}</p>
          </Link>
        )}
        {issueNo < total ? (
          <Link
            to={`/reader/${product.slug}/${issueNo + 1}`}
            className="card group p-4 text-right transition hover:border-brand-400"
          >
            <p className="text-xs text-slate-400">{t('reader.next')} →</p>
            <p className="mt-1 text-sm font-medium text-slate-800 group-hover:text-brand-700">
              第 {issueNo + 1} 期{nextPlan ? ` · ${nextPlan.title}` : ''}
            </p>
          </Link>
        ) : (
          <Link to={`/product/${product.slug}`} className="card group p-4 text-right transition hover:border-brand-400">
            <p className="text-xs text-slate-400">{t('reader.backToToc')} →</p>
            <p className="mt-1 text-sm font-medium text-slate-800 group-hover:text-brand-700">已读完最新一期，查看完整目录</p>
          </Link>
        )}
      </div>

      {/* 目录速览 */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-3 text-xs font-semibold tracking-wider text-slate-400">本项目目录</p>
        <ol className="grid gap-1.5 sm:grid-cols-2">
          {product.toc.map((plan) => (
            <li key={plan.no}>
              <Link
                to={`/reader/${product.slug}/${plan.no}`}
                className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition ${
                  plan.no === issueNo ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="font-mono text-[10px] text-slate-400">{String(plan.no).padStart(2, '0')}</span>
                {plan.title}
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
