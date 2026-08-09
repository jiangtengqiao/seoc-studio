import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { FieldError } from '../components/ui';

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function callFn(name: string, body: Record<string, unknown>): Promise<string | null> {
  if (!supabase) return '演示模式不支持邮件验证码';
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    try {
      const j = await (error as { context?: Response }).context?.json();
      if (j?.error) return j.error as string;
    } catch {
      /* ignore */
    }
    return error.message;
  }
  if ((data as { error?: string })?.error) return (data as { error: string }).error;
  return null;
}

function AuthShell({ title, sub, children, wide }: { title: string; sub?: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className="relative overflow-hidden">
      <div className="mesh-orb left-[10%] top-[5%] h-64 w-64 bg-brand-300/50" />
      <div className="mesh-orb right-[8%] bottom-[10%] h-72 w-72 bg-accent-400/30" style={{ animationDelay: '-5s' }} />
      <div className="container-x relative flex justify-center py-14">
        <div
          className={`card w-full ${wide ? 'max-w-lg' : 'max-w-md'} p-8`}
          style={{ animation: 'rise-in 0.6s cubic-bezier(0.22,1,0.36,1) both' }}
        >
          <h1 className="text-xl font-bold text-brand-950">{title}</h1>
          {sub && <p className="mt-1 text-sm text-slate-500">{sub}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

function CodeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      className="input text-center font-mono !text-2xl !tracking-[0.5em] uppercase"
      maxLength={6}
      placeholder="······"
      value={value}
      onChange={(e) => onChange(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
      autoComplete="one-time-code"
    />
  );
}

function ResendLink({ onSend, cooldownKey }: { onSend: () => Promise<string | null>; cooldownKey: string }) {
  const [left, setLeft] = useState(() => {
    const until = Number(localStorage.getItem(cooldownKey) || 0);
    return Math.max(0, Math.ceil((until - Date.now()) / 1000));
  });
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (left <= 0) return;
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [left]);

  return (
    <div className="flex items-center justify-between text-xs text-slate-500">
      <span>{msg || '验证码 10 分钟内有效'}</span>
      <button
        type="button"
        disabled={left > 0}
        className="font-medium text-brand-600 hover:underline disabled:text-slate-400 disabled:no-underline"
        onClick={async () => {
          const err = await onSend();
          if (err) return setMsg(err);
          localStorage.setItem(cooldownKey, String(Date.now() + 60_000));
          setLeft(60);
          setMsg('已重新发送，请查收');
        }}
      >
        {left > 0 ? `${left}s 后可重发` : '重新发送'}
      </button>
    </div>
  );
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
  const { register, login: loginAfterRegister, mode } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [code, setCode] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const cloud = mode === 'cloud';

  async function sendCode(): Promise<string | null> {
    return callFn('send-code', { email, purpose: 'register' });
  }

  async function stepOne(e: FormEvent) {
    e.preventDefault();
    if (nickname.trim().length < 2) return setErr('昵称至少 2 个字符');
    if (!validEmail(email)) return setErr('请输入正确的邮箱地址');
    if (password.length < 8) return setErr('密码至少 8 位');
    if (password !== confirm) return setErr('两次输入的密码不一致');
    setErr(null);
    if (!cloud) {
      setBusy(true);
      const msg = await register(email, password, nickname.trim());
      setBusy(false);
      if (msg) return setErr(msg);
      nav('/account');
      return;
    }
    setBusy(true);
    const sendErr = await sendCode();
    setBusy(false);
    if (sendErr) return setErr(sendErr);
    localStorage.setItem('seoc.cd.register', String(Date.now() + 60_000));
    setStep(2);
  }

  async function stepTwo(e: FormEvent) {
    e.preventDefault();
    if (code.length !== 6) return setErr('请输入 6 位验证码');
    setErr(null);
    setBusy(true);
    const rErr = await callFn('register-user', { email, code, password, nickname: nickname.trim() });
    if (rErr) {
      setBusy(false);
      return setErr(rErr);
    }
    const msg = await loginAfterRegister(email, password);
    setBusy(false);
    if (msg) return setErr(msg);
    nav('/account');
  }

  return (
    <AuthShell
      title="注册"
      sub={cloud ? (step === 1 ? '第一步：填写账户信息。' : `第二步：验证码已发送至 ${email}`) : '演示模式：直接注册，无需验证码。'}
    >
      {step === 1 ? (
        <form onSubmit={stepOne} className="space-y-4" noValidate style={{ animation: 'rise-in 0.4s ease both' }}>
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
          <button className="btn-primary w-full" disabled={busy}>{busy ? '处理中' : cloud ? '发送验证码' : '注册'}</button>
          <p className="text-center text-xs text-slate-400">注册即表示同意《用户服务协议》与《隐私政策》</p>
        </form>
      ) : (
        <form onSubmit={stepTwo} className="space-y-4" noValidate style={{ animation: 'rise-in 0.4s ease both' }}>
          <div>
            <label className="label">邮件验证码</label>
            <CodeInput value={code} onChange={setCode} />
          </div>
          <ResendLink onSend={sendCode} cooldownKey="seoc.cd.register" />
          <FieldError msg={err} />
          <button className="btn-primary w-full" disabled={busy}>{busy ? '验证中' : '完成注册'}</button>
          <button type="button" className="btn-ghost w-full" onClick={() => setStep(1)}>返回修改信息</button>
        </form>
      )}
      <p className="mt-4 text-center text-sm">
        已有账户？<Link className="text-brand-600 hover:underline" to="/auth/login">直接登录</Link>
      </p>
    </AuthShell>
  );
}

export function ResetPage() {
  const { resetPassword, mode } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const cloud = mode === 'cloud';

  async function sendCode(): Promise<string | null> {
    return callFn('send-code', { email, purpose: 'reset' });
  }

  async function stepOne(e: FormEvent) {
    e.preventDefault();
    if (!validEmail(email)) return setErr('请输入正确的邮箱地址');
    setErr(null);
    setBusy(true);
    if (!cloud) {
      setBusy(false);
      setStep(2);
      return;
    }
    const sendErr = await sendCode();
    setBusy(false);
    if (sendErr) return setErr(sendErr);
    localStorage.setItem('seoc.cd.reset', String(Date.now() + 60_000));
    setStep(2);
  }

  async function stepTwo(e: FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) return setErr('新密码至少 8 位');
    setErr(null);
    setBusy(true);
    if (!cloud) {
      const m = await resetPassword(email, newPassword);
      setBusy(false);
      if (m) return setErr(m);
      setMsg('密码已重置，请返回登录。');
      return;
    }
    if (code.length !== 6) {
      setBusy(false);
      return setErr('请输入 6 位验证码');
    }
    const rErr = await callFn('reset-password', { email, code, password: newPassword });
    setBusy(false);
    if (rErr) return setErr(rErr);
    setMsg('密码已重置成功，正在跳转登录页。');
    setTimeout(() => nav('/auth/login'), 1500);
  }

  return (
    <AuthShell title="忘记密码" sub={cloud ? (step === 1 ? '我们将向您的注册邮箱发送验证码。' : `验证码已发送至 ${email}`) : '演示模式下可直接设置新密码。'}>
      {step === 1 ? (
        <form onSubmit={stepOne} className="space-y-4" noValidate>
          <div>
            <label className="label" htmlFor="email">注册邮箱</label>
            <input id="email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <FieldError msg={err} />
          <button className="btn-primary w-full" disabled={busy}>{busy ? '发送中' : cloud ? '发送验证码' : '下一步'}</button>
        </form>
      ) : (
        <form onSubmit={stepTwo} className="space-y-4" noValidate>
          {cloud && (
            <>
              <div>
                <label className="label">邮件验证码</label>
                <CodeInput value={code} onChange={setCode} />
              </div>
              <ResendLink onSend={sendCode} cooldownKey="seoc.cd.reset" />
            </>
          )}
          <div>
            <label className="label" htmlFor="np">新密码</label>
            <input id="np" className="input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <FieldError msg={err} />
          {msg && <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">{msg}</p>}
          <button className="btn-primary w-full" disabled={busy}>{busy ? '处理中' : '重置密码'}</button>
        </form>
      )}
      <p className="mt-4 text-center text-sm">
        <Link className="text-brand-600 hover:underline" to="/auth/login">返回登录</Link>
      </p>
    </AuthShell>
  );
}
