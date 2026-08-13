# 把 fx.tsx 中 RevealLens 起的尾部替换为升级版，并新增常驻活动元素组件
import io

p = 'src/styles/../components/fx.tsx'
p = 'src/components/fx.tsx'
s = io.open(p, encoding='utf-8', newline='').read()
marker = '/* ============ RevealLens ============'
idx = s.find(marker)
assert idx > 0, 'marker not found'
s = s[:idx]

new_tail = '''/* ============ RevealLens（v9 升级版）============
 * 探照灯揭示交互。相比初版的升级：
 * 1. 自定义透镜光标：中心光点 + 内圈实线 + 外圈虚线旋转环，替代系统光标。
 * 2. 按住不放透镜放大 1.4 倍，松手弹性回缩，可探查更大区域。
 * 3. 跟随采用双弹簧插值（位置与半径分别阻尼），手感更稳更顺。
 * 4. 空闲时透镜沿利萨茹轨迹自动游走，并叠加呼吸缩放，暗示可交互。
 * 5. 透镜内部内容自动提亮，边缘羽化更宽，过渡更自然。
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
  const pos = useRef({ x: 0.5, y: 0.4, tx: 0.5, ty: 0.4, r: radius, tr: radius, active: false, pressed: false, t: 0 });

  useEffect(() => {
    pos.current.tr = pos.current.pressed ? radius * 1.4 : radius;
    let raf = 0;
    const loop = () => {
      const p = pos.current;
      const el = boxRef.current;
      if (el) {
        if (!p.active && idleAnimate) {
          p.t += 0.008;
          p.tx = 0.5 + 0.32 * Math.sin(p.t * 1.7);
          p.ty = 0.42 + 0.26 * Math.sin(p.t * 2.3 + 1.2);
          p.tr = radius * (1 + 0.06 * Math.sin(p.t * 3.1));
        } else {
          p.tr = p.pressed ? radius * 1.4 : radius;
        }
        p.x += (p.tx - p.x) * 0.16;
        p.y += (p.ty - p.y) * 0.16;
        p.r += (p.tr - p.r) * 0.14;
        const rect = el.getBoundingClientRect();
        const cx = p.x * rect.width;
        const cy = p.y * rect.height;
        const mask = `radial-gradient(circle ${p.r}px at ${cx}px ${cy}px, black 52%, transparent 100%)`;
        if (layerRef.current) {
          layerRef.current.style.webkitMaskImage = mask;
          layerRef.current.style.maskImage = mask;
        }
        if (ringRef.current) {
          ringRef.current.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
          ringRef.current.style.opacity = p.active ? '1' : '0.55';
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
    const rect = el.getBoundingClientRect();
    pos.current.tx = (e.clientX - rect.left) / rect.width;
    pos.current.ty = (e.clientY - rect.top) / rect.height;
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
      {/* 透镜光标：中心光点 + 实线内环 + 旋转虚线外环 + 光晕 */}
      <div ref={ringRef} className="lens-cursor pointer-events-none absolute left-0 top-0 opacity-0">
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand-300/90 shadow-[0_0_50px_10px_rgba(59,110,246,0.35)]"
          style={{ width: radius * 2, height: radius * 2 }}
        />
        <svg
          className="lens-dash absolute -translate-x-1/2 -translate-y-1/2 text-brand-400/80"
          width={radius * 2 + 26}
          height={radius * 2 + 26}
          style={{ marginLeft: -13, marginTop: -13 }}
        >
          <circle
            cx={(radius * 2 + 26) / 2}
            cy={(radius * 2 + 26) / 2}
            r={radius + 10}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="4 10"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-300 shadow-[0_0_12px_4px_rgba(147,180,253,0.8)]" />
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
'''

io.open(p, 'w', encoding='utf-8', newline='').write(s + new_tail)
print('fx.tsx rewritten, tail length', len(new_tail))
