import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader, Spinner } from '../components/ui';
import { CONTACT_EMAIL } from '../lib/types';
import { useAuth } from '../lib/auth';
import { isCloudEnabled, supabase } from '../lib/supabase';
import { ASSESSMENT_LENGTH, DIMENSION_LABELS, QUESTION_BANK, type BankQ } from '../data/questionBank';

interface DrawnQ extends BankQ {
  shuffled: string[];
  correctIdx: number;
}

interface Attempt {
  date: string;
  total: number;
  max: number;
  perDim: Record<BankQ['dim'], { got: number; all: number }>;
  detail: { id: string; q: string; opts: string[]; chosen: number; correct: number; dim: BankQ['dim'] }[];
}

const DIMS = Object.keys(DIMENSION_LABELS) as BankQ['dim'][];
const DAILY_FREE_LIMIT = 2;
const MONTHLY_FREE_LIMIT = 15;

function quotaOf(history: Attempt[]) {
  const now = new Date();
  const dailyUsed = history.filter((h) => {
    const d = new Date(h.date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  }).length;
  const monthlyUsed = history.filter((h) => {
    const d = new Date(h.date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;
  return {
    dailyUsed,
    monthlyUsed,
    dailyLeft: Math.max(0, DAILY_FREE_LIMIT - dailyUsed),
    monthlyLeft: Math.max(0, MONTHLY_FREE_LIMIT - monthlyUsed),
    canStart: dailyUsed < DAILY_FREE_LIMIT && monthlyUsed < MONTHLY_FREE_LIMIT
  };
}

function drawQuestions(n: number): DrawnQ[] {
  const perDim = Math.floor(n / DIMS.length);
  const picked: BankQ[] = [];
  for (const dim of DIMS) {
    const pool = QUESTION_BANK.filter((q) => q.dim === dim);
    for (const d of [1, 2, 3] as const) {
      const tier = pool.filter((q) => q.d === d).sort(() => Math.random() - 0.5);
      picked.push(...tier.slice(0, Math.ceil(perDim / 3)));
    }
    const need = perDim - picked.filter((q) => q.dim === dim).length;
    if (need > 0) {
      const rest = pool.filter((q) => !picked.includes(q)).sort(() => Math.random() - 0.5);
      picked.push(...rest.slice(0, need));
    }
  }
  return picked
    .sort(() => Math.random() - 0.5)
    .slice(0, n)
    .map((q) => {
      const order = q.o.map((t, i) => ({ t, i })).sort(() => Math.random() - 0.5);
      return {
        ...q,
        shuffled: order.map((x) => x.t),
        correctIdx: order.findIndex((x) => x.i === q.a)
      };
    });
}

function lsKey(uid: string) {
  return `seoc.assess.${uid}`;
}

function loadLocal(uid: string): Attempt[] {
  try {
    return JSON.parse(localStorage.getItem(lsKey(uid)) || '[]');
  } catch {
    return [];
  }
}

async function loadAttempts(uid: string): Promise<Attempt[]> {
  if (isCloudEnabled && supabase) {
    const { data } = await supabase
      .from('assessments')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });
    if (data) {
      return data.map((r: Record<string, unknown>) => ({
        date: r.created_at as string,
        ...(r.result as Omit<Attempt, 'date'>)
      }));
    }
  }
  return loadLocal(uid);
}

async function saveAttempt(uid: string, a: Attempt): Promise<void> {
  if (isCloudEnabled && supabase) {
    await supabase.from('assessments').insert({
      user_id: uid,
      answers: { detail: a.detail },
      result: { total: a.total, max: a.max, perDim: a.perDim, detail: a.detail }
    });
    return;
  }
  const list = loadLocal(uid);
  list.unshift(a);
  localStorage.setItem(lsKey(uid), JSON.stringify(list.slice(0, 50)));
}

function verdictOf(ratio: number): { level: string; advice: string[] } {
  if (ratio < 0.35) {
    return {
      level: '起步学习者',
      advice: ['从订阅式项目入手，优先《Python 的起源研究与探索》与《Python 使用指南》。', '专研式可先考虑游戏教程入门级。', '探索式项目暂不适合，打好基础后再来。']
    };
  }
  if (ratio < 0.7) {
    return {
      level: '进阶学习者',
      advice: ['订阅式四部可作为长期参考直接购入。', '专研式按兴趣选图表教程或游戏教程中级与高级。', '想进探索式，先补 Web 与算法，从子项目一（主流库）开始。']
    };
  }
  return {
    level: '高阶学者',
    advice: ['已具备探索式项目条件，可任选 3 个以上子项目。', '推荐组合：后端开发 + AI 应用 + AI 高阶应用，或总期刊包 1159 元（单独购入合计 1318 元）。', '购入后可任选一个学术交流群。']
  };
}

function RadarChart({ perDim, size = 260 }: { perDim: Attempt['perDim']; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 44;
  const N = DIMS.length;
  const pt = (i: number, r: number): [number, number] => {
    const ang = (Math.PI * 2 * i) / N - Math.PI / 2;
    return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)];
  };
  const ring = (f: number) => DIMS.map((_, i) => pt(i, R * f).join(',')).join(' ');
  const values = DIMS.map((d) => (perDim[d]?.all ? perDim[d].got / perDim[d].all : 0));
  const valuePts = values.map((v, i) => pt(i, Math.max(0.06, v) * R).join(',')).join(' ');
  return (
    <svg width={size} height={size} className="mx-auto">
      {[0.33, 0.66, 1].map((f) => (
        <polygon key={f} points={ring(f)} fill="none" stroke="#dbe6fe" strokeWidth="1" />
      ))}
      {DIMS.map((d, i) => {
        const [x2, y2] = pt(i, R);
        const [lx, ly] = pt(i, R + 22);
        return (
          <g key={d}>
            <line x1={cx} y1={cy} x2={x2} y2={y2} stroke="#dbe6fe" />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize="11" fill="#5a6478">
              {DIMENSION_LABELS[d]}
            </text>
          </g>
        );
      })}
      <polygon points={valuePts} fill="rgba(37,84,235,0.25)" stroke="#2554eb" strokeWidth="2" />
      {values.map((v, i) => {
        const [x, y] = pt(i, Math.max(0.06, v) * R);
        return <circle key={i} cx={x} cy={y} r="3.5" fill="#2554eb" />;
      })}
    </svg>
  );
}

export default function Assessment() {
  const { profile, loading } = useAuth();
  const nav = useNavigate();
  const [view, setView] = useState<'intro' | 'quiz' | 'result' | 'history'>('intro');
  const [qs, setQs] = useState<DrawnQ[]>([]);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<(number | null)[]>([]);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [history, setHistory] = useState<Attempt[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!profile) {
      setHistory([]);
      setHistoryLoaded(false);
      return;
    }
    setHistLoading(true);
    loadAttempts(profile.id).then((records) => {
      setHistory(records);
      setHistoryLoaded(true);
      setHistLoading(false);
    });
  }, [profile]);

  const quota = useMemo(() => quotaOf(history), [history]);

  const start = async () => {
    if (!profile) {
      nav('/auth/login?next=' + encodeURIComponent('/assessment'));
      return;
    }
    let records = history;
    if (!historyLoaded) {
      setHistLoading(true);
      records = await loadAttempts(profile.id);
      setHistory(records);
      setHistoryLoaded(true);
      setHistLoading(false);
    }
    if (!quotaOf(records).canStart) return;
    const drawn = drawQuestions(ASSESSMENT_LENGTH);
    setQs(drawn);
    setPicked(Array(drawn.length).fill(null));
    setIdx(0);
    setView('quiz');
  };

  const finish = async () => {
    const perDim = Object.fromEntries(DIMS.map((d) => [d, { got: 0, all: 0 }])) as Attempt['perDim'];
    let total = 0;
    const detail = qs.map((q, i) => {
      const ok = picked[i] === q.correctIdx;
      perDim[q.dim].all += 1;
      if (ok) {
        perDim[q.dim].got += 1;
        total += 1;
      }
      return { id: q.id, q: q.q, opts: q.shuffled, chosen: picked[i] ?? -1, correct: q.correctIdx, dim: q.dim };
    });
    const a: Attempt = { date: new Date().toISOString(), total, max: qs.length, perDim, detail };
    setAttempt(a);
    setView('result');
    if (profile) {
      await saveAttempt(profile.id, a);
      const records = await loadAttempts(profile.id);
      setHistory(records);
      setHistoryLoaded(true);
    }
  };

  const openHistory = async () => {
    if (!profile) {
      nav('/auth/login?next=' + encodeURIComponent('/assessment'));
      return;
    }
    setHistLoading(true);
    setHistory(await loadAttempts(profile.id));
    setHistoryLoaded(true);
    setHistLoading(false);
    setView('history');
  };

  const ratio = attempt ? attempt.total / attempt.max : 0;
  const verdict = verdictOf(ratio);
  const mailBody = useMemo(() => {
    if (!attempt) return '';
    const lines = DIMS.map((d) => `${DIMENSION_LABELS[d]}：${attempt.perDim[d].got}/${attempt.perDim[d].all}`).join('\n');
    return encodeURIComponent(`您好，我完成了官网能力评估。\n评定等级：${verdict.level}\n总得分：${attempt.total}/${attempt.max}\n${lines}\n请为我提供购买指引，谢谢。`);
  }, [attempt]);

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="能力评估中心"
        sub={`动态题库随机抽取 ${ASSESSMENT_LENGTH} 题，覆盖六大维度。每日免费 ${DAILY_FREE_LIMIT} 次，每月免费 ${MONTHLY_FREE_LIMIT} 次，不提供付费加量。购买探索式项目前须完成评估。`}
      />
      <div className="container-x max-w-2xl py-10">
        {view === 'intro' && (
          <div className="space-y-4">
            <div className="card p-8 text-center">
              <h2 className="text-lg font-bold text-brand-950">开始一次新的评估</h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-600">
                系统将从题库中按维度与难度分层抽取 {ASSESSMENT_LENGTH} 道单选题，答题后生成六维能力雷达图，
                历史评估与答题详情永久留存在您的账户中，每次登录均可回看。
              </p>
              <div className="mx-auto mt-5 grid max-w-md grid-cols-2 gap-3 text-left">
                <div className="rounded-xl bg-brand-50 p-4">
                  <p className="text-xs text-slate-500">今日免费额度</p>
                  <p className="mt-1 text-lg font-bold text-brand-800">{quota.dailyLeft} / {DAILY_FREE_LIMIT}</p>
                  <p className="mt-1 text-[11px] text-slate-400">已使用 {quota.dailyUsed} 次</p>
                </div>
                <div className="rounded-xl bg-brand-50 p-4">
                  <p className="text-xs text-slate-500">本月免费额度</p>
                  <p className="mt-1 text-lg font-bold text-brand-800">{quota.monthlyLeft} / {MONTHLY_FREE_LIMIT}</p>
                  <p className="mt-1 text-[11px] text-slate-400">已使用 {quota.monthlyUsed} 次</p>
                </div>
              </div>
              <button className="btn-primary mt-6 !px-8 !py-3" onClick={start} disabled={histLoading || Boolean(profile && !quota.canStart)}>
                {!profile ? '登录后开始评估' : quota.canStart ? '开始评估' : '免费额度已用完'}
              </button>
              <p className="mt-3 text-xs leading-5 text-slate-400">
                评估完全免费，每日 {DAILY_FREE_LIMIT} 次、每月 {MONTHLY_FREE_LIMIT} 次。平台不提供付费加量或额外购买评估次数。
              </p>
              {profile && !quota.canStart && (
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                  请等待明日或下月额度恢复。历史评估与答题详情仍可随时查看。
                </p>
              )}
            </div>
            <button className="btn-outline w-full" onClick={openHistory}>
              {profile ? '查看我的历史评估' : '登录后查看历史评估'}
            </button>
          </div>
        )}

        {view === 'quiz' && qs.length > 0 && (
          <>
            <div className="mb-6">
              <div className="mb-2 flex justify-between text-xs text-slate-500">
                <span>第 {idx + 1} / {qs.length} 题</span>
                <span>已答 {picked.filter((p) => p !== null).length} 题</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500 transition-all duration-500"
                  style={{ width: `${(picked.filter((p) => p !== null).length / qs.length) * 100}%` }}
                />
              </div>
            </div>
            <div key={idx} className="card p-6 sm:p-8" style={{ animation: 'rise-in 0.3s ease both' }}>
              <p className="text-base font-semibold leading-7 text-slate-900">{qs[idx].q}</p>
              <div className="mt-5 grid gap-2.5">
                {qs[idx].shuffled.map((opt, oi) => (
                  <button
                    key={oi}
                    type="button"
                    onClick={() => {
                      const np = [...picked];
                      np[idx] = oi;
                      setPicked(np);
                      setTimeout(() => idx < qs.length - 1 && setIdx(idx + 1), 250);
                    }}
                    className={`group flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card ${
                      picked[idx] === oi ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-slate-200 text-slate-600 hover:border-brand-300'
                    }`}
                    style={{ animation: `rise-in 0.25s ease ${oi * 50}ms both` }}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                        picked[idx] === oi ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-300 text-slate-400'
                      }`}
                    >
                      {picked[idx] === oi ? '✓' : String.fromCharCode(65 + oi)}
                    </span>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between">
              <button className="btn-ghost" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>上一题</button>
              {picked.every((p) => p !== null) ? (
                <button className="btn-primary" onClick={finish}>提交并生成报告</button>
              ) : (
                <span className="text-xs text-slate-400">答完全部题目后提交</span>
              )}
            </div>
          </>
        )}

        {view === 'result' && attempt && (
          <div className="space-y-6" style={{ animation: 'rise-in 0.5s ease both' }}>
            <div className="card p-8 text-center">
              <p className="text-sm text-slate-500">评估等级</p>
              <p className="mt-1 text-3xl font-bold text-brand-800">{verdict.level}</p>
              <p className="mt-2 text-sm text-slate-500">总得分 {attempt.total} / {attempt.max}（{Math.round(ratio * 100)}%）</p>
              <div className="mt-4">
                <RadarChart perDim={attempt.perDim} />
              </div>
              <ul className="mx-auto mt-4 max-w-md list-disc space-y-1.5 pl-5 text-left text-sm leading-6 text-slate-700">
                {verdict.advice.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <a className="btn-primary" href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('能力评估结果与购买指引')}&body=${mailBody}`}>
                  发送结果获取购买指引
                </a>
                <button className="btn-outline" onClick={start} disabled={!quota.canStart}>
                  {quota.canStart ? '再测一次' : '免费额度已用完'}
                </button>
                <button className="btn-ghost" onClick={openHistory}>历史记录</button>
              </div>
              {!profile && (
                <p className="mt-4 text-xs text-amber-600">
                  未登录，本次结果未保存。<Link to="/auth/login?next=%2Fassessment" className="text-brand-600 underline">登录</Link>后评估可永久留存。
                </p>
              )}
            </div>

            <div className="card p-6">
              <h3 className="mb-4 text-base font-semibold text-slate-900">答题详情</h3>
              <ul className="space-y-3">
                {attempt.detail.map((d, i) => {
                  const ok = d.chosen === d.correct;
                  return (
                    <li key={d.id} className={`rounded-xl border p-4 text-sm ${ok ? 'border-emerald-200 bg-emerald-50/50' : 'border-red-200 bg-red-50/50'}`}>
                      <p className="font-medium text-slate-800">
                        <span className={`mr-2 badge ${ok ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{ok ? '正确' : '错误'}</span>
                        {i + 1}. {d.q}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        您的答案：{d.chosen >= 0 ? d.opts[d.chosen] : '未作答'}　正确答案：{d.opts[d.correct]}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}

        {view === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-brand-950">历史评估</h2>
              <button className="btn-primary !py-2" onClick={start} disabled={!quota.canStart}>
                {quota.canStart ? '开始新评估' : '免费额度已用完'}
              </button>
            </div>
            {histLoading ? (
              <Spinner />
            ) : history.length === 0 ? (
              <div className="card p-10 text-center text-sm text-slate-500">暂无历史评估记录。</div>
            ) : (
              history.map((h, i) => {
                const r = h.total / h.max;
                const v = verdictOf(r);
                return (
                  <div key={i} className="card p-5">
                    <button className="flex w-full flex-wrap items-center justify-between gap-3 text-left" onClick={() => setOpenIdx(openIdx === i ? null : i)}>
                      <div>
                        <p className="font-medium text-slate-900">{v.level} · {h.total}/{h.max}</p>
                        <p className="mt-1 text-xs text-slate-400">{new Date(h.date).toLocaleString('zh-CN')}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-brand-500" style={{ width: `${r * 100}%` }} />
                        </div>
                        <span className="text-xs text-slate-400">{openIdx === i ? '收起' : '详情'}</span>
                      </div>
                    </button>
                    {openIdx === i && (
                      <div className="mt-4 border-t border-slate-100 pt-4" style={{ animation: 'rise-in 0.3s ease both' }}>
                        <RadarChart perDim={h.perDim} size={220} />
                        <ul className="mt-4 space-y-2">
                          {h.detail.map((d, j) => {
                            const ok = d.chosen === d.correct;
                            return (
                              <li key={j} className={`rounded-lg border p-3 text-xs ${ok ? 'border-emerald-200 bg-emerald-50/40' : 'border-red-200 bg-red-50/40'}`}>
                                <p className="font-medium text-slate-700">{ok ? '✓' : '✗'} {d.q}</p>
                                <p className="mt-1 text-slate-500">您选：{d.chosen >= 0 ? d.opts[d.chosen] : '未答'}　正确：{d.opts[d.correct]}</p>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
