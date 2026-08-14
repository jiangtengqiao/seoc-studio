import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

const SESSION_KEY = 'seoc.legal-consent';

export function hasConsent(): boolean {
  return sessionStorage.getItem(SESSION_KEY) === '1';
}

export function ConsentCheckbox({ on = true }: { on?: boolean }) {
  const [checked, setChecked] = useState(false);
  if (!on) return null;
  return (
    <label className="flex items-start gap-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => {
          setChecked(e.target.checked);
          if (e.target.checked) sessionStorage.setItem(SESSION_KEY, '1');
        }}
        className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-400 dark:border-slate-600 dark:bg-slate-700"
      />
      <span>
        我已阅读并同意
        <Link to="/legal/terms-of-service" className="text-brand-600 hover:underline dark:text-brand-400" target="_blank">《用户服务协议》</Link>
        、
        <Link to="/legal/privacy-policy" className="text-brand-600 hover:underline dark:text-brand-400" target="_blank">《隐私政策》</Link>
        及
        <Link to="/legal/ai-service-agreement" className="text-brand-600 hover:underline dark:text-brand-400" target="_blank">《AI 服务协议》</Link>
      </span>
    </label>
  );
}

export function ConsentGate({ children, title = '请先阅读并同意相关协议' }: { children: ReactNode; title?: string }) {
  const [agreed, setAgreed] = useState(hasConsent());
  const [checked, setChecked] = useState(false);

  if (agreed) return <>{children}</>;

  return (
    <div className="container-x flex justify-center py-16">
      <div className="card w-full max-w-md p-8 text-center" style={{ animation: 'rise-in 0.5s ease both' }}>
        <svg className="mx-auto mb-4 h-12 w-12 text-brand-300 dark:text-brand-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M9 12l2 2 4-4" />
          <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c1.66 0 3.22.45 4.56 1.24" />
        </svg>
        <h2 className="text-lg font-bold text-brand-950 dark:text-slate-100">{title}</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">请阅读并同意以下协议后方可继续使用本功能。</p>
        <div className="mt-5 space-y-1.5 text-left">
          <Link to="/legal/terms-of-service" className="block rounded-lg bg-slate-50 px-3 py-2 text-sm text-brand-600 hover:bg-brand-50 dark:bg-slate-800 dark:text-brand-400 dark:hover:bg-slate-700" target="_blank">
            《用户服务协议》 →
          </Link>
          <Link to="/legal/privacy-policy" className="block rounded-lg bg-slate-50 px-3 py-2 text-sm text-brand-600 hover:bg-brand-50 dark:bg-slate-800 dark:text-brand-400 dark:hover:bg-slate-700" target="_blank">
            《隐私政策》 →
          </Link>
          <Link to="/legal/ai-service-agreement" className="block rounded-lg bg-slate-50 px-3 py-2 text-sm text-brand-600 hover:bg-brand-50 dark:bg-slate-800 dark:text-brand-400 dark:hover:bg-slate-700" target="_blank">
            《研智助手 AI 服务协议》 →
          </Link>
          <Link to="/legal/ai-credits-policy" className="block rounded-lg bg-slate-50 px-3 py-2 text-sm text-brand-600 hover:bg-brand-50 dark:bg-slate-800 dark:text-brand-400 dark:hover:bg-slate-700" target="_blank">
            《研点购买与消费协议》 →
          </Link>
        </div>
        <label className="mt-5 flex items-start justify-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-400 dark:border-slate-600 dark:bg-slate-700"
          />
          <span>我已阅读并同意上述全部协议</span>
        </label>
        <button
          className="btn-primary mt-5 w-full disabled:opacity-40"
          disabled={!checked}
          onClick={() => {
            sessionStorage.setItem(SESSION_KEY, '1');
            setAgreed(true);
          }}
        >
          同意并继续
        </button>
      </div>
    </div>
  );
}
