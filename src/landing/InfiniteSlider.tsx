import { useState } from 'react';

interface SlideCard {
  title: string;
  desc: string;
  icon: JSX.Element;
  to: string;
}

const SLIDES: SlideCard[] = [
  {
    title: 'Python 起源',
    desc: '追根溯源的语言研究',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2C8 2 8 5 8 7v2h4v2H6c-2 0-3 2-3 4s1 4 3 4 2-1 2-3v-2h4" />
        <path d="M12 22c4 0 4-3 4-5v-2h-4v-2h6c2 0 3-2 3-4s-1-4-3-4-2 1-2 3v2h-4" />
      </svg>
    ),
    to: '/product/python-origin',
  },
  {
    title: '可训练 AI',
    desc: '从零实现系列教程',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
      </svg>
    ),
    to: '/product/python-ai',
  },
  {
    title: '主流库全景',
    desc: '库与应用对照',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <path d="M9 7h6M9 11h6" />
      </svg>
    ),
    to: '/product/python-libs',
  },
  {
    title: '图表表达',
    desc: '出版级可视化',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" />
        <path d="M7 14l4-4 3 3 5-6" />
      </svg>
    ),
    to: '/products/exploration',
  },
  {
    title: '能力评估',
    desc: '六维动态出题',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
    to: '/assessment',
  },
];

const GROUP = 5;
// 3 组相同的卡片实现无限循环
const LOOP = [...SLIDES, ...SLIDES, ...SLIDES];
const CARD_W = 280;
const GAP = 24;
const STEP = CARD_W + GAP;

/**
 * 无限循环滑块（cinema slider layer）
 * - 3 组相同卡片，activeIndex 控制偏移
 * - 边界无感重置（transition: none）
 * - 控制按钮（左/右箭头），悬浮强调色边框
 */
export default function InfiniteSlider() {
  const [active, setActive] = useState(GROUP);
  const [noAnim, setNoAnim] = useState(false);

  const go = (dir: -1 | 1) => {
    setNoAnim(false);
    setActive((a) => a + dir);
  };

  const onTransitionEnd = () => {
    if (active <= 0) {
      setNoAnim(true);
      setActive(GROUP);
    } else if (active >= LOOP.length - GROUP) {
      setNoAnim(true);
      setActive(GROUP);
    }
  };

  return (
    <div className="relative z-10 flex h-full flex-col items-center justify-center px-4">
      {/* 头部 */}
      <div className="mb-10 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <span className="w-8 h-px bg-stroke" />
          <span className="text-xs text-muted uppercase tracking-[0.3em]">热门工具</span>
          <span className="w-8 h-px bg-stroke" />
        </div>
        <h2 className="text-4xl md:text-6xl font-body text-text-primary">
          热门 <span className="font-display italic text-accent">工具</span>
        </h2>
        <p className="text-sm text-muted mt-3">快速访问常用资源</p>
      </div>

      {/* 滑块轨道 */}
      <div className="w-full max-w-5xl overflow-hidden">
        <div
          className="flex gap-6"
          style={{
            transform: `translateX(calc(-${active * STEP}px + 50% - ${CARD_W / 2}px))`,
            transition: noAnim ? 'none' : 'transform 640ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
          onTransitionEnd={onTransitionEnd}
        >
          {LOOP.map((s, i) => (
            <a
              key={i}
              href={s.to}
              className="landing-card group relative flex shrink-0 flex-col items-start justify-between rounded-3xl p-7"
              style={{ width: `${CARD_W}px`, height: '320px' }}
            >
              <div>
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-bg/60 text-accent mb-5 group-hover:scale-110 transition-transform duration-300">
                  {s.icon}
                </span>
                <h3 className="text-lg font-body text-text-primary mb-2">{s.title}</h3>
                <p className="text-xs text-muted leading-relaxed">{s.desc}</p>
              </div>
              <span className="flex items-center gap-1.5 text-xs text-accent uppercase tracking-wider group-hover:translate-x-1 transition-transform">
                进入
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* 控制按钮 */}
      <div className="cinema-controls-layer mt-10 flex items-center gap-5">
        <button
          onClick={() => go(-1)}
          aria-label="上一个"
          className="accent-ring group relative flex h-12 w-12 items-center justify-center rounded-full border border-stroke bg-surface text-text-primary hover:scale-110 hover:border-accent transition-all"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span className="text-xs text-muted tabular-nums">
          {String(((active - GROUP) % GROUP + GROUP) % GROUP + 1).padStart(2, '0')} / {String(GROUP).padStart(2, '0')}
        </span>
        <button
          onClick={() => go(1)}
          aria-label="下一个"
          className="accent-ring group relative flex h-12 w-12 items-center justify-center rounded-full border border-stroke bg-surface text-text-primary hover:scale-110 hover:border-accent transition-all"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
