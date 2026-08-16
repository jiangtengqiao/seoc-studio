import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import HlsVideo from './HlsVideo';

const HLS_SRC = 'https://stream.mux.com/Aa02T7oM1wH5Mk5EEVDYhbZ1ChcdhRsS2m1NYyx4Ua1g.m3u8';
const POSTER =
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?' +
  'prompt=' + encodeURIComponent('Dark cinematic code flow background, vertical mirror reflection aesthetic, deep navy and teal particles, atmospheric') +
  '&image_size=landscape_16_9';
const MARQUEE_TEXT = '探索编程';
const MARQUEE_REPEAT = 10;

const SOCIALS = [
  {
    name: 'GitHub',
    href: 'https://github.com',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.8-1.6-2.6-.3-5.3-1.3-5.3-5.8 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17 4.6 18 4.9 18 4.9c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.5-2.7 5.5-5.3 5.8.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.7 18.3.5 12 .5z" /></svg>
    ),
  },
  {
    name: 'Bilibili',
    href: 'https://bilibili.com',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.8 3l-2.6 2.6H8.8L6.2 3 4.8 4.4l2 2H4a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h16a3 3 0 0 0 3-3v-8a3 3 0 0 0-3-3h-2.8l2-2L17.8 3zM7 12h2v2H7v-2zm8 0h2v2h-2v-2z" /></svg>
    ),
  },
  {
    name: 'Twitter',
    href: 'https://twitter.com',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M22 5.8c-.7.3-1.5.5-2.4.6.9-.5 1.5-1.3 1.8-2.3-.8.5-1.7.8-2.6 1A4.1 4.1 0 0 0 11.8 8c0 .3 0 .6.1.9A11.6 11.6 0 0 1 3.4 4a4.1 4.1 0 0 0 1.3 5.5c-.7 0-1.3-.2-1.9-.5v.1c0 2 1.4 3.7 3.3 4-.4.1-.8.2-1.2.1l1.2 3.7c1.6-.6 4-1.3 5.4-3.6 1.4-2.3 1.3-5.1 1.3-5.1.7-.5 1.4-1.3 1.8-2.2.8.5 1.7.8 2.6 1 .3-.8.9-1.5 1.8-2z" /></svg>
    ),
  },
  {
    name: 'WeChat',
    href: 'mailto:jiangtengqiao@qq.com?subject=WeChat%20合作',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M9 3C4.6 3 1 6.1 1 10c0 2.2 1.2 4.1 3 5.4L3 19l3.7-2c.7.2 1.5.3 2.3.3h.6a5.6 5.6 0 0 1-.3-1.8c0-3.6 3.4-6.5 7.5-6.5h.6C16.6 5.7 13.2 3 9 3zm-2.5 4.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm5 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2zM17 10c-3.3 0-6 2.2-6 5s2.7 5 6 5c.7 0 1.3-.1 1.9-.3L22 21l-.7-2.1c1.1-.9 1.7-2.1 1.7-3.4 0-2.8-2.7-5-6-5zm-2 3a.8.8 0 1 1 0 1.5.8.8 0 0 1 0-1.5zm4 0a.8.8 0 1 1 0 1.5.8.8 0 0 1 0-1.5z" /></svg>
    ),
  },
];

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function useUptime() {
  const startRef = useRef(Date.now());
  const [up, setUp] = useState('0天 00:00:00');
  useEffect(() => {
    const id = setInterval(() => {
      const diff = Date.now() - startRef.current;
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setUp(`${d}天 ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(id);
  }, []);
  return up;
}

/**
 * 联系 / 页脚（第七部分）
 * - 背景视频（垂直翻转）+ 跑马灯 + 邮箱 CTA + 社交 + 实时时钟
 */
export default function SiteFooter() {
  const marqueeRef = useRef<HTMLDivElement>(null);
  const now = useClock();
  const uptime = useUptime();

  useEffect(() => {
    if (!marqueeRef.current) return;
    const ctx = gsap.context(() => {
      gsap.to('.footer-marquee', {
        xPercent: -50,
        duration: 40,
        ease: 'none',
        repeat: -1,
      });
    });
    return () => ctx.revert();
  }, []);

  const timeStr = now.toLocaleTimeString('zh-CN', { hour12: false });

  return (
    <footer className="relative bg-bg pt-16 md:pt-20 pb-8 md:pb-12 overflow-hidden">
      {/* 背景视频（垂直翻转） */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <HlsVideo
          src={HLS_SRC}
          poster={POSTER}
          className="absolute top-1/2 left-1/2 min-w-full min-h-full object-cover -translate-x-1/2 -translate-y-1/2"
          flipY
        />
        <div className="absolute inset-0 bg-black/60 dark:bg-black/75" />
      </div>

      {/* 跑马灯 */}
      <div className="relative overflow-hidden mb-16 md:mb-20 py-4 border-y border-white/10">
        <div ref={marqueeRef} className="footer-marquee items-center">
          {Array.from({ length: MARQUEE_REPEAT }).map((_, i) => (
            <span
              key={i}
              className="flex items-center text-4xl md:text-7xl font-display italic text-white/90 whitespace-nowrap pr-8"
            >
              {MARQUEE_TEXT}
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" className="mx-6 text-white/40">
                <path d="M12 2v20M2 12h20" />
              </svg>
              驱动未来
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" className="mx-6 text-white/40">
                <circle cx="12" cy="12" r="3" />
              </svg>
            </span>
          ))}
        </div>
      </div>

      {/* 邮箱 CTA */}
      <div className="relative mx-auto max-w-5xl px-4 mb-16 text-center">
        <a
          href="mailto:jiangtengqiao@qq.com"
          className="accent-ring group relative inline-flex items-center gap-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 px-8 py-4 text-white hover:scale-105 transition-transform"
        >
          <span className="text-base md:text-lg">联系与举报</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </a>
        <p className="mt-4 text-sm text-white/60">jiangtengqiao@qq.com</p>
      </div>

      {/* 页脚栏 */}
      <div className="relative mx-auto max-w-6xl px-4">
        <div className="flex flex-col md:flex-row md:justify-between items-center gap-6 text-xs text-white/70 border-t border-white/10 pt-6">
          {/* 社交链接 */}
          <div className="flex items-center gap-4">
            {SOCIALS.map((s) => (
              <a
                key={s.name}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.name}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white/80 hover:text-white hover:border-white/50 hover:scale-110 transition-all"
              >
                {s.icon}
              </a>
            ))}
          </div>

          {/* 开放合作 */}
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse-dot-soft" />
            <span>开放合作</span>
          </div>

          {/* 版权 */}
          <p>SEOC Studio · 编程研究与探索有限公司 · 保留所有权利</p>

          {/* 实时时钟 + 运行时长 */}
          <div className="flex items-center gap-4 tabular-nums">
            <span>{timeStr}</span>
            <span className="text-white/40">·</span>
            <span>{uptime}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
