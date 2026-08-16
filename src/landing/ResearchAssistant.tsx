import { Link } from 'react-router-dom';

interface Dimension {
  name: string;
  desc: string;
  icon: JSX.Element;
  factor: number;
}

const DIMENSIONS: Dimension[] = [
  {
    name: '语法',
    desc: 'Syntax',
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 4l-6 8 6 8M16 4l6 8-6 8" />
      </svg>
    ),
    factor: 1.0,
  },
  {
    name: '逻辑',
    desc: 'Logic',
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 21l5-5 5 5M7 3l5 5 5-5" />
        <path d="M12 8v8" />
      </svg>
    ),
    factor: 1.4,
  },
  {
    name: '算法',
    desc: 'Algorithm',
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="6" r="3" />
        <circle cx="18" cy="6" r="3" />
        <circle cx="12" cy="18" r="3" />
        <path d="M8 8l3 8M16 8l-3 8M9 6h6" />
      </svg>
    ),
    factor: 0.7,
  },
  {
    name: '调试',
    desc: 'Debug',
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="8" y="6" width="8" height="14" rx="4" />
        <path d="M8 10H4M8 14H4M8 18H4M20 10h-4M20 14h-4M20 18h-4M12 6V3" />
      </svg>
    ),
    factor: 1.2,
  },
  {
    name: '设计',
    desc: 'Design',
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3v18M3 12h18" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
    factor: 0.9,
  },
  {
    name: '性能',
    desc: 'Performance',
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a9 9 0 1 1-9-9" />
        <path d="M21 3l-7 7" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      </svg>
    ),
    factor: 1.5,
  },
];

/**
 * 研智助手 & 能力评估（cinema assistant layer）
 * - 中央固定：眉标 / 标题 / 副文本 / CTA
 * - 视差列：六大维度卡片，由 --assistant-y 派生不同位移
 */
export default function ResearchAssistant() {
  return (
    <div className="relative z-10 flex h-full items-center justify-center px-4 overflow-hidden">
      {/* 视差列：六大维度 */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="grid grid-cols-2 gap-8 md:gap-16 lg:gap-32 max-w-[1200px] w-full px-4">
          {DIMENSIONS.map((d, i) => (
            <div
              key={d.name}
              className="pointer-events-auto aspect-square max-w-[160px] md:max-w-[220px] lg:max-w-[260px] w-full mx-auto"
              style={{
                transform: `translate3d(0, calc(var(--assistant-y) * ${d.factor * 0.4}), 0)`,
              }}
            >
              <Link
                to="/assessment"
                className="landing-card group relative flex h-full w-full flex-col items-center justify-center rounded-3xl p-5 hover:rotate-2 hover:scale-105"
              >
                <span className="absolute inset-0 rounded-3xl accent-gradient opacity-0 group-hover:opacity-10 transition-opacity" />
                <span className="text-accent mb-3 transition-transform duration-300 group-hover:scale-110">{d.icon}</span>
                <span className="text-base md:text-lg text-text-primary font-body">{d.name}</span>
                <span className="text-[10px] md:text-xs text-muted uppercase tracking-wider mt-1">{d.desc}</span>
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* 中央固定内容 */}
      <div className="landing-glass relative z-10 max-w-2xl text-center rounded-[2rem] p-8 md:p-12 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_60px_-20px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-center gap-3 mb-5">
          <span className="w-8 h-px bg-stroke" />
          <span className="text-xs text-muted uppercase tracking-[0.3em]">研智助手</span>
          <span className="w-8 h-px bg-stroke" />
        </div>
        <h2 className="text-4xl md:text-6xl font-body text-text-primary leading-tight mb-5">
          智能 <span className="font-display italic text-accent">编程伙伴</span>
        </h2>
        <p className="text-sm md:text-base text-muted max-w-md mx-auto mb-8 leading-relaxed">
          基于自研知识库，解答你的编程问题。按研点计费，每日免费额度。
        </p>
        <Link
          to="/ai"
          className="accent-ring group relative inline-flex items-center gap-2 rounded-full bg-text-primary text-bg px-7 py-3.5 text-sm hover:scale-105 transition-transform"
        >
          开始对话
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
