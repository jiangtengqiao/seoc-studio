import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BENEFIT_TIERS, confirmedSpend, tierState, type BenefitTier } from '../data/benefits';
import { fetchLatestAssessment, type LatestAssessment } from '../lib/benefits';
import { submitInquiry } from '../lib/inquiries';
import { useAuth } from '../lib/auth';
import type { Purchase } from '../lib/types';

const DIM_LABELS: Record<string, string> = {
  py: 'Python 核心',
  cpp: 'C/C++ 基础',
  algo: '数据结构与算法',
  web: 'Web 与网络',
  data: '数据与 AI',
  eng: '工程与实践'
};

function levelOf(ratio: number) {
  if (ratio < 0.35) return '起步学习者';
  if (ratio < 0.7) return '进阶学习者';
  return '高阶学者';
}

function buildArchive(a: LatestAssessment): string {
  const ratio = a.total / a.max;
  const rows = Object.entries(a.perDim)
    .map(([dim, v]) => ({ dim, label: DIM_LABELS[dim] || dim, ratio: v.all ? v.got / v.all : 0, got: v.got, all: v.all }))
    .sort((x, y) => x.ratio - y.ratio);
  const weak = rows.slice(0, 2);
  const strong = rows.slice(-2).reverse();
  const weekPlans = weak.map((w, i) => {
    const start = i * 2 + 1;
    return `第 ${start} 至 ${start + 1} 周：集中补「${w.label}」。每天完成 30 分钟专项练习，每周末产出一个可检查成果。第一周整理概念卡片和错题，第二周完成一个小练习并写 200 字复盘。`;
  });
  return [
    '# SEOC Studio 个人学习档案',
    '',
    `生成时间：${new Date().toLocaleString('zh-CN')}`,
    `最近评估：${new Date(a.date).toLocaleString('zh-CN')}`,
    `评估等级：${levelOf(ratio)}`,
    `总得分：${a.total}/${a.max}（${Math.round(ratio * 100)}%）`,
    '',
    '## 六维结果',
    ...rows.map((r) => `- ${r.label}：${r.got}/${r.all}（${Math.round(r.ratio * 100)}%）`),
    '',
    '## 优先补强方向',
    ...weak.map((r) => `- ${r.label}：当前正确率 ${Math.round(r.ratio * 100)}%，建议优先处理。`),
    '',
    '## 四星期路线',
    ...weekPlans,
    '',
    '## 保持优势',
    ...strong.map((r) => `- ${r.label}：保持每周一次输出，避免只做选择题不落地。`),
    '',
    '## 复测节点',
    '完成四星期路线后进行一次免费复测。复测时重点观察最弱两个维度是否提升，而不是只看总分。'
  ].join('\n');
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function BenefitsPanel({ purchases }: { purchases: Purchase[] }) {
  const { profile } = useAuth();
  const [latest, setLatest] = useState<LatestAssessment | null>(null);
  const [activeTier, setActiveTier] = useState<BenefitTier | null>(null);
  const [message, setMessage] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const spent = useMemo(() => confirmedSpend(purchases), [purchases]);
  const { unlocked, next } = tierState(spent);
  const progressToNext = next ? Math.min(100, (spent / next.threshold) * 100) : 100;

  useEffect(() => {
    if (profile) fetchLatestAssessment(profile.id).then(setLatest);
  }, [profile]);

  async function submitBenefit() {
    if (!profile || !activeTier || message.trim().length < 10) return;
    setState('busy');
    const prefix = activeTier.action === 'diagnosis' ? '[累计回馈-月度路径诊断]' : '[累计回馈-季度项目复盘]';
    const err = await submitInquiry({
      userId: profile.id,
      email: profile.email,
      kind: 'question',
      message: `${prefix}\n当前档位：${activeTier.name}\n${message.trim()}`
    });
    setState(err ? 'error' : 'done');
    if (!err) setMessage('');
  }

  function runAction(tier: BenefitTier) {
    if (spent < tier.threshold) return;
    if (tier.action === 'archive') {
      if (latest) downloadText('SEOC-个人学习档案.md', buildArchive(latest));
      return;
    }
    if (tier.action === 'playbook') return;
    setActiveTier(tier);
    setState('idle');
  }

  return (
    <section className="card p-6 lg:col-span-3">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">累计支持回馈</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            按已确认开通金额累计，回馈全部提供可下载内容或可提交的真实服务，不是空头衔。
          </p>
        </div>
        <div className="min-w-64 flex-1 sm:max-w-sm">
          <div className="flex justify-between text-xs text-slate-500">
            <span>累计确认 ¥{spent.toFixed(0)}</span>
            <span>{next ? `下一档 ¥${next.threshold}` : '已解锁全部回馈'}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500" style={{ width: `${progressToNext}%` }} />
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {BENEFIT_TIERS.map((tier) => {
          const isOpen = unlocked.includes(tier);
          return (
            <article key={tier.name} className={`rounded-xl border p-4 ${isOpen ? 'border-brand-200 bg-brand-50/50' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-900">{tier.name}</p>
                <span className={`badge ${isOpen ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                  {isOpen ? '已解锁' : `¥${tier.threshold}`}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{tier.summary}</p>
              <p className="mt-2 rounded-lg bg-white/80 px-3 py-2 text-xs leading-5 text-slate-500">{tier.deliverable}</p>
              <ul className="mt-3 list-disc space-y-1 pl-4 text-xs leading-5 text-slate-500">
                {tier.details.map((d) => <li key={d}>{d}</li>)}
              </ul>
              {isOpen ? (
                tier.action === 'archive' && !latest ? (
                  <Link to="/assessment" className="btn-outline mt-4 w-full !py-2 !text-xs">先完成一次免费评估</Link>
                ) : tier.action === 'playbook' ? (
                  <a className="btn-primary mt-4 w-full !py-2 !text-xs" href={`${import.meta.env.BASE_URL}benefits/engineering-playbook.md`} download>
                    {tier.actionLabel}
                  </a>
                ) : (
                  <button className="btn-primary mt-4 w-full !py-2 !text-xs" onClick={() => runAction(tier)}>
                    {tier.actionLabel}
                  </button>
                )
              ) : (
                <p className="mt-4 rounded-lg bg-white px-3 py-2 text-center text-xs text-slate-400">
                  还差 ¥{Math.max(0, tier.threshold - spent).toFixed(0)}
                </p>
              )}
            </article>
          );
        })}
      </div>

      {activeTier && (
        <div className="mt-5 rounded-xl border border-brand-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-slate-900">{activeTier.name}申请</p>
              <p className="mt-1 text-xs text-slate-500">请写清目标、当前进度、每周可用时间和最具体的卡点。</p>
            </div>
            <button className="btn-ghost !py-1 !text-xs" onClick={() => setActiveTier(null)}>关闭</button>
          </div>
          <textarea
            className="input mt-3 min-h-28 text-sm"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="例如：我的目标是……目前已经完成……每周可投入……现在最卡的是……"
          />
          <button className="btn-primary mt-3" disabled={state === 'busy' || message.trim().length < 10} onClick={submitBenefit}>
            {state === 'busy' ? '提交中' : '提交回馈申请'}
          </button>
          {state === 'done' && <p className="mt-2 text-xs text-emerald-700">已提交，回复会显示在下方「我的咨询与选购申请」。</p>}
          {state === 'error' && <p className="mt-2 text-xs text-red-600">提交失败，请稍后重试或发送邮件。</p>}
        </div>
      )}
    </section>
  );
}
