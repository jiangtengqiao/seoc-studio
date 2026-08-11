import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useTheme, type ThemeMode } from '../lib/theme';
import { LANGS, useI18n } from '../lib/i18n';
import { BRAND, COMPANY_CN, COMPANY_EN, CONTACT_EMAIL } from '../lib/types';
import { BackToTop, ScrollProgress, SiteUptime } from './fx';

/** 主导航常驻项 */
const PRIMARY_NAV = [
  { to: '/', key: 'nav.home' },
  { to: '/products/subscription', key: 'nav.subscription' },
  { to: '/products/specialized', key: 'nav.specialized' },
  { to: '/products/exploration', key: 'nav.exploration' },
  { to: '/assessment', key: 'nav.assessment' }
];

/** 「全部导航」折叠面板的分组快捷入口 */
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
};
const MEGA_GROUPS: { titleKey: string; items: MegaItem[] }[] = [
  {
    titleKey: 'nav.groupProducts',
    items: [
      { to: '/products', key: 'nav.products', desc: '三大门类完整目录与定价总览', icon: 'grid' },
      { to: '/products/subscription', key: 'nav.subscription', desc: '语言起源与使用指南，永久查阅', icon: 'book' },
      { to: '/products/specialized', key: 'nav.specialized', desc: '项目驱动的分期系列教程', icon: 'layers' },
      { to: '/products/exploration', key: 'nav.exploration', desc: '面向高阶学者的连载期刊', icon: 'compass' }
    ]
  },
  {
    titleKey: 'nav.groupLearn',
    items: [
      { to: '/assessment', key: 'nav.assessment', desc: '六维动态出题，每日免费 2 次', icon: 'gauge' },
      { to: '/surveys', key: 'nav.surveys', desc: '参与调研，驱动产品迭代方向', icon: 'poll' },
      { to: '/forum', key: 'nav.forum', desc: '发帖交流，与同频学习者讨论', icon: 'chat' },
      { to: '/search', key: 'nav.search', desc: '跨项目检索目录、公告与协议', icon: 'search' }
    ]
  },
  {
    titleKey: 'nav.groupCommunity',
    items: [
      { to: '/community', key: 'nav.community', desc: 'QQ 与微信学术交流群', icon: 'users' },
      { to: '/announcements', key: 'nav.announcements', desc: '新期发布与维护安排公示', icon: 'megaphone' },
      { to: '/legal', key: 'footer.legal', desc: '服务协议与隐私政策公开可查', icon: 'shield' },
      { to: '/account', key: 'footer.benefits', desc: '累计消费回馈四档权益', icon: 'gift' }
    ]
  },
  {
    titleKey: 'nav.groupAccount',
    items: [
      { to: '/account', key: 'nav.account', desc: '已购内容、订单与评估历史', icon: 'user' },
      { to: '/auth/login', key: 'nav.login', desc: '已有账户直接登录', icon: 'login' },
      { to: '/auth/register', key: 'nav.register', desc: '注册后解锁试读与评估', icon: 'userplus' }
    ]
  }
];

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-800 font-mono text-lg font-bold text-white shadow-lift">
        R
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-bold tracking-wide text-brand-950">
          SEOC <span className="mark-r">Studio</span>
        </span>
        <span className="block text-[10px] text-slate-500">{COMPANY_EN}</span>
      </span>
    </Link>
  );
}

const THEME_ICONS: Record<ThemeMode, JSX.Element> = {
  system: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  ),
  light: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  ),
  dark: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  )
};

function ThemeToggle() {
  const { mode, cycle } = useTheme();
  const { t } = useI18n();
  const label = t(`theme.${mode}`);
  return (
    <button
      onClick={cycle}
      title={label}
      aria-label={label}
      className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-slate-600 transition hover:bg-slate-100"
    >
      {THEME_ICONS[mode]}
      <span className="hidden text-xs lg:inline">{label}</span>
    </button>
  );
}

function LangMenu() {
  const { lang, setLang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const current = LANGS.find((l) => l.code === lang)!;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        title={t('lang.label')}
        aria-label={t('lang.label')}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-slate-600 transition hover:bg-slate-100"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3z" />
        </svg>
        <span className="hidden text-xs lg:inline">{current.native}</span>
      </button>
      {open && (
        <div className="menu-pop absolute right-0 top-full z-50 mt-1 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lift">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                setLang(l.code);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition hover:bg-brand-50 ${
                l.code === lang ? 'font-medium text-brand-700' : 'text-slate-700'
              }`}
            >
              {l.native}
              {l.code === lang && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** 「全部导航」折叠面板：悬浮或点击箭头展开分组快捷导航 */
function MoreNav() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const hide = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 140);
  };

  return (
    <div onMouseEnter={show} onMouseLeave={hide}>
      <button
        onClick={() => setOpen(!open)}
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
      {open && (
        <div
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
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const { profile, logout, mode } = useAuth();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <ScrollProgress />
      <BackToTop />
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="container-x flex h-16 items-center justify-between gap-4">
          <Logo />
          <nav className="hidden items-center gap-1 lg:flex">
            {PRIMARY_NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === '/'}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm transition ${
                    isActive ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                {t(n.key)}
              </NavLink>
            ))}
            <MoreNav />
          </nav>
          <div className="hidden items-center gap-1 lg:flex">
            <LangMenu />
            <ThemeToggle />
            {mode === 'local' && <span className="badge bg-amber-50 text-amber-700">{t('nav.demo')}</span>}
            {profile ? (
              <>
                {profile.role === 'admin' && (
                  <Link to="/admin" className="btn-ghost">{t('nav.admin')}</Link>
                )}
                <Link to="/account" className="btn-outline">{profile.nickname || profile.email}</Link>
                <button className="btn-ghost" onClick={() => logout()}>{t('nav.logout')}</button>
              </>
            ) : (
              <>
                <Link to="/auth/login" className="btn-ghost">{t('nav.login')}</Link>
                <Link to="/auth/register" className="btn-primary">{t('nav.register')}</Link>
              </>
            )}
          </div>
          <button
            className="rounded-lg p-2 hover:bg-slate-100 lg:hidden"
            onClick={() => setOpen(!open)}
            aria-label="菜单"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>
        {open && (
          <div className="border-t border-slate-200 bg-white lg:hidden">
            <div className="container-x flex max-h-[70vh] flex-col gap-1 overflow-y-auto py-3">
              {MEGA_GROUPS.map((g) => (
                <div key={g.titleKey} className="mb-2">
                  <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {t(g.titleKey)}
                  </p>
                  {g.items.map((n) => (
                    <NavLink
                      key={n.to}
                      to={n.to}
                      onClick={() => setOpen(false)}
                      className={({ isActive }) =>
                        `block rounded-lg px-3 py-2.5 text-sm ${isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600'}`
                      }
                    >
                      {t(n.key)}
                      <span className="ml-2 text-xs text-slate-400">{n.desc}</span>
                    </NavLink>
                  ))}
                </div>
              ))}
              <div className="mt-2 flex items-center gap-2">
                <LangMenu />
                <ThemeToggle />
              </div>
              <div className="mt-2 flex gap-2">
                {profile ? (
                  <>
                    <Link to="/account" className="btn-outline flex-1" onClick={() => setOpen(false)}>
                      {t('nav.account')}
                    </Link>
                    <button className="btn-ghost flex-1" onClick={() => { logout(); setOpen(false); }}>
                      {t('nav.logout')}
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/auth/login" className="btn-outline flex-1" onClick={() => setOpen(false)}>
                      {t('nav.login')}
                    </Link>
                    <Link to="/auth/register" className="btn-primary flex-1" onClick={() => setOpen(false)}>
                      {t('nav.register')}
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
        <div className="header-flow" />
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="mt-16 border-t border-slate-200 bg-white">
        <div className="container-x grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="sm:col-span-2">
            <Logo />
            <p className="mt-3 max-w-sm text-sm leading-6 text-slate-500">
              {COMPANY_CN}有限公司出品。AI (artificial intelligence) for everyone, coding 赋能 everyone。
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {t('footer.contact')}：
              <a className="text-brand-600 hover:underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
              （负责人 JTQ）
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              凡与官网公示价格不一致的渠道均属假冒，欢迎通过官方邮箱举报，举报有奖。
            </p>
            <p className="mt-3">
              <SiteUptime />
            </p>
          </div>
          <div>
            <p className="mb-3 text-sm font-semibold text-slate-800">{t('footer.categories')}</p>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><Link className="hover:text-brand-600" to="/products/subscription">{t('nav.subscription')}</Link></li>
              <li><Link className="hover:text-brand-600" to="/products/specialized">{t('nav.specialized')}</Link></li>
              <li><Link className="hover:text-brand-600" to="/products/exploration">{t('nav.exploration')}</Link></li>
              <li><Link className="hover:text-brand-600" to="/assessment">{t('footer.assessment')}</Link></li>
            </ul>
          </div>
          <div>
            <p className="mb-3 text-sm font-semibold text-slate-800">{t('footer.features')}</p>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><Link className="hover:text-brand-600" to="/surveys">{t('nav.surveys')}</Link></li>
              <li><Link className="hover:text-brand-600" to="/forum">{t('nav.forum')}</Link></li>
              <li><Link className="hover:text-brand-600" to="/community">{t('footer.community')}</Link></li>
              <li><Link className="hover:text-brand-600" to="/announcements">{t('footer.announcements')}</Link></li>
              <li><Link className="hover:text-brand-600" to="/search">{t('footer.search')}</Link></li>
              <li><Link className="hover:text-brand-600" to="/account">{t('footer.benefits')}</Link></li>
            </ul>
          </div>
          <div>
            <p className="mb-3 text-sm font-semibold text-slate-800">{t('footer.legal')}</p>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><Link className="hover:text-brand-600" to="/legal/terms-of-service">{t('footer.terms')}</Link></li>
              <li><Link className="hover:text-brand-600" to="/legal/purchase-agreement">{t('footer.purchase')}</Link></li>
              <li><Link className="hover:text-brand-600" to="/legal/privacy-policy">{t('footer.privacy')}</Link></li>
              <li><Link className="hover:text-brand-600" to="/legal/anti-fraud">{t('footer.antifraud')}</Link></li>
              <li><Link className="hover:text-brand-600" to="/legal/maintenance-policy">{t('footer.maintenance')}</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-100 py-4 text-center text-xs text-slate-400">
          {BRAND} · {COMPANY_CN}有限公司 · {t('footer.rights')}
        </div>
      </footer>
    </div>
  );
}
