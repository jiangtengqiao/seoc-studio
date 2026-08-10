import { useCallback, useEffect, useState, type RefObject } from 'react';
import { useI18n } from '../lib/i18n';

/* ================= 研读计时 ================= */

export function ReadingTimer() {
  const { t } = useI18n();
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') setSecs((s) => s + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);
  const mins = Math.floor(secs / 60);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs text-brand-700">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
      {t('reader.readingTime')} {mins} {t('reader.minutes')}
    </span>
  );
}

/* ================= 阅读里程碑 ================= */

const MILESTONES = [
  { at: 25, text: '已完成 25%，开局顺利，继续保持。' },
  { at: 50, text: '读一半了。研究表明坚持到中段的读者完成率会翻倍。' },
  { at: 75, text: '已完成 75%，最后一段路，一鼓作气。' },
  { at: 99, text: '本期研读完成。建议稍作回顾，再进入下一期。' }
];

export function MilestoneToast({ progress }: { progress: number }) {
  const [shown, setShown] = useState<number[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const hit = MILESTONES.find((m) => progress >= m.at && !shown.includes(m.at));
    if (hit) {
      setShown((s) => [...s, hit.at]);
      setToast(hit.text);
      const id = setTimeout(() => setToast(null), 3600);
      return () => clearTimeout(id);
    }
  }, [progress, shown]);

  if (!toast) return null;
  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-brand-200 bg-white px-5 py-3 text-sm text-brand-800 shadow-lift" style={{ animation: 'rise-in 0.35s ease both' }}>
      <span className="mr-2 font-mono font-bold text-accent-600">◆</span>
      {toast}
    </div>
  );
}

/* ================= 划重点 ================= */

interface Mark {
  text: string;
  at: number;
}

function marksKey(slug: string, issue: number) {
  return `seoc-marks-${slug}-${issue}`;
}

export function useHighlights(slug: string, issue: number, articleRef: RefObject<HTMLElement>) {
  const [marks, setMarks] = useState<Mark[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(marksKey(slug, issue)) || '[]');
    } catch {
      return [];
    }
  });
  const [btn, setBtn] = useState<{ x: number; y: number; text: string } | null>(null);

  useEffect(() => {
    const onUp = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !articleRef.current) {
        setBtn(null);
        return;
      }
      const text = sel.toString().trim();
      if (text.length < 4 || text.length > 120 || !articleRef.current.contains(sel.anchorNode)) {
        setBtn(null);
        return;
      }
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      setBtn({ x: rect.left + rect.width / 2, y: rect.top + window.scrollY - 8, text });
    };
    document.addEventListener('mouseup', onUp);
    return () => document.removeEventListener('mouseup', onUp);
  }, [articleRef]);

  const addMark = useCallback(() => {
    if (!btn) return;
    const next = [...marks.filter((m) => m.text !== btn.text), { text: btn.text, at: Date.now() }];
    setMarks(next);
    localStorage.setItem(marksKey(slug, issue), JSON.stringify(next));
    setBtn(null);
    window.getSelection()?.removeAllRanges();
  }, [btn, marks, slug, issue]);

  const removeMark = useCallback(
    (text: string) => {
      const next = marks.filter((m) => m.text !== text);
      setMarks(next);
      localStorage.setItem(marksKey(slug, issue), JSON.stringify(next));
    },
    [marks, slug, issue]
  );

  return { marks, btn, addMark, removeMark };
}

export function HighlightButton({ btn, onAdd }: { btn: { x: number; y: number } | null; onAdd: () => void }) {
  const { t } = useI18n();
  if (!btn) return null;
  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault();
        onAdd();
      }}
      className="fixed z-50 -translate-x-1/2 -translate-y-full rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-medium text-white shadow-lift hover:bg-brand-600"
      style={{ left: btn.x, top: btn.y }}
    >
      {t('reader.highlight')}
    </button>
  );
}

export function MarksPanel({ marks, onRemove }: { marks: Mark[]; onRemove: (text: string) => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  if (marks.length === 0) return null;
  return (
    <div className="mt-6 rounded-xl border border-accent-400/40 bg-amber-50 p-4">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between text-sm font-semibold text-amber-900">
        <span>
          {t('reader.myMarks')}（{marks.length}）
        </span>
        <span className={`transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && (
        <ul className="mt-3 space-y-2">
          {marks.map((m) => (
            <li key={m.at} className="flex items-start justify-between gap-3 rounded-lg bg-white/70 px-3 py-2 text-xs leading-5 text-amber-900">
              <span>{m.text}</span>
              <button onClick={() => onRemove(m.text)} className="shrink-0 text-amber-500 hover:text-red-500" aria-label="删除">
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ================= 快问快答 ================= */

const QUIZ_BANK = [
  { q: 'Python 的名字来源于什么？', opts: ['一种蟒蛇', '英国喜剧团体 Monty Python', '创始人养的宠物', '希腊神话人物'], a: 1, why: 'Guido van Rossum 是 Monty Python 喜剧团体的爱好者，语言因此得名。' },
  { q: 'Python 中用缩进表达代码块的设计继承自哪门语言？', opts: ['C 语言', 'ABC 语言', 'Pascal', 'Lisp'], a: 1, why: 'ABC 语言用缩进表示代码块，Python 直接继承了这一决定。' },
  { q: 'C++ 最早的名称是什么？', opts: ['C Plus', 'C with Classes', 'Objective C', 'New C'], a: 1, why: 'Bjarne Stroustrup 最初将其命名为 C with Classes，1983 年更名 C++。' },
  { q: '下列哪个不是 Python 的内置数据类型？', opts: ['list', 'dict', 'array', 'tuple'], a: 2, why: 'array 来自标准库 array 模块，list、dict、tuple 才是内置类型。' },
  { q: '“零开销抽象”是哪门语言的核心原则？', opts: ['Python', 'Java', 'C++', 'Go'], a: 2, why: '零开销抽象是 C++ 的设计信条，抽象不应带来运行时额外成本。' },
  { q: 'Python 之禅（The Zen of Python）可以通过哪条语句查看？', opts: ['import zen', 'import this', 'import philosophy', 'python --zen'], a: 1, why: '在解释器中执行 import this 即可看到 Tim Peters 写的十九条格言。' },
  { q: 'HTTP 状态码 404 表示什么？', opts: ['服务器内部错误', '未找到资源', '未授权', '请求超时'], a: 1, why: '404 Not Found 表示服务器上没有找到请求的资源。' },
  { q: '二分查找的时间复杂度是多少？', opts: ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'], a: 1, why: '每次排除一半候选，复杂度为对数级 O(log n)。' },
  { q: 'Git 中用于把本地提交推送到远端仓库的命令是？', opts: ['git pull', 'git fetch', 'git push', 'git merge'], a: 2, why: 'git push 将本地提交上传到远端，pull 与 fetch 是获取。' },
  { q: '下列哪种图最适合表达随时间变化的趋势？', opts: ['饼图', '折线图', '雷达图', '散点矩阵'], a: 1, why: '折线图擅长表达连续时间维度上的趋势与波动。' },
  { q: 'SQL 中用于查询数据的关键字是？', opts: ['GET', 'FIND', 'SELECT', 'QUERY'], a: 2, why: 'SELECT 是 SQL 查询语句的起点。' },
  { q: '神经网络训练中的“学习率”控制的是什么？', opts: ['网络层数', '每次参数更新的步长', '训练数据的批次大小', '神经元数量'], a: 1, why: '学习率决定优化器每次沿梯度方向更新参数的幅度。' }
];

export function QuickQuiz() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * QUIZ_BANK.length));
  const [picked, setPicked] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const item = QUIZ_BANK[idx];

  const next = () => {
    setIdx((i) => (i + 1 + Math.floor(Math.random() * (QUIZ_BANK.length - 1))) % QUIZ_BANK.length);
    setPicked(null);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-accent-500 to-accent-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lift transition hover:scale-105"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01" />
          <circle cx="12" cy="12" r="9" />
        </svg>
        {t('reader.quiz')}
        {streak > 0 && <span className="rounded-full bg-white/25 px-1.5 text-xs">{streak} 连对</span>}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/50 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()} style={{ animation: 'rise-in 0.3s ease both' }}>
            <div className="mb-3 flex items-center justify-between">
              <p className="font-mono text-xs tracking-widest text-accent-600">QUICK QUIZ · 边玩边学</p>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600" aria-label="关闭">✕</button>
            </div>
            <p className="font-semibold text-slate-900">{item.q}</p>
            <div className="mt-4 space-y-2">
              {item.opts.map((opt, i) => {
                const state = picked === null ? 'idle' : i === item.a ? 'right' : i === picked ? 'wrong' : 'idle';
                return (
                  <button
                    key={i}
                    disabled={picked !== null}
                    onClick={() => {
                      setPicked(i);
                      setStreak((s) => (i === item.a ? s + 1 : 0));
                    }}
                    className={`w-full rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                      state === 'right'
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                        : state === 'wrong'
                          ? 'border-red-300 bg-red-50 text-red-700'
                          : 'border-slate-200 hover:border-brand-400 hover:bg-brand-50'
                    }`}
                  >
                    {String.fromCharCode(65 + i)}. {opt}
                  </button>
                );
              })}
            </div>
            {picked !== null && (
              <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                {picked === item.a ? '回答正确。' : '回答错误。'}
                {item.why}
                <button onClick={next} className="btn-primary mt-3 w-full !py-1.5 !text-xs">
                  再来一题
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
