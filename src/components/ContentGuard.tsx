import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '../lib/auth';

/* ContentGuard：正文版权防护层
 * 防护策略：
 * 1. 任意键盘操作立即黑屏，松开后自动恢复，覆盖截图、录屏、开发者工具与保存打印快捷键
 * 2. 窗口失焦、页面隐藏立即黑屏，覆盖微信、QQ、系统截图工具与其他外部应用
 * 3. PrintScreen 触发时清空剪贴板并写入版权提示
 * 4. 禁用右键菜单、复制、剪切、保存、打印、查看源码
 * 5. 双层持续移动水印，平铺登录邮箱与账户标识，截图外泄可追溯到账户
 */
export default function ContentGuard({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [blocked, setBlocked] = useState(false);
  const [reason, setReason] = useState('');
  const guardRef = useRef<HTMLDivElement>(null);
  const keyTimer = useRef<number | null>(null);

  const blackout = useCallback((why: string) => {
    setBlocked(true);
    setReason(why);
  }, []);

  const restore = useCallback(() => setBlocked(false), []);

  const scheduleKeyRestore = useCallback((delay: number) => {
    if (keyTimer.current !== null) window.clearTimeout(keyTimer.current);
    keyTimer.current = window.setTimeout(() => {
      setBlocked(false);
      keyTimer.current = null;
    }, delay);
  }, []);

  useEffect(() => {
    const guardKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const keyName = e.key === ' ' ? 'Space' : e.key;
      blackout(`检测到键盘活动 ${keyName}`);

      if (e.key === 'PrintScreen') {
        navigator.clipboard
          .writeText('SEOC Studio 内容受版权保护，禁止截取传播。')
          .catch(() => undefined);
        scheduleKeyRestore(2500);
        return;
      }
      scheduleKeyRestore(e.type === 'keyup' ? 650 : 1400);
    };

    const onBlur = () => blackout('检测到浏览器窗口失焦，外部应用行为已被隔离');
    const onFocus = () => {
      if (!document.hidden) restore();
    };
    const onVis = () => {
      if (document.hidden) blackout('检测到页面隐藏或切换');
      else restore();
    };
    const onMouseLeave = (e: MouseEvent) => {
      if (!e.relatedTarget) blackout('检测到鼠标离开浏览器窗口');
    };
    const onMouseEnter = () => {
      if (document.hasFocus() && !document.hidden) restore();
    };
    const onPrint = () => blackout('检测到打印或导出行为');
    const onMenu = (e: Event) => e.preventDefault();
    const onCopy = (e: ClipboardEvent) => e.preventDefault();
    const focusWatch = window.setInterval(() => {
      if (document.hidden || !document.hasFocus()) {
        blackout('焦点巡检发现页面已离开前台');
      }
    }, 120);

    window.addEventListener('keydown', guardKey, true);
    window.addEventListener('keyup', guardKey, true);
    window.addEventListener('keypress', guardKey, true);
    document.addEventListener('keydown', guardKey, true);
    document.addEventListener('keyup', guardKey, true);
    document.addEventListener('keypress', guardKey, true);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    window.addEventListener('beforeprint', onPrint);
    document.addEventListener('visibilitychange', onVis);
    document.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('mouseenter', onMouseEnter);
    const el = guardRef.current;
    el?.addEventListener('contextmenu', onMenu);
    el?.addEventListener('copy', onCopy);
    el?.addEventListener('cut', onCopy);
    return () => {
      if (keyTimer.current !== null) window.clearTimeout(keyTimer.current);
      window.clearInterval(focusWatch);
      window.removeEventListener('keydown', guardKey, true);
      window.removeEventListener('keyup', guardKey, true);
      window.removeEventListener('keypress', guardKey, true);
      document.removeEventListener('keydown', guardKey, true);
      document.removeEventListener('keyup', guardKey, true);
      document.removeEventListener('keypress', guardKey, true);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('beforeprint', onPrint);
      document.removeEventListener('visibilitychange', onVis);
      document.removeEventListener('mouseleave', onMouseLeave);
      document.removeEventListener('mouseenter', onMouseEnter);
      el?.removeEventListener('contextmenu', onMenu);
      el?.removeEventListener('copy', onCopy);
      el?.removeEventListener('cut', onCopy);
    };
  }, [blackout, restore, scheduleKeyRestore]);

  const watermarkText = profile
    ? `${profile.email} · ${profile.id.slice(0, 8)} · SEOC Studio`
    : 'SEOC Studio 版权保护';
  const tiles = Array.from({ length: 72 }, (_, i) => i);

  return (
    <div ref={guardRef} className="relative select-none">
      <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-hidden>
        <div className="watermark-drift absolute -inset-1/2 grid grid-cols-6 gap-x-10 gap-y-20 opacity-[0.075]">
          {tiles.map((i) => (
            <span key={i} className="whitespace-nowrap font-mono text-[15px] font-medium text-slate-900">
              {watermarkText}
            </span>
          ))}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-hidden>
        <div className="watermark-drift-reverse absolute -inset-1/2 grid grid-cols-4 gap-x-16 gap-y-24 opacity-[0.045]">
          {tiles.slice(0, 48).map((i) => (
            <span key={i} className="whitespace-nowrap font-mono text-lg font-semibold text-brand-900">
              {watermarkText}
            </span>
          ))}
        </div>
      </div>

      <div className={blocked ? 'gate-blur' : ''}>{children}</div>

      {blocked && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-brand-950/97 text-center" role="alert">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#93b4fd" strokeWidth="1.6">
            <path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          <p className="text-base font-semibold text-white">内容保护已触发</p>
          <p className="max-w-sm text-sm leading-6 text-brand-300">
            {reason}。本平台全部内容版权归编程研究与探索有限公司所有，任何形式的截取、录屏与传播均属侵权。
            异常行动结束后内容将自动恢复。
          </p>
          <p className="font-mono text-xs text-brand-400">{watermarkText}</p>
        </div>
      )}
    </div>
  );
}
