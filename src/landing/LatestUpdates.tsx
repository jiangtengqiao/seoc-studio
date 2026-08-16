import { Link } from 'react-router-dom';

const IMG = (prompt: string) =>
  `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(prompt)}&image_size=square`;

interface Update {
  title: string;
  date: string;
  read: string;
  image: string;
}

const UPDATES: Update[] = [
  {
    title: '欢迎 —— 这是一个温馨的程序员的大家庭！',
    date: '2026-08-12',
    read: '2 分钟',
    image: IMG('Welcoming community of diverse programmers collaborating, warm tones, circular composition'),
  },
  {
    title: '我们的三条硬承诺正式发布',
    date: '2026-08-08',
    read: '3 分钟',
    image: IMG('Official document with three promises stamped, parchment and ink, professional seal'),
  },
  {
    title: '新期上线：Python 图表的高级制作与表达',
    date: '2026-08-05',
    read: '5 分钟',
    image: IMG('Advanced Python data visualization charts, elegant publication-grade graphs, blue accent'),
  },
  {
    title: 'FAQ 更新，现覆盖 12 个常见问题',
    date: '2026-08-01',
    read: '4 分钟',
    image: IMG('FAQ document with question marks, clean minimal list layout, tech aesthetic'),
  },
];

/**
 * 最新动态（第四部分，常规流）
 * - 水平药丸式动态条目
 */
export default function LatestUpdates() {
  return (
    <section className="bg-bg py-20 md:py-28">
      <div className="mx-auto max-w-5xl px-4">
        {/* 头部 */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-3">
            <span className="w-8 h-px bg-stroke" />
            <span className="text-xs text-muted uppercase tracking-[0.3em]">最新动态</span>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-4xl md:text-6xl font-body text-text-primary leading-tight">
              Recent <span className="font-display italic text-accent">announcements</span>
            </h2>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted">公告与更新</span>
              <Link
                to="/announcements"
                className="accent-ring group relative inline-flex items-center gap-2 rounded-full border border-stroke bg-surface px-5 py-2 text-sm text-text-primary hover:scale-105 transition-transform"
              >
                查看全部
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>

        {/* 动态条目 */}
        <div className="space-y-4">
          {UPDATES.map((u) => (
            <Link
              key={u.title}
              to="/announcements"
              className="landing-card group flex items-center gap-6 rounded-[40px] sm:rounded-full p-4"
            >
              <img
                src={u.image}
                alt=""
                loading="lazy"
                className="w-16 h-16 rounded-full object-cover shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-base md:text-lg text-text-primary truncate group-hover:text-accent transition-colors">
                  {u.title}
                </h3>
                <p className="text-xs text-muted mt-1">
                  {u.read} · {u.date}
                </p>
              </div>
              <span className="text-text-primary shrink-0 group-hover:translate-x-1 transition-transform">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
