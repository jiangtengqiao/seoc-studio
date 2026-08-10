import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeCtx {
  mode: ThemeMode;
  resolved: 'light' | 'dark';
  setMode: (m: ThemeMode) => void;
  cycle: () => void;
}

const Ctx = createContext<ThemeCtx>({
  mode: 'system',
  resolved: 'light',
  setMode: () => undefined,
  cycle: () => undefined
});

const STORAGE_KEY = 'seoc-theme';

function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
  });
  const [resolved, setResolved] = useState<'light' | 'dark'>(() =>
    mode === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : mode
  );

  useEffect(() => {
    const apply = () => {
      const r = mode === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : mode;
      setResolved(r);
      document.documentElement.classList.toggle('dark', r === 'dark');
    };
    apply();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [mode]);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    localStorage.setItem(STORAGE_KEY, m);
  };

  const cycle = () => {
    const order: ThemeMode[] = ['system', 'light', 'dark'];
    setMode(order[(order.indexOf(mode) + 1) % order.length]);
  };

  return <Ctx.Provider value={{ mode, resolved, setMode, cycle }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  return useContext(Ctx);
}
