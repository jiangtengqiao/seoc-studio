import HlsVideo from './HlsVideo';

const HLS_SRC = 'https://stream.mux.com/Aa02T7oM1wH5Mk5EEVDYhbZ1ChcdhRsS2m1NYyx4Ua1g.m3u8';
const POSTER =
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?' +
  'prompt=' + encodeURIComponent('Cinematic dark abstract code research atmosphere, flowing digital particles, deep blue and teal gradient, minimal programmer studio ambiance') +
  '&image_size=landscape_16_9';

/**
 * 英雄区背景层（cinema back layer）
 * - HLS 视频背景（加载前显示 poster，HLS 失败时 poster 常驻）
 * - 深色叠加层 + 底部淡出
 */
export default function HeroBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-bg">
      <HlsVideo
        src={HLS_SRC}
        poster={POSTER}
        className="absolute top-1/2 left-1/2 min-w-full min-h-full object-cover -translate-x-1/2 -translate-y-1/2"
      />
      {/* 深色叠加层 */}
      <div className="absolute inset-0 bg-black/20" />
      {/* 主题适配叠加：亮色下加白雾，暗色下加暗雾 */}
      <div className="absolute inset-0 bg-bg/10 dark:bg-black/40" />
      {/* 底部淡出 */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-bg to-transparent" />
    </div>
  );
}
