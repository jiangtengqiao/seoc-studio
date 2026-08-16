import { useEffect, useRef, useState } from 'react';
import LoadingScreen from './LoadingScreen';
import LiquidNav from './LiquidNav';
import HeroBackground from './HeroBackground';
import HeroContent from './HeroContent';
import CategoryBento from './CategoryBento';
import ResearchAssistant from './ResearchAssistant';
import InfiniteSlider from './InfiniteSlider';
import LatestUpdates from './LatestUpdates';
import StatsSection from './StatsSection';
import SiteFooter from './SiteFooter';

const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smoothstep = (e0: number, e1: number, v: number) => {
  const x = clamp((v - e0) / (e1 - e0));
  return x * x * (3 - 2 * x);
};
const segmentInOut = (s: number, a: number, b: number, c: number, d: number) => {
  const enter = smoothstep(a, b, s);
  const exit = smoothstep(c, d, s);
  return { enter, exit, active: enter * (1 - exit) };
};

/**
 * SEOC Studio 品牌落地页
 * - 加载屏 → 主内容
 * - 主内容：液态灵动岛导航 + 电影级滚动舞台（hero/cards/assistant/slider 分段）
 *   + 最新动态 + 数据统计 + 页脚
 */
export default function LandingPage() {
  const [isLoading, setIsLoading] = useState(true);
  const sectionRef = useRef<HTMLElement>(null);
  const smoothRef = useRef(0);
  const targetRef = useRef(0);
  const mouseRef = useRef({ x: 0, y: 0 });
  const targetMouseRef = useRef({ x: 0, y: 0 });
  const initialized = useRef(false);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    if (isLoading) return;

    const getScrollDistance = () => {
      const el = sectionRef.current;
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      return clamp(-rect.top, 0, el.offsetHeight - window.innerHeight);
    };

    const update = () => {
      const el = sectionRef.current;
      if (!el) {
        rafId.current = null;
        return;
      }
      targetRef.current = getScrollDistance();
      if (!initialized.current) {
        smoothRef.current = targetRef.current;
        initialized.current = true;
      } else {
        smoothRef.current = lerp(smoothRef.current, targetRef.current, 0.14);
      }
      mouseRef.current.x = lerp(mouseRef.current.x, targetMouseRef.current.x, 0.12);
      mouseRef.current.y = lerp(mouseRef.current.y, targetMouseRef.current.y, 0.12);

      const s = smoothRef.current;
      const progress = clamp(s / 4000);

      // 分段进度
      const heroExit = smoothstep(0, 600, s);
      const cardEnter = segmentInOut(s, 500, 900, 1300, 1600);
      const cardExit = smoothstep(1600, 1900, s);
      const assistantEnter = segmentInOut(s, 1300, 1700, 2100, 2400);
      const sliderEnter = smoothstep(2000, 2800, s);
      const sliderControlsEnter = smoothstep(2600, 3000, s);

      const { x: mx, y: my } = mouseRef.current;

      // 各层变换值
      const backScale = 0.76 + progress * 0.2 + cardEnter.enter * 0.18 + assistantEnter.enter * 0.16;
      const backY = my * -4 + progress * -80;
      const backX = mx * -12;

      const titleY = heroExit * -210;
      const titleScale = 1 - heroExit * 0.08;
      const titleOpacity = 1 - heroExit;

      const cardScale = 1 + cardEnter.enter * 0.3 + cardExit * 0.2;
      const cardY = cardEnter.enter * -60 + cardExit * 120;
      const cardOpacity = cardEnter.active * (1 - cardExit);

      const assistantOpacity = assistantEnter.active * (1 - assistantEnter.exit);
      const assistantY = assistantEnter.enter * -80 + assistantEnter.exit * 100;

      const sliderVisible = sliderEnter > 0.01;
      const sliderX = (1 - Math.pow(sliderEnter, 1.55)) * 420; // vw
      const sliderScale = 1 / backScale;

      const controlsOpacity = sliderControlsEnter;

      const root = document.documentElement;
      root.style.setProperty('--back-scale', backScale.toFixed(4));
      root.style.setProperty('--back-x', `${backX}px`);
      root.style.setProperty('--back-y', `${backY}px`);
      root.style.setProperty('--title-y', `${titleY}px`);
      root.style.setProperty('--title-scale', titleScale.toFixed(4));
      root.style.setProperty('--title-opacity', titleOpacity.toFixed(4));
      root.style.setProperty('--card-scale', cardScale.toFixed(4));
      root.style.setProperty('--card-y', `${cardY}px`);
      root.style.setProperty('--card-opacity', cardOpacity.toFixed(4));
      root.style.setProperty('--assistant-opacity', assistantOpacity.toFixed(4));
      root.style.setProperty('--assistant-y', `${assistantY}px`);
      root.style.setProperty('--slider-x', `${sliderX}vw`);
      root.style.setProperty('--slider-scale', sliderScale.toFixed(4));
      root.style.setProperty('--slider-visible', sliderVisible ? 'visible' : 'hidden');
      root.style.setProperty('--controls-opacity', controlsOpacity.toFixed(4));
      root.style.setProperty('--mx', mx.toFixed(4));
      root.style.setProperty('--my', my.toFixed(4));

      // 继续下一帧（若未收敛）
      if (
        Math.abs(smoothRef.current - targetRef.current) > 0.08 ||
        Math.abs(mouseRef.current.x - targetMouseRef.current.x) > 0.001 ||
        Math.abs(mouseRef.current.y - targetMouseRef.current.y) > 0.001
      ) {
        rafId.current = requestAnimationFrame(update);
      } else {
        rafId.current = null;
      }
    };

    const onScroll = () => {
      if (rafId.current === null) rafId.current = requestAnimationFrame(update);
    };
    const onPointerMove = (e: PointerEvent) => {
      targetMouseRef.current.x = e.clientX / window.innerWidth - 0.5;
      targetMouseRef.current.y = e.clientY / window.innerHeight - 0.5;
      if (rafId.current === null) rafId.current = requestAnimationFrame(update);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    update();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onPointerMove);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [isLoading]);

  if (isLoading) {
    return <LoadingScreen onComplete={() => setIsLoading(false)} />;
  }

  return (
    <div className="landing-root relative">
      <LiquidNav />

      {/* 电影级滚动舞台 */}
      <section
        ref={sectionRef}
        className="cinema-scroll relative bg-bg"
        id="cinema"
        style={{ height: 'calc(100vh + 4000px)' }}
      >
        <div className="cinema-stage">
          {/* 背景层（视频 + 缩放/视差） */}
          <div className="cinema-layer cinema-back-layer">
            <HeroBackground />
          </div>

          {/* 英雄内容层（标题/CTA，滚动 0-600 淡出） */}
          <div className="cinema-layer cinema-title-layer">
            <HeroContent />
          </div>

          {/* 核心门类 Bento 层（500-1900） */}
          <div className="cinema-layer cinema-card-layer">
            <CategoryBento />
          </div>

          {/* 研智助手层（1300-2400） */}
          <div className="cinema-layer cinema-assistant-layer">
            <ResearchAssistant />
          </div>

          {/* 无限滑块层（2000-2800 飞入） */}
          <div className="cinema-layer cinema-slider-layer">
            <InfiniteSlider />
          </div>
        </div>
      </section>

      {/* 常规流章节 */}
      <LatestUpdates />
      <StatsSection />
      <SiteFooter />
    </div>
  );
}
