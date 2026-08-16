import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { useTheme } from '../lib/theme';

const NAV_LINKS = [
  { label: '首页', to: '/' },
  { label: '项目', to: '/products' },
  { label: '关于', to: '/announcements' },
];

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}

function ArrowRightIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}

/**
 * 液态灵动岛导航
 * - 初始：宽药丸，含 logo / 导航链接 / 主题切换 / 联系按钮
 * - 滚动 > 100px：GSAP 平滑坍缩为紧凑胶囊，链接淡出，联系按钮收为箭头
 * - 使用 gap 间距代替分隔线，更干净、更具高级质感
 */
export default function LiquidNav() {
  const pillRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const { resolved, setMode } = useTheme();

  useEffect(() => {
    const onScroll = () => {
      const should = window.scrollY > 100;
      setCollapsed((prev) => {
        if (prev === should) return prev;
        if (pillRef.current) {
          gsap.fromTo(
            pillRef.current,
            { scale: should ? 0.94 : 1.03 },
            { scale: 1, duration: 0.7, ease: 'elastic.out(1, 0.5)' }
          );
        }
        return should;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const toggleTheme = () => {
    setMode(resolved === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-3 md:pt-5 px-4 pointer-events-none">
      <div
        ref={pillRef}
        className={`island-pill pointer-events-auto relative flex items-center rounded-full backdrop-blur-xl border bg-surface/70 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.18)] dark:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)] ${
          collapsed
            ? 'border-transparent island-collapsed-glow'
            : 'border-stroke/40'
        }`}
        style={{
          maxWidth: collapsed ? '200px' : 'max-content',
          transition: 'max-width 0.7s cubic-bezier(0.22, 1, 0.36, 1), padding 0.6s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.5s ease, background-color 0.5s ease',
          padding: collapsed ? '6px 8px' : '7px 12px',
        }}
      >
        {/* Logo */}
        <Link
          to="/"
          className="group relative flex h-8 w-8 md:h-9 md:w-9 shrink-0 items-center justify-center rounded-full p-[1.5px] transition-transform duration-300 hover:scale-110"
          aria-label="SEOC Studio 首页"
        >
          <span className="absolute inset-0 rounded-full accent-gradient opacity-90 transition-transform duration-500 group-hover:-rotate-180" />
          <span className="relative flex h-full w-full items-center justify-center rounded-full bg-surface">
            <span className="font-display italic text-[12px] md:text-[13px] accent-gradient-text font-medium">SE</span>
          </span>
        </Link>

        {/* 导航链接 */}
        <div
          className="island-links flex items-center gap-0.5 ml-1.5"
          style={{
            transition: 'opacity 0.4s ease, max-width 0.6s cubic-bezier(0.22, 1, 0.36, 1), margin 0.5s ease',
            maxWidth: collapsed ? '0' : '400px',
            opacity: collapsed ? '0' : '1',
            overflow: 'hidden',
            pointerEvents: collapsed ? 'none' : 'auto',
            marginLeft: collapsed ? '0' : undefined,
          }}
        >
          {NAV_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-xs sm:text-[13px] rounded-full px-3 sm:px-3.5 py-1.5 text-muted hover:text-text-primary hover:bg-stroke/40 transition-colors whitespace-nowrap font-body"
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* 主题切换 */}
        <button
          onClick={toggleTheme}
          aria-label="切换主题"
          className="flex h-8 w-8 md:h-9 md:w-9 shrink-0 items-center justify-center rounded-full text-text-primary hover:bg-stroke/40 transition-colors ml-auto"
        >
          {resolved === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>

        {/* 联系按钮 */}
        <a
          href="mailto:jiangtengqiao@qq.com"
          className="accent-ring group relative inline-flex shrink-0 items-center gap-1.5 rounded-full bg-text-primary text-bg text-xs sm:text-[13px] font-body ml-1 overflow-hidden"
          style={{
            padding: collapsed ? '7px 9px' : '7px 14px',
            transition: 'padding 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          <span
            className="whitespace-nowrap overflow-hidden"
            style={{
              maxWidth: collapsed ? '0' : '40px',
              opacity: collapsed ? '0' : '1',
              transition: 'max-width 0.5s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease',
            }}
          >
            联系
          </span>
          <ArrowRightIcon size={14} />
        </a>
      </div>
    </div>
  );
}
