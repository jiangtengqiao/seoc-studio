import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '../lib/auth';

/* ContentGuard：正文版权防护层
 * 防护手段：
 * 1. PrintScreen 键侦测：立即黑屏并清空剪贴板
 * 2. 窗口失焦侦测：切到截图工具、录屏软件、其他应用时立即黑屏，回焦自动恢复
 * 3. 页面隐藏（visibilitychange）侦测：黑屏
 * 4. 禁用右键菜单、复制、剪切、拖选、Ctrl/Cmd+S、Ctrl/Cmd+P
 * 5. 全屏动态水印：平铺当前登录用户邮箱，截图外泄可溯源
 */
export default function ContentGuard({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [blocked, setBlocked] = useState(false);
  const [reason, setReason] = useState('');
  const guardRef = useRef<HTMLDivElement>(null);

  const blackout = useCallback((why: string) => {
    setBlocked(true);
    setReason(why);
  }, []);

  const restore = useCallback(() => setBlocked(false), []);

  useEffect(() => {
    const onKeyDown = async (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        blackout('检测到截屏按键');
        try {
          await navigator.clipboard.writeText('SEOC Studio 内容受版权保护，禁止截取传播。');
        } catch {
          /* 剪贴板不可用时忽略 */
        }
        setTimeout(restore, 3000);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && ['s', 'p', 'u'].includes(key)) {
        e.preventDefault();
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['s', 'x'].includes(key)) {
        blackout('检测到截图工具快捷键');
        setTimeout(restore, 3000);
      }
    };
    const onBlur = () => blackout('页面已失焦，内容保护中');
    const onFocus = () => restore();
    const onVis = () => {
      if (document.hidden) blackout('页面已隐藏，内容保护中');
      else restore();
    };
    const onMenu = (e: Event) => e.preventDefault();
    const onCopy = (e: ClipboardEvent) => e.preventDefault();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    const el = guardRef.current;
    el?.addEventListener('contextmenu', onMenu);
    el?.addEventListener('copy', onCopy);
    el?.addEventListener('cut', onCopy);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
      el?.removeEventListener('contextmenu', onMenu);
      el?.removeEventListener('copy', onCopy);
      el?.removeEventListener('cut', onCopy);
    };
  }, [blackout, restore]);

  const watermarkText = profile ? `${profile.email} · SEOC Studio` : 'SEOC Studio';
  const tiles = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div ref={guardRef} className="relative select-none">
      {/* 动态水印层 */}
      <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-hidden>
        <div className="absolute -inset-1/2 grid grid-cols-4 gap-y-16 opacity-[0.05]" style={{ transform: 'rotate(-18deg)' }}>
          {tiles.map((i) => (
            <span key={i} className="whitespace-nowrap font-mono text-sm text-slate-900">
              {watermarkText}
            </span>
          ))}
        </div>
      </div>

      <div className={blocked ? 'gate-blur' : ''}>{children}</div>

      {/* 黑屏遮罩 */}
      {blocked && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-brand-950/97 text-center" role="alert">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#93b4fd" strokeWidth="1.6">
            <path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          <p className="text-base font-semibold text-white">内容保护已触发</p>
          <p className="max-w-sm text-sm leading-6 text-brand-300">
            {reason}。本平台全部内容版权归编程研究与探索有限公司所有，任何形式的截取、录屏与传播均属侵权。
            回到本页面后内容将自动恢复。
          </p>
          <p className="font-mono text-xs text-brand-400">{watermarkText}</p>
        </div>
      )}
    </div>
  );
}
