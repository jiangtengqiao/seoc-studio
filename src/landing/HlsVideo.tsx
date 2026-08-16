import { useEffect, useRef } from 'react';
import Hls from 'hls.js';

interface HlsVideoProps {
  src: string;
  className?: string;
  flipY?: boolean;
  poster?: string;
}

/**
 * HLS 视频背景组件
 * - 优先使用 hls.js（Safari 之外）
 * - 原生支持 HLS 时降级直接设置 src
 * - 视频属性：autoPlay muted loop playsInline
 */
export default function HlsVideo({ src, className = '', flipY = false, poster }: HlsVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // 原生 HLS 支持（Safari/iOS）
      video.src = src;
    } else if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, lowLatencyMode: false });
      hls.loadSource(src);
      hls.attachMedia(video);
    }

    const tryPlay = () => {
      video.play().catch(() => {
        /* 自动播放被拦截，静默忽略 */
      });
    };
    video.addEventListener('loadedmetadata', tryPlay, { once: true });

    return () => {
      if (hls) {
        hls.destroy();
      }
      video.removeEventListener('loadedmetadata', tryPlay);
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      loop
      playsInline
      poster={poster}
      className={className}
      style={flipY ? { transform: 'scaleY(-1)' } : undefined}
    />
  );
}
