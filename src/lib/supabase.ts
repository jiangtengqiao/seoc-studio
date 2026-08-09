import { createClient, type SupabaseClient, type Session } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isCloudEnabled = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isCloudEnabled
  ? createClient(url as string, anonKey as string)
  : null;

const LS_SESSION = 'seoc.local.session';
const LS_USERS = 'seoc.local.users';

interface LocalUser {
  id: string;
  email: string;
  password: string;
  nickname: string;
  role: 'user' | 'admin';
}

function readUsers(): LocalUser[] {
  try {
    return JSON.parse(localStorage.getItem(LS_USERS) || '[]');
  } catch {
    return [];
  }
}

function writeUsers(users: LocalUser[]) {
  localStorage.setItem(LS_USERS, JSON.stringify(users));
}

export interface AuthResult {
  ok: boolean;
  message: string;
}

export async function localRegister(email: string, password: string, nickname: string): Promise<AuthResult> {
  const users = readUsers();
  if (users.some((u) => u.email === email)) return { ok: false, message: '该邮箱已注册' };
  const user: LocalUser = {
    id: 'local-' + Math.random().toString(36).slice(2, 10),
    email,
    password,
    nickname,
    role: users.length === 0 ? 'admin' : 'user'
  };
  users.push(user);
  writeUsers(users);
  localStorage.setItem(LS_SESSION, JSON.stringify({ userId: user.id, email: user.email }));
  return { ok: true, message: '注册成功' };
}

export async function localLogin(email: string, password: string): Promise<AuthResult> {
  const user = readUsers().find((u) => u.email === email && u.password === password);
  if (!user) return { ok: false, message: '邮箱或密码不正确' };
  localStorage.setItem(LS_SESSION, JSON.stringify({ userId: user.id, email: user.email }));
  return { ok: true, message: '登录成功' };
}

export function localLogout() {
  localStorage.removeItem(LS_SESSION);
}

export function localSession(): { userId: string; email: string } | null {
  try {
    return JSON.parse(localStorage.getItem(LS_SESSION) || 'null');
  } catch {
    return null;
  }
}

export function localUserOf(userId: string): LocalUser | null {
  return readUsers().find((u) => u.id === userId) || null;
}

export function localResetPassword(email: string, newPassword: string): AuthResult {
  const users = readUsers();
  const idx = users.findIndex((u) => u.email === email);
  if (idx < 0) return { ok: false, message: '未找到该邮箱对应的账户' };
  users[idx].password = newPassword;
  writeUsers(users);
  return { ok: true, message: '密码已重置，请使用新密码登录' };
}

export type { Session };
