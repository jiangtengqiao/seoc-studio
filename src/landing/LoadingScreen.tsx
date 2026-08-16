import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const ROLE_WORDS = ['研究', '探索', '创造', '分享'];
const DURATION = 2700;

interface LoadingScreenProps {
  onComplete: () => void;
}

/**
 * 加载屏幕
 * - 全屏覆盖 fixed inset-0 z-[9999]
 * - requestAnimationFrame 在 2700ms 内从 000 计数到 100
 * - 左上角 SEOC 标签，中央轮播词，右下角计数器，底部进度条
 */
export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [count, setCount] = useState(0);
  const [roleIndex, setRoleIndex] = useState(0);

  // 计数器：2700ms 内 0 → 100
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / DURATION, 1);
      // easeOutCubic，让末段略缓
      const eased = 1 - Math.pow(1 - t, 3);
      setCount(Math.round(eased * 100));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setCount(100);
        setTimeout(onComplete, 400);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onComplete]);

  // 轮播词：每 900ms 切换
  useEffect(() => {
    const id = setInterval(() => {
      setRoleIndex((i) => (i + 1) % ROLE_WORDS.length);
    }, 900);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[9999] bg-bg flex items-center justify-center overflow-hidden"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.5, ease: 'easeInOut' } }}
    >
      {/* 左上角 SEOC 标签 */}
      <motion.div
        className="absolute left-6 top-6 md:left-10 md:top-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }}
      >
        <span className="text-xs text-muted uppercase tracking-[0.3em]">SEOC</span>
      </motion.div>

      {/* 中央轮播词 */}
      <div className="relative flex h-24 items-center justify-center overflow-hidden md:h-32 lg:h-40">
        <AnimatePresence mode="wait">
          <motion.span
            key={roleIndex}
            className="text-4xl md:text-6xl lg:text-7xl font-display italic text-text-primary/80"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            {ROLE_WORDS[roleIndex]}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* 右下角计数器 */}
      <div className="absolute bottom-10 right-6 md:bottom-16 md:right-10 lg:bottom-20 lg:right-16">
        <span className="text-6xl md:text-8xl lg:text-9xl font-display text-text-primary tabular-nums">
          {String(count).padStart(3, '0')}
        </span>
      </div>

      {/* 底部进度条 */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-stroke/50">
        <div
          className="h-full accent-gradient origin-left"
          style={{
            transform: `scaleX(${count / 100})`,
            boxShadow: '0 0 8px rgba(137,170,204,0.35)',
            transition: 'transform 0.1s linear',
          }}
        />
      </div>
    </motion.div>
  );
}
