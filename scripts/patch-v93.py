import io

def load(p):
    return io.open(p, encoding='utf-8', newline='').read()

def save(p, s):
    io.open(p, 'w', encoding='utf-8', newline='').write(s)

def rep(s, old, new, name):
    nl = '\r\n' if '\r\n' in s else '\n'
    o = old.replace('\n', nl)
    assert o in s, 'NOT FOUND in %s: %s' % (name, old[:60])
    return s.replace(o, new.replace('\n', nl), 1)

# ============ 1. CSS：菜单退出动画、渐变描边旋转 ============
css_path = 'src/styles/index.css'
css = load(css_path)
addition = '''

/* ===== v9.3 ===== */
/* 菜单淡入淡出：只动透明度与纵向位移，绝不触碰水平定位，避免闪跳 */
@keyframes menu-pop {
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes menu-out {
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(-6px); }
}
.menu-exit { animation: menu-out 0.16s ease-in forwards; }

/* 代码窗口旋转渐变描边（贴合窗口边缘流动，替代原虚线环） */
@property --a {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}
@keyframes a-spin { to { --a: 360deg; } }
.spin-border {
  position: relative;
  border-radius: 1.15rem;
  padding: 1.5px;
  background: conic-gradient(from var(--a),
    rgba(59, 110, 246, 0) 0deg,
    rgba(59, 110, 246, 0.65) 80deg,
    rgba(245, 158, 11, 0.55) 160deg,
    rgba(59, 110, 246, 0) 240deg);
  animation: a-spin 5.5s linear infinite;
}
@supports not (background: conic-gradient(from var(--a), red, blue)) {
  .spin-border { background: linear-gradient(135deg, rgba(59,110,246,.5), rgba(245,158,11,.4)); }
}
/* 编辑器光标 */
@keyframes caret-blink {
  0%, 45% { opacity: 1; }
  50%, 95% { opacity: 0; }
}
.code-caret {
  display: inline-block;
  width: 2px;
  height: 1em;
  margin-left: 1px;
  vertical-align: -0.15em;
  background: #93b4fd;
  animation: caret-blink 1.1s steps(1) infinite;
}
/* 支付码锁定覆盖物：斜纹 + 磨砂，保证无法扫码 */
.pay-lock {
  backdrop-filter: blur(2px);
  background:
    repeating-linear-gradient(45deg, rgba(15, 23, 42, 0.55) 0 10px, rgba(30, 58, 138, 0.55) 10px 20px);
}
@media (prefers-reduced-motion: reduce) {
  .spin-border { animation: none; }
  .code-caret { animation: none; }
}
'''
if 'menu-exit' not in css:
    css = css.rstrip() + addition + '\n'
    save(css_path, css)
print('css ok')

# ============ 2. Layout.tsx：菜单淡入淡出 + 修复水平闪跳 ============
lp = 'src/components/Layout.tsx'
s = load(lp)

# 2a. MoreNav 组件整体重写
old_more = s[s.find('/** 「全部导航」折叠面板：悬浮或点击箭头展开分组快捷导航 */'):s.find('export default function Layout')]
new_more = '''/** 「全部导航」折叠面板：悬浮或点击箭头展开分组快捷导航。
 *  淡入淡出实现要点：外层负责水平定位（-translate-x-1/2，不参与动画），
 *  内层只做透明度与纵向位移；关闭时先播放退出动画再卸载，避免闪跳。 */
function MoreNav() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [render, setRender] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (unmountTimer.current) clearTimeout(unmountTimer.current);
    setRender(true);
    setOpen(true);
  };
  const hide = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      setOpen(false);
      if (unmountTimer.current) clearTimeout(unmountTimer.current);
      unmountTimer.current = setTimeout(() => setRender(false), 180);
    }, 140);
  };
  const toggle = () => {
    if (open) {
      setOpen(false);
      if (unmountTimer.current) clearTimeout(unmountTimer.current);
      unmountTimer.current = setTimeout(() => setRender(false), 180);
    } else {
      show();
    }
  };

  return (
    <div onMouseEnter={show} onMouseLeave={hide}>
      <button
        onClick={toggle}
        aria-expanded={open}
        className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
          open ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
        }`}
      >
        {t('nav.more')}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {render && (
        <div className="fixed left-1/2 top-16 z-50 w-[min(48rem,94vw)] -translate-x-1/2">
          <div
            className={`overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-[0_24px_60px_-12px_rgba(30,58,138,0.25)] backdrop-blur ${
              open ? 'menu-pop' : 'menu-exit'
            }`}
            onMouseEnter={show}
            onMouseLeave={hide}
          >
            <div className="panel-strip" />
            <div className="grid grid-cols-2 gap-x-5 gap-y-5 p-6 lg:grid-cols-4">
              {MEGA_GROUPS.map((g, gi) => (
                <div key={g.titleKey}>
                  <p className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <span className={`h-1.5 w-1.5 rounded-full ${['bg-brand-500', 'bg-violet-500', 'bg-amber-500', 'bg-emerald-500'][gi]}`} />
                    {t(g.titleKey)}
                  </p>
                  <ul className="space-y-1">
                    {g.items.map((it) => (
                      <li key={it.to}>
                        <NavLink
                          to={it.to}
                          onClick={() => {
                            setOpen(false);
                            setRender(false);
                          }}
                          className="group flex items-start gap-2.5 rounded-xl px-2 py-2 transition hover:bg-gradient-to-r hover:from-brand-50 hover:to-transparent"
                        >
                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white group-hover:shadow-md">
                            {MEGA_ICONS[it.icon]}
                          </span>
                          <span className="min-w-0">
                            <span className="flex items-center gap-1 text-sm font-medium text-slate-800 group-hover:text-brand-700">
                              {t(it.key)}
                              <span className="translate-x-0 text-brand-400 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100">→</span>
                            </span>
                            <span className="mt-0.5 block text-xs leading-5 text-slate-400">{it.desc}</span>
                          </span>
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-6 py-3">
              <SiteUptime />
              <span className="text-xs text-slate-400">15 个快捷入口，悬浮或点击箭头展开</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'''
s = s.replace(old_more, new_more, 1)
save(lp, s)
print('layout ok')

# ============ 3. Home.tsx：hero 代码窗口升级 ============
hp = 'src/pages/Home.tsx'
h = load(hp)

# 3a. HeroCodeWindow 重写
old_win = h[h.find('function HeroCodeWindow()'):h.find('export default function Home()')]
new_win = '''function HeroCodeWindow() {
  const lines: { n: number; code: JSX.Element }[] = [
    { n: 1, code: (<><span className="text-slate-500 italic"># SEOC Studio · 编程研究与探索</span></>) },
    { n: 2, code: (<><span className="text-violet-400">from</span> <span className="text-slate-200">research</span> <span className="text-violet-400">import</span> <span className="text-brand-300">Origins</span>, <span className="text-brand-300">Craft</span></>) },
    { n: 3, code: (<>&nbsp;</>) },
    { n: 4, code: (<><span className="text-violet-400">def</span> <span className="text-amber-300">study</span><span className="text-slate-300">(topic):</span></>) },
    { n: 5, code: (<>&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-slate-200">trace</span> <span className="text-slate-400">=</span> <span className="text-brand-300">Origins</span><span className="text-slate-300">(topic).</span><span className="text-amber-300">trace</span><span className="text-slate-300">()</span>&nbsp;&nbsp;<span className="text-slate-500 italic"># 追根溯源</span></>) },
    { n: 6, code: (<>&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-violet-400">return</span> <span className="text-brand-300">Craft</span><span className="text-slate-300">(trace).</span><span className="text-amber-300">refine</span><span className="text-slate-300">()</span>&nbsp;&nbsp;<span className="text-slate-500 italic"># 打磨成器</span></>) },
    { n: 7, code: (<>&nbsp;</>) },
    { n: 8, code: (<><span className="text-amber-300">study</span><span className="text-slate-300">(</span><span className="text-emerald-300">"Python 的起源"</span><span className="text-slate-300">)</span><span className="code-caret" /></>) }
  ];
  return (
    <div className="spin-border shadow-lift">
      <div className="overflow-hidden rounded-[1.05rem] bg-brand-950 font-mono text-xs leading-6 text-slate-200">
        {/* 标签页栏 */}
        <div className="flex items-center gap-2 border-b border-white/10 bg-white/5 px-4 py-2.5">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          <div className="ml-3 flex gap-1 text-[11px]">
            <span className="rounded-md bg-white/10 px-2.5 py-0.5 text-brand-200">research.py</span>
            <span className="rounded-md px-2.5 py-0.5 text-slate-500">notes.md</span>
          </div>
          <span className="ml-auto flex items-center gap-1.5 text-[10px] text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 pulse-dot" />
            running
          </span>
        </div>
        {/* 代码区 */}
        <div className="flex px-0 py-3">
          <div className="select-none border-r border-white/5 px-3 text-right text-slate-600">
            {lines.map((l) => (
              <div key={l.n}>{l.n}</div>
            ))}
          </div>
          <div className="flex-1 whitespace-pre px-4">
            {lines.map((l) => (
              <div key={l.n}>{l.code}</div>
            ))}
          </div>
        </div>
        {/* 状态栏 */}
        <div className="flex items-center justify-between border-t border-white/10 bg-white/5 px-4 py-1.5 text-[10px] text-slate-500">
          <span>Python 3.12 · UTF-8</span>
          <span>Ln 8, Col 22 · Spaces: 4</span>
        </div>
      </div>
    </div>
  );
}

'''
h = h.replace(old_win, new_win, 1)

# 3b. 移除原虚线轨道环（改为静态细环），漂浮徽章保留
h = rep(h, '<div className="orbit-ring pointer-events-none absolute -inset-5 rounded-[1.8rem] border border-dashed border-brand-300/60" />',
        '<div className="pointer-events-none absolute -inset-5 rounded-[1.8rem] border border-brand-200/60" />', 'home orbit')
save(hp, h)
print('home ok')
