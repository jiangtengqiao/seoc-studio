import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { FieldError } from '../components/ui';

function AuthShell({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="container-x flex justify-center py-14">
      <div className="card w-full max-w-md p-8">
        <h1 className="text-xl font-bold text-brand-950">{title}</h1>
        {sub && <p className="mt-1 text-sm text-slate-500">{sub}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!validEmail(email)) return setErr('请输入正确的邮箱地址');
    if (password.length < 6) return setErr('密码至少 6 位');
    setErr(null);
    setBusy(true);
    const msg = await login(email, password);
    setBusy(false);
    if (msg) return setErr(msg);
    nav(params.get('next') || '/account');
  }

  return (
    <AuthShell title="登录" sub="欢迎回到 SEOC Studio。">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label className="label" htmlFor="email">邮箱</label>
          <input id="email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="pwd">密码</label>
          <input id="pwd" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </div>
        <FieldError msg={err} />
        <button className="btn-primary w-full" disabled={busy}>{busy ? '登录中' : '登录'}</button>
      </form>
      <div className="mt-4 flex justify-between text-sm">
        <Link className="text-brand-600 hover:underline" to="/auth/reset">忘记密码</Link>
        <Link className="text-brand-600 hover:underline" to="/auth/register">注册新账户</Link>
      </div>
    </AuthShell>
  );
}

export function RegisterPage() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (nickname.trim().length < 2) return setErr('昵称至少 2 个字符');
    if (!validEmail(email)) return setErr('请输入正确的邮箱地址');
    if (password.length < 8) return setErr('密码至少 8 位');
    if (password !== confirm) return setErr('两次输入的密码不一致');
    setErr(null);
    setBusy(true);
    const msg = await register(email, password, nickname.trim());
    setBusy(false);
    if (msg) return setErr(msg);
    nav('/account');
  }

  return (
    <AuthShell title="注册" sub="注册即表示同意《用户服务协议》与《隐私政策》。">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label className="label" htmlFor="nick">昵称</label>
          <input id="nick" className="input" value={nickname} onChange={(e) => setNickname(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="email">邮箱</label>
          <input id="email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="pwd">密码</label>
          <input id="pwd" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </div>
        <div>
          <label className="label" htmlFor="pwd2">确认密码</label>
          <input id="pwd2" className="input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
        </div>
        <FieldError msg={err} />
        <button className="btn-primary w-full" disabled={busy}>{busy ? '注册中' : '注册'}</button>
      </form>
      <p className="mt-4 text-center text-sm">
        已有账户？<Link className="text-brand-600 hover:underline" to="/auth/login">直接登录</Link>
      </p>
    </AuthShell>
  );
}

export function ResetPage() {
  const { resetPassword, mode } = useAuth();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!validEmail(email)) return setErr('请输入正确的邮箱地址');
    setErr(null);
    setMsg(null);
    setBusy(true);
    if (mode === 'cloud') {
      const m = await resetPassword(email);
      setBusy(false);
      if (m) return setErr(m);
      setMsg('重置邮件已发送，请查收邮箱并按指引设置新密码。');
    } else {
      if (newPassword.length < 8) {
        setBusy(false);
        return setErr('新密码至少 8 位');
      }
      const m = await resetPassword(email, newPassword);
      setBusy(false);
      if (m) return setErr(m);
      setMsg('密码已重置，请返回登录。');
    }
  }

  return (
    <AuthShell title="忘记密码" sub={mode === 'cloud' ? '我们将向您的邮箱发送重置链接。' : '演示模式下可直接设置新密码。'}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label className="label" htmlFor="email">注册邮箱</label>
          <input id="email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {mode === 'local' && (
          <div>
            <label className="label" htmlFor="np">新密码</label>
            <input id="np" className="input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
        )}
        <FieldError msg={err} />
        {msg && <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">{msg}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? '处理中' : '提交'}</button>
      </form>
      <p className="mt-4 text-center text-sm">
        <Link className="text-brand-600 hover:underline" to="/auth/login">返回登录</Link>
      </p>
    </AuthShell>
  );
}
