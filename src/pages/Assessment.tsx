import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/ui';
import { CONTACT_EMAIL } from '../lib/types';
import { useAuth } from '../lib/auth';

interface Q {
  id: string;
  text: string;
  hint?: string;
  options: { label: string; desc?: string; score: number }[];
}

const QUESTIONS: Q[] = [
  {
    id: 'exp',
    text: '您的编程经验年限',
    hint: '按实际写代码的时间计算，学习理论不计入',
    options: [
      { label: '尚未写过代码', score: 0 },
      { label: '1 年以内', score: 1 },
      { label: '1 至 3 年', score: 2 },
      { label: '3 年以上', score: 3 }
    ]
  },
  {
    id: 'py',
    text: '您对 Python 的掌握程度',
    options: [
      { label: '不了解', score: 0 },
      { label: '能写简单脚本', score: 1 },
      { label: '熟悉面向对象与常用标准库', score: 2 },
      { label: '能独立设计并维护中型项目', score: 3 }
    ]
  },
  {
    id: 'web',
    text: '您是否了解 HTTP 与前后端基本概念',
    options: [
      { label: '不了解', score: 0 },
      { label: '听说过概念', score: 1 },
      { label: '做过简单 Web 项目', score: 2 },
      { label: '独立部署过完整 Web 应用', score: 3 }
    ]
  },
  {
    id: 'algo',
    text: '您对数据结构与算法的掌握程度',
    options: [
      { label: '不了解', score: 0 },
      { label: '了解数组、链表、哈希表', score: 1 },
      { label: '能实现常见排序与查找', score: 2 },
      { label: '熟悉复杂度分析与进阶结构', score: 3 }
    ]
  },
  {
    id: 'ai',
    text: '您对机器学习基础概念的了解',
    options: [
      { label: '不了解', score: 0 },
      { label: '知道训练与推理的区别', score: 1 },
      { label: '用过现成框架训练模型', score: 2 },
      { label: '理解反向传播等底层原理', score: 3 }
    ]
  },
  {
    id: 'time',
    text: '每周可投入的学习时间',
    hint: '诚实作答，这会直接影响推荐门类的强度',
    options: [
      { label: '不足 2 小时', score: 0 },
      { label: '2 至 5 小时', score: 1 },
      { label: '5 至 10 小时', score: 2 },
      { label: '10 小时以上', score: 3 }
    ]
  }
];

interface Verdict {
  level: string;
  tone: string;
  advice: string[];
}

function verdictOf(score: number, max: number): Verdict {
  const ratio = score / max;
  if (ratio < 0.35) {
    return {
      level: '起步学习者',
      tone: 'bg-brand-50 text-brand-800',
      advice: [
        '建议从订阅式项目入手，优先阅读《Python 的起源研究与探索》与《Python 使用指南》。',
        '专研式项目中可先考虑游戏教程入门级。',
        '探索式项目目前不适合您，请打好基础后再来。'
      ]
    };
  }
  if (ratio < 0.7) {
    return {
      level: '进阶学习者',
      tone: 'bg-emerald-50 text-emerald-800',
      advice: [
        '订阅式项目四部均可直接购入，作为长期参考。',
        '专研式项目可根据兴趣选择图表教程或游戏教程的中级与高级。',
        '如计划进入探索式项目，建议先补齐 Web 与算法基础，并从子项目一（主流库）开始。'
      ]
    };
  }
  return {
    level: '高阶学者',
    tone: 'bg-violet-50 text-violet-800',
    advice: [
      '您已具备探索式项目的学习条件，可任选 3 个以上子项目购入。',
      '推荐组合：后端开发 + AI 应用 + AI 高阶应用，或直接选购总期刊包 1313 元。',
      '购入后即可任选一个学术交流群（QQ 群或微信群）。'
    ]
  };
}

export default function Assessment() {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState<'next' | 'prev'>('next');
  const [submitted, setSubmitted] = useState(false);
  const { profile } = useAuth();
  const nav = useNavigate();

  const max = QUESTIONS.length * 3;
  const score = useMemo(() => Object.values(answers).reduce((a, b) => a + b, 0), [answers]);
  const verdict = verdictOf(score, max);
  const q = QUESTIONS[idx];
  const progress = (Object.keys(answers).length / QUESTIONS.length) * 100;
  const mailBody = encodeURIComponent(
    `您好，我完成了官网免费能力评估。\n评定等级：${verdict.level}\n得分：${score}/${max}\n请为我提供购买指引，谢谢。`
  );

  const choose = (s: number) => {
    setAnswers((a) => ({ ...a, [q.id]: s }));
    setDir('next');
    setTimeout(() => {
      if (idx < QUESTIONS.length - 1) setIdx(idx + 1);
    }, 280);
  };

  return (
    <div>
      <PageHeader
        title="免费能力评估"
        sub="探索式项目因其特殊性质，购买前需完成评估。共 6 题，约两分钟，评估完全免费。"
      />
      <div className="container-x max-w-2xl py-10">
        {!submitted ? (
          <>
            <div className="mb-6">
              <div className="mb-2 flex justify-between text-xs text-slate-500">
                <span>第 {idx + 1} / {QUESTIONS.length} 题</span>
                <span>已完成 {Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div key={q.id} className="card p-6 sm:p-8" style={{ animation: `${dir === 'next' ? 'rise-in' : 'rise-in'} 0.35s ease both` }}>
              <p className="text-base font-semibold text-slate-900">{q.text}</p>
              {q.hint && <p className="mt-1 text-xs text-slate-400">{q.hint}</p>}
              <div className="mt-5 grid gap-2.5">
                {q.options.map((o, oi) => {
                  const checked = answers[q.id] === o.score;
                  return (
                    <button
                      key={o.label}
                      type="button"
                      onClick={() => choose(o.score)}
                      className={`group flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card ${
                        checked ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-slate-200 text-slate-600 hover:border-brand-300'
                      }`}
                      style={{ animation: `rise-in 0.3s ease ${oi * 60}ms both` }}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] transition ${
                          checked ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-300 text-slate-400 group-hover:border-brand-400'
                        }`}
                      >
                        {checked ? '✓' : String.fromCharCode(65 + oi)}
                      </span>
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button
                className="btn-ghost"
                disabled={idx === 0}
                onClick={() => {
                  setDir('prev');
                  setIdx(idx - 1);
                }}
              >
                上一题
              </button>
              {Object.keys(answers).length === QUESTIONS.length ? (
                <button
                  className="btn-primary"
                  onClick={() => {
                    if (!profile) {
                      nav('/auth/login?next=' + encodeURIComponent('/assessment'));
                      return;
                    }
                    setSubmitted(true);
                  }}
                >
                  {profile ? '生成评估结果' : '登录后生成结果'}
                </button>
              ) : (
                <span className="text-xs text-slate-400">答完全部题目后生成结果</span>
              )}
            </div>
            {!profile && (
              <p className="mt-3 text-center text-xs text-slate-500">
                评估结果需要登录后生成并保存到您的账户。
                <Link to="/auth/register" className="text-brand-600 hover:underline">免费注册</Link>
              </p>
            )}
          </>
        ) : (
          <section className={`rounded-2xl p-8 ${verdict.tone}`} style={{ animation: 'rise-in 0.5s ease both' }}>
            <p className="text-sm">评估结果</p>
            <p className="mt-1 text-3xl font-bold">{verdict.level}</p>
            <p className="mt-1 text-sm">得分 {score} / {max}</p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/50">
              <div
                className="h-full rounded-full bg-current opacity-60 transition-all duration-1000"
                style={{ width: `${(score / max) * 100}%` }}
              />
            </div>
            <ul className="mt-5 list-disc space-y-1.5 pl-5 text-sm leading-6">
              {verdict.advice.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                className="btn-primary"
                href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('能力评估结果与购买指引')}&body=${mailBody}`}
              >
                发送结果获取购买指引
              </a>
              <button className="btn-outline" onClick={() => { setSubmitted(false); setAnswers({}); setIdx(0); }}>
                重新评估
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
