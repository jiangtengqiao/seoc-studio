import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import {
  getMyResponse, getSurvey, listSurveys, submitResponse,
  type SurveyAnswers, type SurveyDef, type SurveyMeta, type SurveyQuestion
} from '../lib/surveys';
import { EmptyState, PageHeader, Spinner } from '../components/ui';

const KIND_LABEL: Record<SurveyQuestion['kind'], string> = {
  single: '单选',
  multi: '多选',
  ranking: '排序',
  text: '开放'
};

function fmtDate(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
}

/* ================= 问卷中心列表 ================= */

export function SurveysPage() {
  const { profile } = useAuth();
  const [items, setItems] = useState<SurveyMeta[] | null>(null);
  const [answered, setAnswered] = useState<Set<string>>(new Set());

  useEffect(() => {
    listSurveys().then(async (list) => {
      setItems(list);
      if (profile) {
        const done = new Set<string>();
        await Promise.all(list.map(async (s) => {
          if (await getMyResponse(s.slug, profile.id)) done.add(s.slug);
        }));
        setAnswered(done);
      }
    });
  }, [profile]);

  if (!items) return <Spinner text="正在加载问卷中心" />;

  return (
    <div>
      <PageHeader
        title="问卷中心"
        sub="您的每一个选项都会直接驱动 SEOC Studio 的迭代优先级。所有数据严格保密，仅用于产品优化。登录后即可参与作答，每份问卷仅可提交一次。"
      />
      <div className="container-x grid gap-5 py-10 sm:grid-cols-2">
        {items.map((s) => (
          <div key={s.slug} className="card flex flex-col gap-3 p-6 transition hover:-translate-y-0.5 hover:shadow-lift">
            <div className="flex items-center gap-2">
              <span className="badge bg-brand-50 text-brand-700">{s.sectionCount} 个模块</span>
              <span className="badge bg-slate-100 text-slate-600">{s.questionCount} 题</span>
              {s.builtin && <span className="badge bg-accent-50 text-accent-600">官方问卷</span>}
              {answered.has(s.slug) && <span className="badge bg-emerald-50 text-emerald-600">已完成</span>}
            </div>
            <h3 className="text-lg font-semibold leading-7 text-slate-900">{s.title}</h3>
            <p className="text-sm leading-6 text-slate-500">
              预计用时 {Math.max(3, Math.round(s.questionCount * 0.4))} 分钟
              {typeof s.responseCount === 'number' && s.responseCount > 0 && ` · 已回收 ${s.responseCount} 份`}
              {s.createdAt && ` · ${fmtDate(s.createdAt)}`}
            </p>
            <div className="mt-auto pt-2">
              {profile ? (
                <Link to={`/surveys/${s.slug}`} className={answered.has(s.slug) ? 'btn-outline' : 'btn-primary'}>
                  {answered.has(s.slug) ? '查看我的答卷' : '开始作答'}
                </Link>
              ) : (
                <Link to="/auth/login" className="btn-primary">登录后作答</Link>
              )}
            </div>
          </div>
        ))}
        {items.length === 0 && <EmptyState title="暂无进行中的问卷" hint="请稍后再来看看" />}
      </div>
    </div>
  );
}

/* ================= 作答页 ================= */

function OptionCard({ selected, onClick, children, badge }: { selected: boolean; onClick: () => void; children: React.ReactNode; badge?: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm leading-6 transition ${
        selected
          ? 'border-brand-500 bg-brand-50 text-brand-900 shadow-sm'
          : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50/40'
      }`}
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
          selected ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 bg-white group-hover:border-brand-400'
        }`}
      >
        {selected && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
            <path d="M5 13l4 4L19 7" />
          </svg>
        )}
      </span>
      <span className="flex-1">{children}</span>
      {badge}
    </button>
  );
}

function RankingPicker({ q, value, onChange }: { q: SurveyQuestion; value: string[]; onChange: (v: string[]) => void }) {
  const pick = (opt: string) => {
    if (value.includes(opt)) onChange(value.filter((v) => v !== opt));
    else onChange([...value, opt]);
  };
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-400">按重要程度从高到低依次点击选项，再次点击可取消。</p>
      {q.options.map((opt) => {
        const idx = value.indexOf(opt);
        return (
          <OptionCard key={opt} selected={idx >= 0} onClick={() => pick(opt)}
            badge={idx >= 0 ? <span className="badge bg-brand-600 text-white">第 {idx + 1} 位</span> : undefined}>
            {opt}
          </OptionCard>
        );
      })}
      {value.length > 0 && (
        <button type="button" className="btn-ghost text-xs" onClick={() => onChange([])}>清空重排</button>
      )}
    </div>
  );
}

export function SurveyDetailPage() {
  const { slug } = useParams();
  const { profile } = useAuth();
  const [def, setDef] = useState<SurveyDef | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<SurveyAnswers>({});
  const [readonly, setReadonly] = useState(false);
  const [submittedAt, setSubmittedAt] = useState('');
  const [missing, setMissing] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState('');
  const qRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const sRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const d = await getSurvey(slug);
      setDef(d);
      if (d && profile) {
        const mine = await getMyResponse(slug, profile.id);
        if (mine) {
          setAnswers(mine.answers);
          setReadonly(true);
          setSubmittedAt(mine.createdAt);
        }
      }
      setLoading(false);
    })();
  }, [slug, profile]);

  const flat = useMemo(() => {
    if (!def) return [] as { q: SurveyQuestion; no: number; sectionId: string }[];
    let no = 0;
    return def.sections.flatMap((s) => s.questions.map((q) => ({ q, no: ++no, sectionId: s.id })));
  }, [def]);

  const total = flat.length;
  const answeredCount = useMemo(
    () => flat.filter(({ q }) => {
      const v = answers[q.id];
      return Array.isArray(v) ? v.length > 0 : Boolean(v && String(v).trim());
    }).length,
    [flat, answers]
  );
  const pct = total ? Math.round((answeredCount / total) * 100) : 0;

  // 滚动监听：高亮当前分节
  useEffect(() => {
    if (!def) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        let current = def.sections[0]?.id || '';
        for (const s of def.sections) {
          const el = sRefs.current[s.id];
          if (el && el.getBoundingClientRect().top < 140) current = s.id;
        }
        setActiveSection(current);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [def]);

  const setAnswer = useCallback((qid: string, v: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [qid]: v }));
    setMissing((prev) => {
      if (!prev.has(qid)) return prev;
      const next = new Set(prev);
      next.delete(qid);
      return next;
    });
  }, []);

  const sectionDone = useCallback((sectionId: string) => {
    const qs = flat.filter((f) => f.sectionId === sectionId);
    return qs.every(({ q }) => {
      const v = answers[q.id];
      return q.optional || (Array.isArray(v) ? v.length > 0 : Boolean(v && String(v).trim()));
    });
  }, [flat, answers]);

  const onSubmit = async () => {
    if (!def || !profile || !slug) return;
    const missed = new Set<string>();
    for (const { q } of flat) {
      if (q.optional) continue;
      const v = answers[q.id];
      const ok = Array.isArray(v) ? v.length > 0 : Boolean(v && String(v).trim());
      if (!ok) missed.add(q.id);
    }
    if (missed.size > 0) {
      setMissing(missed);
      const first = flat.find(({ q }) => missed.has(q.id));
      if (first) qRefs.current[first.q.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setError(`还有 ${missed.size} 道必答题未作答，已为您定位到第一题`);
      return;
    }
    setError('');
    setSubmitting(true);
    const r = await submitResponse(slug, profile.id, answers);
    setSubmitting(false);
    if (r.ok) {
      setDone(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setError(r.message);
    }
  };

  if (loading) return <Spinner text="正在加载问卷" />;
  if (!def) return <div className="container-x py-10"><EmptyState title="问卷不存在或已关闭" hint="返回问卷中心看看其他问卷" /></div>;

  if (!profile) {
    return (
      <div>
        <PageHeader title={def.title} sub="本问卷需要登录后作答，以便留存您的反馈并提供后续回馈。" />
        <div className="container-x py-10">
          <EmptyState title="请先登录" hint="登录后即可参与问卷，每份问卷仅可作答一次" />
          <div className="mt-4 text-center">
            <Link to="/auth/login" className="btn-primary">前往登录</Link>
          </div>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="container-x max-w-2xl py-20 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M4 12.5l5 5L20 6.5" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-brand-950">提交成功，感谢您的认真作答</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          您的 {total} 道回答已全部记录，将直接驱动 SEOC Studio 下一阶段的迭代优先级。
          完整作答者将在后续获得隐藏试读章节等专属回馈，请留意站内公告与邮件通知。
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/surveys" className="btn-outline">返回问卷中心</Link>
          <Link to="/" className="btn-primary">回到首页</Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* 顶部进度条 */}
      <div className="sticky top-16 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="container-x flex items-center gap-4 py-2.5">
          <span className="shrink-0 text-xs font-medium text-slate-600">
            {readonly ? '我的答卷' : `作答进度 ${answeredCount}/${total}`}
          </span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500 transition-all duration-500"
              style={{ width: `${readonly ? 100 : pct}%` }}
            />
          </div>
          <span className="shrink-0 font-mono text-xs text-brand-700">{readonly ? '100' : pct}%</span>
        </div>
      </div>

      <div className="container-x grid gap-8 py-10 lg:grid-cols-[220px_1fr]">
        {/* 分节导航 */}
        <aside className="hidden lg:block">
          <div className="sticky top-32 space-y-1">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">问卷模块</p>
            {def.sections.map((s, i) => {
              const doneSec = sectionDone(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => sRefs.current[s.id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs leading-5 transition ${
                    activeSection === s.id ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    doneSec ? 'bg-emerald-500 text-white' : activeSection === s.id ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {doneSec ? '✓' : i + 1}
                  </span>
                  <span className="line-clamp-2">{s.title}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* 问卷主体 */}
        <div className="max-w-3xl">
          <header className="card border-brand-100 bg-gradient-to-br from-white to-brand-50/50 p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge bg-brand-50 text-brand-700">{def.sections.length} 个模块</span>
              <span className="badge bg-slate-100 text-slate-600">{total} 题</span>
              <span className="badge bg-amber-50 text-amber-700">预计 {Math.max(3, Math.round(total * 0.4))} 分钟</span>
              {readonly && <span className="badge bg-emerald-50 text-emerald-600">已于 {fmtDate(submittedAt)} 提交</span>}
            </div>
            <h1 className="mt-3 text-xl font-bold leading-8 text-brand-950">{def.title}</h1>
            {def.intro.map((p, i) => (
              <p key={i} className="mt-2 text-sm leading-7 text-slate-600">{p}</p>
            ))}
          </header>

          {def.sections.map((s) => (
            <section
              key={s.id}
              ref={(el) => { sRefs.current[s.id] = el; }}
              className="mt-10 scroll-mt-32"
            >
              <div className="mb-4 border-l-4 border-brand-500 pl-4">
                <h2 className="text-lg font-bold text-brand-950">{s.title}</h2>
                {s.desc && <p className="mt-1 text-sm leading-6 text-slate-500">{s.desc}</p>}
              </div>
              <div className="space-y-4">
                {s.questions.map((q) => {
                  const meta = flat.find((f) => f.q.id === q.id)!;
                  const v = answers[q.id];
                  const isMissing = missing.has(q.id);
                  return (
                    <div
                      key={q.id}
                      ref={(el) => { qRefs.current[q.id] = el; }}
                      className={`card scroll-mt-36 p-5 transition ${isMissing ? 'border-red-300 ring-2 ring-red-100' : ''}`}
                    >
                      <div className="mb-3 flex items-start gap-2.5">
                        <span className="mt-0.5 shrink-0 font-mono text-sm font-bold text-brand-600">Q{meta.no}</span>
                        <div>
                          <p className="text-[15px] font-medium leading-7 text-slate-900">{q.text}</p>
                          <p className="mt-1 flex gap-2 text-xs text-slate-400">
                            <span>{KIND_LABEL[q.kind]}</span>
                            {q.optional ? <span className="text-slate-300">选填</span> : <span className="text-red-400">必答</span>}
                            {isMissing && <span className="text-red-500">此题还未作答</span>}
                          </p>
                        </div>
                      </div>

                      {q.kind === 'single' && (
                        <div className="space-y-2">
                          {q.options.map((opt) => (
                            <OptionCard key={opt} selected={v === opt}
                              onClick={() => { if (!readonly) setAnswer(q.id, opt); }}>
                              {opt}
                            </OptionCard>
                          ))}
                        </div>
                      )}

                      {q.kind === 'multi' && (
                        <div className="space-y-2">
                          {q.options.map((opt) => {
                            const arr = Array.isArray(v) ? v : [];
                            const on = arr.includes(opt);
                            return (
                              <OptionCard key={opt} selected={on}
                                onClick={() => {
                                  if (readonly) return;
                                  setAnswer(q.id, on ? arr.filter((x) => x !== opt) : [...arr, opt]);
                                }}>
                                {opt}
                              </OptionCard>
                            );
                          })}
                        </div>
                      )}

                      {q.kind === 'ranking' && (
                        readonly ? (
                          <ol className="space-y-2">
                            {(Array.isArray(v) ? v : []).map((opt, i) => (
                              <li key={opt} className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm">
                                <span className="badge bg-brand-600 text-white">第 {i + 1} 位</span>{opt}
                              </li>
                            ))}
                          </ol>
                        ) : (
                          <RankingPicker q={q} value={Array.isArray(v) ? v : []} onChange={(nv) => setAnswer(q.id, nv)} />
                        )
                      )}

                      {q.kind === 'text' && (
                        <textarea
                          className="input min-h-[110px] resize-y"
                          placeholder={readonly ? '' : '请畅所欲言，您的真知灼见是我们最宝贵的资产…'}
                          value={typeof v === 'string' ? v : ''}
                          readOnly={readonly}
                          onChange={(e) => setAnswer(q.id, e.target.value)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          {!readonly && (
            <div className="sticky bottom-4 mt-10">
              <div className="card flex flex-col items-center gap-3 border-brand-100 p-5 shadow-lift sm:flex-row sm:justify-between">
                <p className="text-sm text-slate-600">
                  {error ? <span className="text-red-600">{error}</span> : `已完成 ${answeredCount}/${total} 题，选填题可留空`}
                </p>
                <button className="btn-primary px-8" disabled={submitting} onClick={onSubmit}>
                  {submitting ? '提交中…' : '提交问卷'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
