import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { BRAND, COMPANY_CN, COMPANY_EN, CONTACT_EMAIL } from '../lib/types';
import { ScrollProgress } from './fx';

const NAV = [
  { to: '/', label: '首页' },
  { to: '/products/subscription', label: '订阅式项目' },
  { to: '/products/specialized', label: '专研式项目' },
  { to: '/products/exploration', label: '探索式项目' },
  { to: '/assessment', label: '免费评估' },
  { to: '/community', label: '学术社群' },
  { to: '/announcements', label: '公告' },
  { to: '/search', label: '搜索' }
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

export default function Layout() {
  const { profile, logout, mode } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <ScrollProgress />
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="container-x flex h-16 items-center justify-between gap-4">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm transition ${
                    isActive ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            {mode === 'local' && (
              <span className="badge bg-amber-50 text-amber-700">演示模式</span>
            )}
            {profile ? (
              <>
                {profile.role === 'admin' && (
                  <Link to="/admin" className="btn-ghost">管理端</Link>
                )}
                <Link to="/account" className="btn-outline">{profile.nickname || profile.email}</Link>
                <button className="btn-ghost" onClick={() => logout()}>退出</button>
              </>
            ) : (
              <>
                <Link to="/auth/login" className="btn-ghost">登录</Link>
                <Link to="/auth/register" className="btn-primary">注册</Link>
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
              {NAV.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-2.5 text-sm ${isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600'}`
                  }
                >
                  {n.label}
                </NavLink>
              ))}
              <div className="mt-2 flex gap-2">
                {profile ? (
                  <>
                    <Link to="/account" className="btn-outline flex-1" onClick={() => setOpen(false)}>用户中心</Link>
                    <button className="btn-ghost flex-1" onClick={() => { logout(); setOpen(false); }}>退出</button>
                  </>
                ) : (
                  <>
                    <Link to="/auth/login" className="btn-outline flex-1" onClick={() => setOpen(false)}>登录</Link>
                    <Link to="/auth/register" className="btn-primary flex-1" onClick={() => setOpen(false)}>注册</Link>
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
        <div className="container-x grid gap-8 py-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <Logo />
            <p className="mt-3 max-w-sm text-sm leading-6 text-slate-500">
              {COMPANY_CN}有限公司出品。AI (artificial intelligence) for everyone, coding 赋能 everyone。
            </p>
            <p className="mt-2 text-sm text-slate-500">
              联系邮箱：
              <a className="text-brand-600 hover:underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
              （负责人 JTQ）
            </p>
          </div>
          <div>
            <p className="mb-3 text-sm font-semibold text-slate-800">内容门类</p>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><Link className="hover:text-brand-600" to="/products/subscription">订阅式项目</Link></li>
              <li><Link className="hover:text-brand-600" to="/products/specialized">专研式项目</Link></li>
              <li><Link className="hover:text-brand-600" to="/products/exploration">探索式项目</Link></li>
              <li><Link className="hover:text-brand-600" to="/assessment">免费能力评估</Link></li>
            </ul>
          </div>
          <div>
            <p className="mb-3 text-sm font-semibold text-slate-800">协议与声明</p>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><Link className="hover:text-brand-600" to="/legal/terms-of-service">用户服务协议</Link></li>
              <li><Link className="hover:text-brand-600" to="/legal/purchase-agreement">数字内容购买协议</Link></li>
              <li><Link className="hover:text-brand-600" to="/legal/privacy-policy">隐私政策</Link></li>
              <li><Link className="hover:text-brand-600" to="/legal/anti-fraud">举报与反假冒声明</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-100 py-4 text-center text-xs text-slate-400">
          {BRAND} · {COMPANY_CN}有限公司 · 保留所有权利
        </div>
      </footer>
    </div>
  );
}
