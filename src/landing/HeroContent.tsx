import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';

const ROLES = ['研究', '探索', '创造', '分享'];

/**
 * 英雄区内容层（cinema title layer）
 * - 眉标 STUDIO '26
 * - 名称 SEOC Studio
 * - 角色行轮换
 * - 描述 + CTA
 * - 滚动指示器
 * GSAP 入场动画在 mounted 时执行一次
 */
export default function HeroContent() {
  const [roleIndex, setRoleIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setInterval(() => {
      setRoleIndex((i) => (i + 1) % ROLES.length);
    }, 2000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // name-reveal
      gsap.fromTo(
        '.name-reveal',
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 1.2, delay: 0.1, ease: 'power3.out' }
      );
      // blur-in
      gsap.fromTo(
        '.blur-in',
        { opacity: 0, filter: 'blur(10px)', y: 20 },
        {
          opacity: 1,
          filter: 'blur(0px)',
          y: 0,
          duration: 1,
          delay: 0.3,
          stagger: 0.1,
          ease: 'power3.out',
        }
      );
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={rootRef}
      className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center"
    >
      {/* 眉标 */}
      <p className="blur-in text-xs text-muted uppercase tracking-[0.3em] mb-8">
        STUDIO '26
      </p>

      {/* 名称 */}
      <h1 className="name-reveal text-6xl md:text-8xl lg:text-9xl font-display italic leading-[0.9] tracking-tight text-text-primary mb-6">
        SEOC Studio
      </h1>

      {/* 角色行 */}
      <p className="blur-in text-lg md:text-2xl text-muted mb-6 font-body">
        我们{' '}
        <span
          key={roleIndex}
          className="font-display italic text-accent animate-role-fade-in inline-block"
        >
          {ROLES[roleIndex]}
        </span>{' '}
        代码的艺术。
      </p>

      {/* 描述 */}
      <p className="blur-in text-sm md:text-base text-muted max-w-md mb-12 leading-relaxed">
        我们把每一门编程语言当作值得认真对待的研究对象。起源要考据，语法要透彻，教程要成体系。
      </p>

      {/* CTA */}
      <div className="blur-in inline-flex gap-4">
        <Link
          to="/products"
          className="accent-ring group relative inline-flex items-center gap-2 rounded-full bg-text-primary text-bg text-sm px-7 py-3.5 hover:scale-105 transition-transform"
        >
          浏览全部内容
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </Link>
        <Link
          to="/auth/register"
          className="accent-ring group relative inline-flex rounded-full border-2 border-stroke bg-bg text-text-primary text-sm px-7 py-3.5 hover:scale-105 hover:border-transparent transition-all"
        >
          免费注册
        </Link>
      </div>

      {/* 滚动指示器 */}
      <div className="blur-in absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
        <span className="text-xs text-muted uppercase tracking-[0.2em]">滚动</span>
        <div className="scroll-indicator-line w-px h-10 bg-stroke" />
      </div>
    </div>
  );
}
