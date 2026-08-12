import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode
} from 'react';

export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    el.querySelectorAll('.reveal').forEach((n) => io.observe(n));
    if (el.classList.contains('reveal')) io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

export function Reveal({
  children,
  delay = 0,
  className = ''
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${className}`} style={{ '--reveal-delay': `${delay}ms` } as CSSProperties}>
      {children}
    </div>
  );
}

export function Typewriter({
  lines,
  speed = 55,
  pause = 2200,
  className = ''
}: {
  lines: string[];
  speed?: number;
  pause?: number;
  className?: string;
}) {
  const [text, setText] = useState('');
  useEffect(() => {
    let line = 0;
    let char = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const full = lines[line];
      if (!deleting) {
        char += 1;
        setText(full.slice(0, char));
        if (char === full.length) {
          deleting = true;
          timer = setTimeout(tick, pause);
          return;
        }
        timer = setTimeout(tick, speed);
      } else {
        char -= 1;
        setText(full.slice(0, char));
        if (char === 0) {
          deleting = false;
          line = (line + 1) % lines.length;
        }
        timer = setTimeout(tick, 24);
      }
    };
    timer = setTimeout(tick, 400);
    return () => clearTimeout(timer);
  }, [lines, speed, pause]);
  return (
    <span className={`caret ${className}`} aria-label={lines.join(' ')}>
      {text}
    </span>
  );
}

export function Counter({ to, suffix = '', duration = 1400 }: { to: number; suffix?: string; duration?: number }) {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let started = false;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !started) {
          started = true;
          const t0 = performance.now();
          const step = (t: number) => {
            const p = Math.min((t - t0) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            setN(Math.round(to * eased));
            if (p < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
          io.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [to, duration]);
  return (
    <span ref={ref}>
      {n.toLocaleString()}
      {suffix}
    </span>
  );
}

export function Marquee({ items }: { items: string[] }) {
  const row = [...items, ...items];
  return (
    <div className="relative overflow-hidden border-y border-slate-200 bg-white py-3">
      <div className="marquee-track gap-10">
        {row.map((t, i) => (
          <span key={i} className="flex items-center gap-3 whitespace-nowrap font-mono text-sm text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

export function TiltCard({ children, className = '', max = 8 }: { children: ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.transform = `perspective(900px) rotateY(${(px - 0.5) * max}deg) rotateX(${(0.5 - py) * max}deg) translateY(-4px)`;
  };
  const onLeave = () => {
    if (ref.current) ref.current.style.transform = '';
  };
  return (
    <div ref={ref} className={`tilt-card ${className}`} onMouseMove={onMove} onMouseLeave={onLeave}>
      {children}
    </div>
  );
}

export function Spotlight({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  };
  return (
    <div ref={ref} className={`spotlight ${className}`} onMouseMove={onMove}>
      {children}
    </div>
  );
}

export function ScrollProgress() {
  const [w, setW] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const p = h.scrollTop / (h.scrollHeight - h.clientHeight || 1);
      setW(p * 100);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return <div className="progress-top" style={{ width: `${w}%` }} />;
}

export function FAQ({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className={`faq-item card ${open === i ? 'open' : ''}`}>
          <button
            className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium text-slate-800"
            onClick={() => setOpen(open === i ? null : i)}
          >
            {it.q}
            <span
              className={`ml-3 inline-block text-brand-500 transition-transform duration-300 ${
                open === i ? 'rotate-45' : ''
              }`}
            >
              +
            </span>
          </button>
          <div>
            <div>
              <p className="px-5 pb-4 text-sm leading-6 text-slate-600">{it.a}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============ RevealLens（v9.1 修复版）============
 * 探照灯揭示交互。
 * 修复记录：初版旋转虚线环的 CSS 旋转动画覆盖了位移 transform 造成错位；
 * 位置插值导致透镜跟不上鼠标。现改为单一容器 transform（位移与缩放合一），
 * 子元素全部 flex 居中不带 transform，位置零延迟直跟鼠标，
 * 仅按住缩放与空闲游走保留插值平滑。
 */

interface LensProps {
  cover: ReactNode;
  beneath: ReactNode;
  radius?: number;
  className?: string;
  idleAnimate?: boolean;
}

export function RevealLens({ cover, beneath, radius = 130, className = '', idleAnimate = true }: LensProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0.5, y: 0.4, scale: 1, active: false, pressed: false, t: 0 });
  const D = radius * 2 + 28;

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const p = pos.current;
      const el = boxRef.current;
      if (el) {
        if (!p.active && idleAnimate) {
          p.t += 0.008;
          p.x = 0.5 + 0.32 * Math.sin(p.t * 1.7);
          p.y = 0.42 + 0.26 * Math.sin(p.t * 2.3 + 1.2);
        }
        const targetScale = p.pressed ? 1.4 : !p.active && idleAnimate ? 1 + 0.05 * Math.sin(p.t * 3.1) : 1;
        p.scale += (targetScale - p.scale) * 0.16;
        const rect = el.getBoundingClientRect();
        const cx = p.x * rect.width;
        const cy = p.y * rect.height;
        const r = radius * p.scale;
        const mask = `radial-gradient(circle ${r}px at ${cx}px ${cy}px, black 52%, transparent 100%)`;
        if (layerRef.current) {
          layerRef.current.style.webkitMaskImage = mask;
          layerRef.current.style.maskImage = mask;
        }
        if (ringRef.current) {
          ringRef.current.style.transform = `translate(${cx - D / 2}px, ${cy - D / 2}px) scale(${p.scale})`;
          ringRef.current.style.opacity = p.active ? '1' : '0.55';
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [radius, idleAnimate, D]);

  const onPointer = (e: React.PointerEvent) => {
    const el = boxRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    // 位置零延迟直跟，彻底消除"跟不上"
    pos.current.x = (e.clientX - rect.left) / rect.width;
    pos.current.y = (e.clientY - rect.top) / rect.height;
    pos.current.active = true;
  };

  return (
    <div
      ref={boxRef}
      className={`relative cursor-none select-none overflow-hidden ${className}`}
      onPointerMove={onPointer}
      onPointerDown={(e) => {
        onPointer(e);
        pos.current.pressed = true;
      }}
      onPointerUp={() => (pos.current.pressed = false)}
      onPointerLeave={() => {
        pos.current.active = false;
        pos.current.pressed = false;
      }}
    >
      <div className="absolute inset-0">{cover}</div>
      <div ref={layerRef} className="absolute inset-0 brightness-[1.06]">
        {beneath}
      </div>
      {/* 透镜光标：单一容器承载位移与缩放，子元素纯居中布局，无任何 transform 冲突 */}
      <div
        ref={ringRef}
        className="pointer-events-none absolute left-0 top-0 flex items-center justify-center opacity-0"
        style={{ width: D, height: D, transformOrigin: 'center' }}
      >
        <div
          className="absolute rounded-full border-2 border-brand-300/90 shadow-[0_0_50px_10px_rgba(59,110,246,0.35)]"
          style={{ width: radius * 2, height: radius * 2 }}
        />
        <svg className="lens-dash absolute text-brand-400/80" width={radius * 2 + 20} height={radius * 2 + 20}>
          <circle
            cx={radius + 10}
            cy={radius + 10}
            r={radius + 8}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="4 10"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute h-2 w-2 rounded-full bg-brand-300 shadow-[0_0_12px_4px_rgba(147,180,253,0.8)]" />
      </div>
    </div>
  );
}

/* LensGate：付费内容的探照灯试读。表层是锁定提示，光圈下可见正文节选。 */
export function LensGate({
  excerpt,
  title,
  cta,
  className = ''
}: {
  excerpt: string;
  title: string;
  cta?: ReactNode;
  className?: string;
}) {
  const cover = (
    <div className="relative flex h-full flex-col items-center justify-center gap-3 overflow-hidden bg-brand-950 p-8 text-center">
      <div className="scan-line" />
      <span className="relative flex h-12 w-12 items-center justify-center rounded-full border border-brand-400/40 bg-brand-900/60">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#93b4fd" strokeWidth="2">
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
      </span>
      <p className="relative text-sm font-medium text-brand-100">{title}</p>
      <p className="relative max-w-xs text-xs leading-5 text-brand-300">
        移动鼠标，光圈所及之处可试读正文节选；按住不放，透镜还会放大。完整内容开通后永久查阅。
      </p>
      {cta}
    </div>
  );
  const beneath = (
    <div className="h-full bg-white p-8">
      <p className="mb-3 font-mono text-xs tracking-widest text-brand-500">PREVIEW EXCERPT</p>
      <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{excerpt}</p>
    </div>
  );
  return <RevealLens cover={cover} beneath={beneath} className={className} radius={120} />;
}

/* ============ 常驻活动元素（v9 新增） ============ */

/** 极光流动光斑，用于区块背景 */
export function Aurora({ className = '', color = 'rgba(59,110,246,0.35)', size = 320, delay = 0 }: {
  className?: string;
  color?: string;
  size?: number;
  delay?: number;
}) {
  return (
    <div
      className={`aurora ${className}`}
      style={{ width: size, height: size, background: color, animationDelay: `${delay}s` }}
    />
  );
}

/** 呼吸状态点（常亮脉冲），表示"正在进行" */
export function PulseDot({ className = '' }: { className?: string }) {
  return <span className={`pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 ${className}`} />;
}

/** 实时时钟 + 站点持续运行计时，每秒跳动 */
export function SiteUptime() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const launch = new Date('2026-08-09T00:00:00+08:00').getTime();
  const diff = Math.max(0, now.getTime() - launch);
  const days = Math.floor(diff / 86_400_000);
  const hh = String(Math.floor(diff / 3_600_000) % 24).padStart(2, '0');
  const mm = String(Math.floor(diff / 60_000) % 60).padStart(2, '0');
  const ss = String(Math.floor(diff / 1000) % 60).padStart(2, '0');
  return (
    <span className="inline-flex items-center gap-2 font-mono text-xs text-slate-500">
      <PulseDot />
      <span>实时 {now.toLocaleTimeString('zh-CN', { hour12: false })}</span>
      <span className="text-slate-300">|</span>
      <span>站点已持续运行 {days} 天 {hh}:{mm}:{ss}</span>
    </span>
  );
}

/** 返回顶部浮动按钮，滚动超过一屏后出现 */
export function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="返回顶部"
      className={`fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-brand-600 shadow-lift backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:bg-brand-600 hover:text-white ${
        show ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
      }`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    </button>
  );
}

/** 返回上一级按钮（用于子页面顶部） */
export function BackButton({ to = -1, label = '返回', className = '' }: { to?: number | string; label?: string; className?: string }) {
  return (
    <button
      onClick={() => {
        if (typeof to === 'number') {
          if (window.history.length > 1) window.history.back();
          else window.location.hash = '#/';
        } else {
          window.location.hash = `#${to}`;
        }
      }}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-brand-600 dark:hover:bg-brand-900/30 dark:hover:text-brand-300 ${className}`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      {label}
    </button>
  );
}
