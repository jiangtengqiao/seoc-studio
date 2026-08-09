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
  return (
    <div className={`reveal ${className}`} style={{ '--reveal-delay': `${delay}ms` } as CSSProperties}>
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

/* ============ RevealLens ============
 * 探照灯揭示交互：表层为遮盖层，鼠标周围的圆形区域揭示下层真实内容。
 * 延伸设计：
 * 1. 透镜带光晕描边与平滑跟随（rAF 插值），而非生硬跳变。
 * 2. 用户未操作时透镜沿利萨茹轨迹自动游走，暗示可交互。
 * 3. 支持触屏（Pointer Events 统一处理），并响应按住增强亮度。
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
  const pos = useRef({ x: 0.5, y: 0.4, tx: 0.5, ty: 0.4, active: false, t: 0 });

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const p = pos.current;
      const el = boxRef.current;
      if (el) {
        if (!p.active && idleAnimate) {
          p.t += 0.008;
          p.tx = 0.5 + 0.32 * Math.sin(p.t * 1.7);
          p.ty = 0.42 + 0.26 * Math.sin(p.t * 2.3 + 1.2);
        }
        p.x += (p.tx - p.x) * 0.12;
        p.y += (p.ty - p.y) * 0.12;
        const r = el.getBoundingClientRect();
        const cx = p.x * r.width;
        const cy = p.y * r.height;
        const mask = `radial-gradient(circle ${radius}px at ${cx}px ${cy}px, black 45%, transparent 100%)`;
        if (layerRef.current) {
          layerRef.current.style.webkitMaskImage = mask;
          layerRef.current.style.maskImage = mask;
        }
        if (ringRef.current) {
          ringRef.current.style.transform = `translate(${cx - radius}px, ${cy - radius}px)`;
          ringRef.current.style.opacity = p.active ? '1' : '0.45';
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [radius, idleAnimate]);

  const onPointer = (e: React.PointerEvent) => {
    const el = boxRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    pos.current.tx = (e.clientX - r.left) / r.width;
    pos.current.ty = (e.clientY - r.top) / r.height;
    pos.current.active = true;
  };

  return (
    <div
      ref={boxRef}
      className={`relative cursor-none select-none overflow-hidden ${className}`}
      onPointerMove={onPointer}
      onPointerLeave={() => (pos.current.active = false)}
      onPointerDown={onPointer}
    >
      <div className="absolute inset-0">{cover}</div>
      <div ref={layerRef} className="absolute inset-0">
        {beneath}
      </div>
      <div
        ref={ringRef}
        className="pointer-events-none absolute left-0 top-0 rounded-full border border-brand-400/70 shadow-[0_0_40px_8px_rgba(59,110,246,0.25)]"
        style={{ width: radius * 2, height: radius * 2 }}
      />
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
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-brand-950 p-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-brand-400/40 bg-brand-900/60">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#93b4fd" strokeWidth="2">
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
      </span>
      <p className="text-sm font-medium text-brand-100">{title}</p>
      <p className="max-w-xs text-xs leading-5 text-brand-300">
        移动鼠标，光圈所及之处可试读正文节选。完整内容开通后永久查阅。
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

