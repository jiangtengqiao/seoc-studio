import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useTheme, type ThemeMode } from '../lib/theme';
import { LANGS, useI18n } from '../lib/i18n';
import { BRAND, COMPANY_CN, COMPANY_EN, CONTACT_EMAIL } from '../lib/types';
import { ScrollProgress } from './fx';

const NAV_KEYS = [
  { to: '/', key: 'nav.home' },
  { to: '/products/subscription', key: 'nav.subscription' },
  { to: '/products/specialized', key: 'nav.specialized' },
  { to: '/products/exploration', key: 'nav.exploration' },
  { to: '/assessment', key: 'nav.assessment' },
  { to: '/surveys', key: 'nav.surveys' },
  { to: '/forum', key: 'nav.forum' },
  { to: '/community', key: 'nav.community' },
  { to: '/announcements', key: 'nav.announcements' },
  { to: '/search', key: 'nav.search' }
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
        <div className="absolute right-0 top-full z-50 mt-1 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lift">
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

export default function Layout() {
  const { profile, logout, mode } = useAuth();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <ScrollProgress />
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="container-x flex h-16 items-center justify-between gap-4">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            {NAV_KEYS.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm transition ${
                    isActive ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                {t(n.key)}
              </NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-1 md:flex">
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
            className="rounded-lg p-2 hover:bg-slate-100 md:hidden"
            onClick={() => setOpen(!open)}
            aria-label="菜单"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>
        {open && (
          <div className="border-t border-slate-200 bg-white md:hidden">
            <div className="container-x flex flex-col gap-1 py-3">
              {NAV_KEYS.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-2.5 text-sm ${isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600'}`
                  }
                >
                  {t(n.key)}
                </NavLink>
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
