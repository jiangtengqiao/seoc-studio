import { useEffect, useMemo, useState, type ReactNode } from 'react';

export interface TocItem {
  id: string;
  level: 2 | 3;
  text: string;
}

/** 从 Markdown 正文提取二三级标题作为大纲，id 与标题顺序一一对应且稳定 */
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

function textOf(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (typeof node === 'object' && 'props' in node) {
    return textOf((node as { props: { children?: ReactNode } }).props.children);
  }
  return '';
}

/**
 * 生成与 extractToc 对齐的 ReactMarkdown 标题组件。
 * 关键修复：不能用“每次渲染自增”的计数器，滚动引起的任何重渲染都会让 id 漂移。
 * 这里按“同文本出现的次数取模”定位，任意次数的重渲染都得到稳定 id。
 */
export function createHeadingComponents(toc: TocItem[]) {
  const byLevel = (level: 2 | 3) => toc.filter((t) => t.level === level);
  const render = (level: 2 | 3, counts: Map<string, number>) =>
    function Heading({ children }: { children?: ReactNode }) {
      const text = textOf(children).replace(/[#*`]/g, '').trim();
      const candidates = byLevel(level).filter((t) => t.text === text);
      let id: string | undefined;
      if (candidates.length > 0) {
        const n = counts.get(text) || 0;
        counts.set(text, n + 1);
        id = candidates[n % candidates.length].id;
      }
      return level === 2 ? <h2 id={id}>{children}</h2> : <h3 id={id}>{children}</h3>;
    };
  const counts2 = new Map<string, number>();
  const counts3 = new Map<string, number>();
  return { h2: render(2, counts2), h3: render(3, counts3) };
}

/** 滚动监听：返回当前可视的标题 id */
function useScrollSpy(ids: string[]) {
  const [active, setActive] = useState<string>('');
  useEffect(() => {
    if (ids.length === 0) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        let current = ids[0];
        for (const id of ids) {
          const el = document.getElementById(id);
          if (el && el.getBoundingClientRect().top <= 120) current = id;
        }
        setActive(current);
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
    };
  }, [ids]);
  return active;
}

export function jumpTo(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const y = el.getBoundingClientRect().top + window.scrollY - 84;
  window.scrollTo({ top: y, behavior: 'smooth' });
}

/** 桌面端右侧粘性大纲导航，可折叠 */
export function TocSidebar({ toc }: { toc: TocItem[] }) {
  const ids = useMemo(() => toc.map((t) => t.id), [toc]);
  const active = useScrollSpy(ids);
  const [collapsed, setCollapsed] = useState(false);
  if (toc.length === 0) return null;

  const activeIdx = ids.indexOf(active);

  if (collapsed) {
    return (
      <aside className="sticky top-24 hidden shrink-0 xl:block">
        <button
          onClick={() => setCollapsed(false)}
          title="展开本篇导航"
          aria-label="展开本篇导航"
          className="flex h-20 w-8 flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white text-slate-400 shadow-card transition hover:border-brand-400 hover:text-brand-600"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 6l-6 6 6 6" />
          </svg>
          <span className="text-[10px] [writing-mode:vertical-lr]">本篇导航</span>
        </button>
      </aside>
    );
  }

  return (
    <aside className="sticky top-24 hidden max-h-[calc(100vh-8rem)] w-60 shrink-0 xl:flex xl:flex-col">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-mono text-[10px] tracking-widest text-slate-400">ON THIS PAGE</p>
        <div className="flex items-center gap-2">
          <span className="text-[10px] tabular-nums text-slate-400">
            {activeIdx >= 0 ? activeIdx + 1 : 1} / {toc.length}
          </span>
          <button
            onClick={() => setCollapsed(true)}
            title="收起导航"
            aria-label="收起导航"
            className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-brand-600"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>
      <nav className="space-y-0.5 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-card">
        {toc.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => jumpTo(item.id)}
              className={`block w-full truncate rounded-lg py-1.5 pr-2 text-left text-xs leading-5 transition ${
                item.level === 3 ? 'pl-7' : 'pl-3'
              } ${
                isActive
                  ? 'bg-brand-50 font-medium text-brand-700 shadow-[inset_2px_0_0_0_theme(colors.brand.500)]'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-brand-600'
              }`}
              title={item.text}
            >
              {item.text}
            </button>
          );
        })}
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
