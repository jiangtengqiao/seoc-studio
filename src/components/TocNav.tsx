import { useEffect, useMemo, useState } from 'react';

export interface TocItem {
  id: string;
  level: 2 | 3;
  text: string;
}

/** 从 Markdown 正文提取二三级标题作为大纲 */
export function extractToc(markdown: string): TocItem[] {
  const items: TocItem[] = [];
  const re = /^(#{2,3})\s+(.+?)\s*$/gm;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(markdown)) !== null) {
    items.push({
      id: `sec-${i}`,
      level: m[1].length as 2 | 3,
      text: m[2].replace(/[#*`]/g, '').trim()
    });
    i++;
  }
  return items;
}

/** 滚动监听：返回当前可视的标题 id */
function useScrollSpy(ids: string[]) {
  const [active, setActive] = useState<string>('');
  useEffect(() => {
    if (ids.length === 0) return;
    const onScroll = () => {
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 120) current = id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [ids]);
  return active;
}

export function jumpTo(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const y = el.getBoundingClientRect().top + window.scrollY - 84;
  window.scrollTo({ top: y, behavior: 'smooth' });
}

/** 桌面端右侧粘性大纲导航 */
export function TocSidebar({ toc }: { toc: TocItem[] }) {
  const ids = useMemo(() => toc.map((t) => t.id), [toc]);
  const active = useScrollSpy(ids);
  const progress = ids.length ? (ids.indexOf(active) + 1) / ids.length : 0;
  if (toc.length === 0) return null;
  return (
    <aside className="sticky top-24 hidden max-h-[calc(100vh-8rem)] w-60 shrink-0 overflow-y-auto xl:block">
      <p className="mb-3 font-mono text-[10px] tracking-widest text-slate-400">ON THIS PAGE · 本篇导航</p>
      <div className="mb-3 h-1 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500 transition-all duration-300" style={{ width: `${Math.max(4, progress * 100)}%` }} />
      </div>
      <nav className="space-y-0.5 border-l border-slate-200">
        {toc.map((item) => (
          <button
            key={item.id}
            onClick={() => jumpTo(item.id)}
            className={`block w-full truncate py-1.5 text-left text-xs leading-5 transition ${
              item.level === 3 ? 'pl-7' : 'pl-3'
            } ${
              active === item.id
                ? '-ml-px border-l-2 border-brand-500 font-medium text-brand-700'
                : 'text-slate-500 hover:text-brand-600'
            }`}
            title={item.text}
          >
            {item.text}
          </button>
        ))}
      </nav>
    </aside>
  );
}

/** 移动端顶部可折叠大纲 */
export function TocMobile({ toc }: { toc: TocItem[] }) {
  const [open, setOpen] = useState(false);
  if (toc.length === 0) return null;
  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-white xl:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-slate-800"
      >
        <span>本篇导航（{toc.length} 节）</span>
        <span className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && (
        <nav className="max-h-64 space-y-0.5 overflow-y-auto border-t border-slate-100 p-2">
          {toc.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                jumpTo(item.id);
                setOpen(false);
              }}
              className={`block w-full truncate rounded-lg px-3 py-2 text-left text-xs text-slate-600 hover:bg-brand-50 hover:text-brand-700 ${
                item.level === 3 ? 'pl-6' : ''
              }`}
            >
              {item.text}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
