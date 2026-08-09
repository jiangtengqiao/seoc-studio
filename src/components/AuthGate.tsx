import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Spinner } from './ui';

export function useLoginRedirect(): string {
  const loc = useLocation();
  return `/auth/login?next=${encodeURIComponent(loc.pathname + loc.search)}`;
}

export function RequireAuth({
  children,
  reason
}: {
  children: ReactNode;
  reason?: string;
}) {
  const { profile, loading } = useAuth();
  const redirect = useLoginRedirect();

  if (loading) return <Spinner />;
  if (!profile) {
    return (
      <div className="container-x flex justify-center py-20">
        <div className="card max-w-md p-8 text-center">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2554eb" strokeWidth="2">
              <rect x="5" y="11" width="14" height="9" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
          </span>
          <h2 className="text-lg font-bold text-brand-950">此内容需要登录</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {reason || '本平台正文内容仅对注册用户开放。注册免费，登录后即可继续。'}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link to={redirect} className="btn-primary">登录</Link>
            <Link to="/auth/register" className="btn-outline">免费注册</Link>
          </div>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
