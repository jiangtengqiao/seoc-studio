import { useEffect, useRef, useState } from 'react';
import CountUp from 'react-countup';

interface Stat {
  value: number;
  suffix?: string;
  label: string;
}

const STATS: Stat[] = [
  { value: 3, label: '内容门类' },
  { value: 20, label: '在售项目与子项目' },
  { value: 100, suffix: '+', label: '计划连载期次' },
];

/**
 * 数据统计（第六部分）
 * - 滚动进入时计数动画
 */
export default function StatsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !started) {
            setStarted(true);
          }
        });
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [started]);

  return (
    <section className="bg-bg py-16 md:py-24 border-t border-stroke">
      <div ref={ref} className="mx-auto max-w-5xl px-4 grid grid-cols-3 gap-4 md:gap-8 text-center">
        {STATS.map((s) => (
          <div key={s.label}>
            <p className="font-display text-5xl md:text-7xl text-accent tabular-nums">
              {started ? (
                <CountUp end={s.value} duration={2} suffix={s.suffix || ''} />
              ) : (
                <span>0{s.suffix || ''}</span>
              )}
            </p>
            <p className="mt-2 md:mt-4 text-muted uppercase text-xs md:text-sm tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
