import io

# ---------- 1. CSS 追加 ----------
css_path = 'src/styles/index.css'
css = io.open(css_path, encoding='utf-8', newline='').read()
addition = '''

/* ===== v9.2 全站常驻动效 ===== */
@keyframes flow-x {
  0% { background-position: 0% 0; }
  100% { background-position: 200% 0; }
}
/* 导航栏下方的流动渐变光线，每页持续可见 */
.header-flow {
  height: 2px;
  background: linear-gradient(90deg, transparent, #3b6ef6 20%, #f59e0b 42%, #10b981 62%, #8b5cf6 82%, transparent);
  background-size: 200% 100%;
  animation: flow-x 5s linear infinite;
}
/* 围绕代码窗口的轨道虚线环 */
.orbit-ring { animation: spin-slow 26s linear infinite; }
/* 导航面板顶部渐变条 */
.panel-strip {
  height: 3px;
  background: linear-gradient(90deg, #3b6ef6, #8b5cf6, #f59e0b, #10b981, #3b6ef6);
  background-size: 200% 100%;
  animation: flow-x 8s linear infinite;
}
@media (prefers-reduced-motion: reduce) {
  .header-flow, .orbit-ring, .panel-strip { animation: none; }
}
'''
if '.header-flow' not in css:
    css = css.rstrip() + addition + '\n'
io.open(css_path, 'w', encoding='utf-8', newline='').write(css)
print('css ok')

# ---------- 2. Layout.tsx：面板美化 ----------
lp = 'src/components/Layout.tsx'
s = io.open(lp, encoding='utf-8', newline='').read()
nl = '\r\n' if '\r\n' in s else '\n'

def rep(old, new, cnt=1):
    global s
    o = old.replace('\n', nl)
    n = new.replace('\n', nl)
    assert o in s, 'NOT FOUND: ' + old[:70]
    s = s.replace(o, n, cnt)

# 2a. 每个快捷入口加图标
rep('''/** 「全部导航」折叠面板的分组快捷入口 */
interface MegaItem {
  to: string;
  key: string;
  desc: string;
}''',
'''/** 「全部导航」折叠面板的分组快捷入口 */
interface MegaItem {
  to: string;
  key: string;
  desc: string;
  icon: string;
}

const MEGA_ICONS: Record<string, JSX.Element> = {
  grid: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>),
  book: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>),
  layers: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>),
  compass: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>),
  gauge: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 15l3.5-5.5"/><path d="M20.2 15a9 9 0 1 0-16.4 0"/></svg>),
  poll: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>),
  chat: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>),
  search: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>),
  users: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>),
  megaphone: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 11l18-5v12L3 13v-2z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>),
  shield: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>),
  gift: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>),
  user: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>),
  login: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><path d="M15 12H3"/></svg>),
  userplus: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6M23 11h-6"/></svg>)
};''')

# 2b. 各入口补 icon 字段
rep("{ to: '/products', key: 'nav.products', desc: '三大门类完整目录与定价总览' },",
    "{ to: '/products', key: 'nav.products', desc: '三大门类完整目录与定价总览', icon: 'grid' },")
rep("{ to: '/products/subscription', key: 'nav.subscription', desc: '语言起源与使用指南，永久查阅' },",
    "{ to: '/products/subscription', key: 'nav.subscription', desc: '语言起源与使用指南，永久查阅', icon: 'book' },")
rep("{ to: '/products/specialized', key: 'nav.specialized', desc: '项目驱动的分期系列教程' },",
    "{ to: '/products/specialized', key: 'nav.specialized', desc: '项目驱动的分期系列教程', icon: 'layers' },")
rep("{ to: '/products/exploration', key: 'nav.exploration', desc: '面向高阶学者的连载期刊' }",
    "{ to: '/products/exploration', key: 'nav.exploration', desc: '面向高阶学者的连载期刊', icon: 'compass' }")
rep("{ to: '/assessment', key: 'nav.assessment', desc: '六维动态出题，每日免费 2 次' },",
    "{ to: '/assessment', key: 'nav.assessment', desc: '六维动态出题，每日免费 2 次', icon: 'gauge' },")
rep("{ to: '/surveys', key: 'nav.surveys', desc: '参与调研，驱动产品迭代方向' },",
    "{ to: '/surveys', key: 'nav.surveys', desc: '参与调研，驱动产品迭代方向', icon: 'poll' },")
rep("{ to: '/forum', key: 'nav.forum', desc: '发帖交流，与同频学习者讨论' },",
    "{ to: '/forum', key: 'nav.forum', desc: '发帖交流，与同频学习者讨论', icon: 'chat' },")
rep("{ to: '/search', key: 'nav.search', desc: '跨项目检索目录、公告与协议' }",
    "{ to: '/search', key: 'nav.search', desc: '跨项目检索目录、公告与协议', icon: 'search' }")
rep("{ to: '/community', key: 'nav.community', desc: 'QQ 与微信学术交流群' },",
    "{ to: '/community', key: 'nav.community', desc: 'QQ 与微信学术交流群', icon: 'users' },")
rep("{ to: '/announcements', key: 'nav.announcements', desc: '新期发布与维护安排公示' },",
    "{ to: '/announcements', key: 'nav.announcements', desc: '新期发布与维护安排公示', icon: 'megaphone' },")
rep("{ to: '/legal', key: 'footer.legal', desc: '服务协议与隐私政策公开可查' },",
    "{ to: '/legal', key: 'footer.legal', desc: '服务协议与隐私政策公开可查', icon: 'shield' },")
rep("{ to: '/account', key: 'footer.benefits', desc: '累计消费回馈四档权益' }",
    "{ to: '/account', key: 'footer.benefits', desc: '累计消费回馈四档权益', icon: 'gift' }")
rep("{ to: '/account', key: 'nav.account', desc: '已购内容、订单与评估历史' },",
    "{ to: '/account', key: 'nav.account', desc: '已购内容、订单与评估历史', icon: 'user' },")
rep("{ to: '/auth/login', key: 'nav.login', desc: '已有账户直接登录' },",
    "{ to: '/auth/login', key: 'nav.login', desc: '已有账户直接登录', icon: 'login' },")
rep("{ to: '/auth/register', key: 'nav.register', desc: '注册后解锁试读与评估' }",
    "{ to: '/auth/register', key: 'nav.register', desc: '注册后解锁试读与评估', icon: 'userplus' }")

# 2c. 面板重做：渐变顶条 + 图标 chip + 精致 hover
rep('''        <div
          className="menu-pop fixed left-1/2 top-16 z-50 w-[min(46rem,94vw)] -translate-x-1/2 rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-lift backdrop-blur"
          onMouseEnter={show}
          onMouseLeave={hide}
        >
          <div className="grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-4">
            {MEGA_GROUPS.map((g) => (
              <div key={g.titleKey}>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <span className="h-1 w-1 rounded-full bg-brand-400" />
                  {t(g.titleKey)}
                </p>
                <ul className="space-y-0.5">
                  {g.items.map((it) => (
                    <li key={it.to}>
                      <NavLink
                        to={it.to}
                        onClick={() => setOpen(false)}
                        className="group block rounded-lg px-2.5 py-2 transition hover:bg-brand-50"
                      >
                        <p className="flex items-center justify-between text-sm font-medium text-slate-800 group-hover:text-brand-700">
                          {t(it.key)}
                          <span className="text-brand-400 opacity-0 transition group-hover:opacity-100">→</span>
                        </p>
                        <p className="mt-0.5 text-xs leading-5 text-slate-400">{it.desc}</p>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
            <SiteUptime />
            <span className="text-xs text-slate-400">15 个快捷入口</span>
          </div>
        </div>''',
'''        <div
          className="menu-pop fixed left-1/2 top-16 z-50 w-[min(48rem,94vw)] -translate-x-1/2 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-[0_24px_60px_-12px_rgba(30,58,138,0.25)] backdrop-blur"
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
                        onClick={() => setOpen(false)}
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
        </div>''')

# 2d. header 底部加流动渐变光线（全站每页持续动）
rep('''        )}
      </header>

      <main className="flex-1">''',
'''        )}
        <div className="header-flow" />
      </header>

      <main className="flex-1">''')

io.open(lp, 'w', encoding='utf-8', newline='').write(s)
print('layout ok')

# ---------- 3. Home.tsx：hero 轨道环 + 漂浮符号 ----------
hp = 'src/pages/Home.tsx'
h = io.open(hp, encoding='utf-8', newline='').read()
hnl = '\r\n' if '\r\n' in h else '\n'
old = '''          <Reveal delay={250} className="self-center">
            <TiltCard max={6}>
              <HeroCodeWindow />
            </TiltCard>
          </Reveal>'''
new = '''          <Reveal delay={250} className="self-center">
            <TiltCard max={6}>
              <div className="relative">
                <div className="orbit-ring pointer-events-none absolute -inset-5 rounded-[1.8rem] border border-dashed border-brand-300/60" />
                <span className="float-chip absolute -left-5 top-8 z-10 select-none rounded-lg bg-white/95 px-2.5 py-1 font-mono text-xs font-bold text-brand-600 shadow-lift">{'</>'}</span>
                <span className="float-chip absolute -right-4 top-1/3 z-10 select-none rounded-lg bg-white/95 px-2.5 py-1 font-mono text-xs font-bold text-accent-600 shadow-lift" style={{ animationDelay: '-1.8s' }}>λ</span>
                <span className="float-chip absolute -bottom-4 left-1/4 z-10 select-none rounded-lg bg-white/95 px-2.5 py-1 font-mono text-xs font-bold text-emerald-600 shadow-lift" style={{ animationDelay: '-3.2s' }}>{'{ }'}</span>
                <HeroCodeWindow />
              </div>
            </TiltCard>
          </Reveal>'''
o = old.replace('\n', hnl)
assert o in h, 'hero block not found'
h = h.replace(o, new.replace('\n', hnl), 1)
io.open(hp, 'w', encoding='utf-8', newline='').write(h)
print('home ok')
