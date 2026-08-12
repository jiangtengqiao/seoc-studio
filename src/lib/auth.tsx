import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  isCloudEnabled,
  localLogin,
  localLogout,
  localRegister,
  localResetPassword,
  localSession,
  localUserOf,
  supabase
} from './supabase';
import type { Profile } from './types';

interface AuthState {
  profile: Profile | null;
  loading: boolean;
  mode: 'cloud' | 'local';
  login: (email: string, password: string) => Promise<string | null>;
  register: (email: string, password: string, nickname: string) => Promise<string | null>;
  resetPassword: (email: string, newPassword?: string) => Promise<string | null>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

function localProfile(userId: string): Profile | null {
  const u = localUserOf(userId);
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    nickname: u.nickname,
    role: u.role,
    qq_bound: false,
    wechat_bound: false,
    linked_accounts: [],
    created_at: new Date().toISOString(),
    membership_tier: 'free',
    membership_expires_at: null
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const mode: 'cloud' | 'local' = isCloudEnabled ? 'cloud' : 'local';

  const loadCloud = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) {
      setProfile(null);
      return;
    }
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setProfile(
      (p as Profile) || {
        id: user.id,
        email: user.email || '',
        nickname: null,
        role: 'user',
        qq_bound: false,
        wechat_bound: false,
        linked_accounts: [],
        created_at: user.created_at,
        membership_tier: 'free',
        membership_expires_at: null
      }
    );
  }, []);

  useEffect(() => {
    (async () => {
      if (isCloudEnabled) {
        await loadCloud();
        supabase?.auth.onAuthStateChange(() => loadCloud());
      } else {
        const s = localSession();
        setProfile(s ? localProfile(s.userId) : null);
      }
      setLoading(false);
    })();
  }, [loadCloud]);

  const login = useCallback(
    async (email: string, password: string) => {
      if (isCloudEnabled && supabase) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return error ? error.message : null;
      }
      const r = await localLogin(email, password);
      if (r.ok) {
        const s = localSession();
        setProfile(s ? localProfile(s.userId) : null);
        return null;
      }
      return r.message;
    },
    []
  );

  const register = useCallback(async (email: string, password: string, nickname: string) => {
    if (isCloudEnabled && supabase) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nickname } }
      });
      return error ? error.message : null;
    }
    const r = await localRegister(email, password, nickname);
    if (r.ok) {
      const s = localSession();
      setProfile(s ? localProfile(s.userId) : null);
      return null;
    }
    return r.message;
  }, []);

  const resetPassword = useCallback(async (email: string, newPassword?: string) => {
    if (isCloudEnabled && supabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      return error ? error.message : null;
    }
    if (!newPassword) return '本地模式需提供新密码';
    const r = localResetPassword(email, newPassword);
    return r.ok ? null : r.message;
  }, []);

  const logout = useCallback(async () => {
    if (isCloudEnabled && supabase) {
      await supabase.auth.signOut();
    } else {
      localLogout();
    }
    setProfile(null);
  }, []);

  const refresh = useCallback(async () => {
    if (isCloudEnabled) await loadCloud();
    else {
      const s = localSession();
      setProfile(s ? localProfile(s.userId) : null);
    }
  }, [loadCloud]);

  const value = useMemo(
    () => ({ profile, loading, mode, login, register, resetPassword, logout, refresh }),
    [profile, loading, mode, login, register, resetPassword, logout, refresh]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
