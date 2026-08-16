import { Link } from 'react-router-dom';

const IMG = (prompt: string) =>
  `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(prompt)}&image_size=landscape_4_3`;

interface BentoCard {
  title: string;
  italic?: string;
  price?: string;
  note: string;
  image: string;
  to: string;
  span: string;
  cta: string;
}

const CARDS: BentoCard[] = [
  {
    title: '订阅式项目',
    italic: 'Python 的起源研究与探索',
    price: '¥39',
    note: '一次性购入，永久查阅，持续维护',
    image: IMG('Vintage research notebook with Python code snippets and ancient programming language origins, warm amber tones, cinematic dark background'),
    to: '/products/subscription',
    span: 'md:col-span-7',
    cta: '查看 — 订阅式',
  },
  {
    title: '专研式项目',
    italic: 'Python 自行制作可训练 AI 系列教程',
    price: '¥369',
    note: '分期交付，项目驱动，持续维护但不持续更新',
    image: IMG('Neural network visualization with Python training code, deep blue and cyan, futuristic AI concept'),
    to: '/products/specialized',
    span: 'md:col-span-5',
    cta: '查看 — 专研式',
  },
  {
    title: '探索式项目',
    italic: 'Python 主流库与对应应用',
    price: '¥135',
    note: '高阶学者向，每期 22000-30000 字，含学术群',
    image: IMG('Abstract library ecosystem, interconnected Python packages as glowing nodes, purple and teal gradient'),
    to: '/products/exploration',
    span: 'md:col-span-5',
    cta: '查看 — 探索式',
  },
  {
    title: '免费能力评估',
    italic: '六大维度动态出题',
    note: '每日免费 2 次，定位你的阶段',
    image: IMG('Six-dimension radar chart assessment dashboard, clean minimal tech aesthetic, blue accent on dark background'),
    to: '/assessment',
    span: 'md:col-span-7',
    cta: '开始评估',
  },
];

/**
 * 核心门类 Bento 网格（cinema card layer）
 * - 4 张卡片，列跨度交替 7/5/5/7
 * - 半色调叠加 + 悬浮覆盖标签
 */
export default function CategoryBento() {
  return (
    <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 md:px-8">
      {/* 头部 */}
      <div className="mb-8 w-full max-w-6xl">
        <div className="flex items-center gap-3 mb-4">
          <span className="w-8 h-px bg-stroke" />
          <span className="text-xs text-muted uppercase tracking-[0.3em]">内容门类</span>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-4xl md:text-6xl font-body text-text-primary leading-tight">
            三种 <span className="font-display italic text-accent">读法</span>
          </h2>
          <p className="text-sm text-muted max-w-xs">
            订阅式、专研式、探索式，覆盖不同阶段的学习者。
          </p>
        </div>
      </div>

      {/* Bento 网格 */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-6 w-full max-w-6xl">
        {CARDS.map((c, i) => (
          <Link
            key={c.title}
            to={c.to}
            className={`group relative block ${c.span}`}
            style={{ transitionDelay: `${i * 0.15}s` }}
          >
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-surface border border-stroke">
              {/* 背景图 */}
              <img
                src={c.image}
                alt={c.title}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {/* 半色调叠加层 */}
              <div className="absolute inset-0 halftone-overlay opacity-20 mix-blend-multiply dark:opacity-30 dark:mix-blend-overlay" />
              {/* 暗角 */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

              {/* 内容 */}
              <div className="absolute inset-0 flex flex-col justify-end p-5 md:p-6">
                <p className="text-xs text-white/70 uppercase tracking-wider mb-1">{c.title}</p>
                <h3 className="text-xl md:text-2xl font-display italic text-white mb-1">{c.italic}</h3>
                {c.price && (
                  <p className="text-2xl font-display text-white mb-1">{c.price}</p>
                )}
                <p className="text-xs text-white/80 leading-relaxed max-w-xs">{c.note}</p>
              </div>

              {/* 悬浮覆盖层 */}
              <div className="absolute inset-0 flex items-center justify-center bg-bg/70 backdrop-blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span className="accent-ring relative inline-flex rounded-full bg-surface px-5 py-2 text-sm text-text-primary border border-stroke">
                  {c.cta}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* 桌面查看全部按钮 */}
      <div className="mt-8 hidden md:flex">
        <Link
          to="/products"
          className="accent-ring group relative inline-flex items-center gap-2 rounded-full border border-stroke bg-surface px-6 py-3 text-sm text-text-primary hover:scale-105 transition-transform"
        >
          查看全部项目
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
