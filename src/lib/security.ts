import { supabase, isCloudEnabled } from './supabase';

/**
 * 安全防护客户端模块
 * 1. 访问上报：每次页面浏览调用 Edge Function 记录 IP/UA/路径
 * 2. 反爬拦截：客户端侧 UA 检测，命中时展示法律警告层（服务端 403 兜底）
 * 3. 异常登录检测：设备指纹（UA + 屏幕 + 时区哈希）变化时强制下线重新验证
 */

const BOT_RE = /(scrapy|python-requests|python-urllib|curl|wget|httpclient|go-http-client|java\/|okhttp|libwww|aiohttp|node-fetch|axios\/|zgrab|masscan|nmap|sqlmap|nikto|dirbuster|gobuster|acunetix|nessus|hydra|metasploit|headlesschrome|phantomjs|puppeteer|playwright|selenium)/i;
const WARN_KEY = 'seoc.botWarned';

/** 本次会话是否已上报过该路径 */
const reported = new Set<string>();

/* ================= 无头浏览器/自动化框架指纹检测 ================= */

export interface BotSignals {
  score: number;          // 0-100，越高越像自动化
  hits: string[];         // 命中的检测项
  human: number;          // 行为事件计数（鼠标/滚动/键盘）
}

/** 行为事件计数（真人访问会持续产生） */
const humanEvents = { count: 0 };
let behaviorInstalled = false;

export function installBehaviorMonitor(): void {
  if (behaviorInstalled) return;
  behaviorInstalled = true;
  const bump = () => { humanEvents.count = Math.min(humanEvents.count + 1, 9999); };
  try {
    window.addEventListener('mousemove', bump, { passive: true, capture: true });
    window.addEventListener('wheel', bump, { passive: true, capture: true });
    window.addEventListener('touchstart', bump, { passive: true, capture: true });
    window.addEventListener('keydown', bump, { capture: true });
    window.addEventListener('pointerdown', bump, { passive: true, capture: true });
  } catch { /* ignore */ }
}

/**
 * 采集自动化框架特征信号（Playwright/Puppeteer/Selenium 及常见 CDP 驱动）。
 * 每项命中加分，总分≥阈值判定为自动化访问。
 * 注：仅在浏览器环境调用。
 */
export function collectBotSignals(): BotSignals {
  const hits: string[] = [];
  let score = 0;
  const add = (pts: number, tag: string) => { score += pts; hits.push(tag); };

  try {
    const n = navigator as Navigator & Record<string, unknown>;

    // 1) WebDriver 标记（Selenium/旧版 Puppeteer/Playwright 未 stealth 时必中）
    if (n.webdriver === true) add(45, 'webdriver');

    // 2) CDP 自动化注入的属性
    if ('cdc_adoQpoasnfa76pfcZLmcfl_Array' in window || 'cdc_adoQpoasnfa76pfcZLmcfl_Promise' in window) add(40, 'cdc-chromedriver');
    const w = window as unknown as Record<string, unknown>;
    if (w.__nightmare || w.__phantomas) add(35, 'legacy-driver');

    // 3) Playwright 特征：window.playwright / __playwright 对象
    if ('playwright' in window && !(window as unknown as { playwright?: { pw?: boolean } }).playwright?.pw) {
      // 官方浏览器不会注入裸 playwright 对象，Playwright 未 stealth 时会
      if (typeof w.playwright === 'object') add(35, 'playwright-object');
    }

    // 4) 插件/语言异常：无头浏览器默认空 plugins、单语言、无 mimeTypes
    const plugins = n.plugins?.length ?? 0;
    if (plugins === 0) add(15, 'no-plugins');
    const langs = n.languages?.length ?? 0;
    if (langs === 0) add(10, 'no-languages');

    // 5) 权限与通知状态不一致：真浏览器 Notification 不是 denied-时-headless 常见 denied
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'denied' && plugins === 0) add(10, 'headless-notification');
    } catch { /* ignore */ }

    // 6) WebGL 渲染器暴露 SwiftShader（无头软件渲染）
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') as WebGLRenderingContext | null;
      if (gl) {
        const dbg = gl.getExtension('WEBGL_debug_renderer_info');
        const renderer = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
        if (/swiftshader|llvmpipe|software/i.test(renderer)) add(25, 'software-renderer');
      } else {
        add(15, 'no-webgl');
      }
    } catch { /* ignore */ }

    // 7) 屏幕尺寸异常：无头默认 0 或极小
    if (screen.width === 0 || screen.height === 0) add(30, 'zero-screen');
    else if (screen.width < 200 || screen.height < 200) add(20, 'tiny-screen');

    // 8) outerWidth/Height = 0（无头无窗口）
    if (window.outerWidth === 0 || window.outerHeight === 0) add(25, 'no-window');

    // 9) 时区/地区矛盾： timezone 为空
    try {
      if (!Intl.DateTimeFormat().resolvedOptions().timeZone) add(15, 'no-timezone');
    } catch { add(15, 'no-timezone'); }

    // 10) 鼠标从未移动且无任何指针事件（纯脚本注入页面不交互）
    if (humanEvents.count === 0) add(10, 'no-human-input');

    // 11) 性能计时异常：硬课真浏览器页面加载有完整时序，瞬时渲染可疑
    try {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      if (nav && nav.duration > 0 && nav.duration < 50) add(15, 'instant-load');
    } catch { /* ignore */ }

    // 12) Chrome 检查：真 Chrome 有 window.chrome 与 runtime
    if (/chrome/i.test(n.userAgent) && !w.chrome) add(20, 'fake-chrome');
  } catch {
    // 采集失败不阻断
  }

  return { score: Math.min(score, 100), hits, human: humanEvents.count };
}

/**
 * 蜜饬陷阱：向页面注入对正常用户不可见的隐藏链接（display:none + tabindex=-1 + aria-hidden），
 * 真人永远点不到；爬虫会提取页面上全部链接并访问，一访问即触发 trap 上报→自动封禁 24h。
 */
export function plantHoneypot(): void {
  if (document.getElementById('seoc-hp')) return;
  const a = document.createElement('a');
  a.id = 'seoc-hp';
  a.href = '/.well-known/antibot-trap';
  a.textContent = 'antibot';
  a.setAttribute('aria-hidden', 'true');
  a.setAttribute('tabindex', '-1');
  // 内联样式确保不可见：视觉、指针、布局三重隔离
  a.style.cssText = 'display:none!important;position:absolute;left:-9999px;width:0;height:0;overflow:hidden;pointer-events:none;';
  document.body.appendChild(a);
}

/** 上报蜜饬命中（点击/请求了蜜饬路径时调用） */
export async function reportTrapHit(): Promise<void> {
  if (!isCloudEnabled || !supabase) return;
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const session = await supabase.auth.getSession();
    if (session.data.session?.access_token) {
      headers.Authorization = `Bearer ${session.data.session.access_token}`;
    }
    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/visitor-log`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ path: '/.well-known/antibot-trap', trap: true }),
    });
  } catch {
    // 静默
  }
}

export async function reportVisit(path: string): Promise<void> {
  if (BOT_RE.test(navigator.userAgent)) {
    showAntiCrawlerWall();
    return;
  }
  if (reported.has(path)) return;
  reported.add(path);

  if (!isCloudEnabled || !supabase) return;
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const session = await supabase.auth.getSession();
    if (session.data.session?.access_token) {
      headers.Authorization = `Bearer ${session.data.session.access_token}`;
    }
    const signals = collectBotSignals();
    const r = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/visitor-log`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          path,
          referer: document.referrer || '',
          bot_score: signals.score,
          bot_tags: signals.hits.join(','),
        }),
      }
    );
    if (r.status === 403) {
      const data = await r.json().catch(() => null);
      if (data && (data.code === 'ANTI_CRAWLER' || data.code === 'BOT_SCORE' || data.code === 'IP_BANNED')) {
        showAntiCrawlerWall(data);
      }
    }
  } catch {
    // 上报失败静默
  }
}

/** 反爬法律警告层（全屏、不可关闭，本地会话只弹一次） */
export function showAntiCrawlerWall(info?: {
  title?: string;
  message?: string;
  legal_basis?: string[];
}): void {
  if (sessionStorage.getItem(WARN_KEY)) return;
  sessionStorage.setItem(WARN_KEY, '1');

  const title = info?.title || '警告：恶意爬取属违法行为';
  const message =
    info?.message ||
    '检测到您正在使用自动化工具访问本站。依据《中华人民共和国著作权法》《中华人民共和国网络安全法》《中华人民共和国数据安全法》及《中华人民共和国刑法》第二百八十五条等相关规定，未经授权爬取本站受版权保护的内容，须承担停止侵害、赔偿损失等民事责任；情节严重的可能构成刑事犯罪，依法须负刑事责任。本站已记录您的访问特征并保留追究法律责任的权利。确有正当研究需要的，请通过 jiangtengqiao@qq.com 书面申请授权。';
  const basis = info?.legal_basis || [
    '《中华人民共和国网络安全法》第二十七条',
    '《中华人民共和国数据安全法》第三十二条',
    '《中华人民共和国著作权法》第五十三、五十四条',
    '《中华人民共和国刑法》第二百八十五条、第二百八十六条',
  ];

  const div = document.createElement('div');
  div.id = 'seoc-anti-crawler-wall';
  div.style.cssText =
    'position:fixed;inset:0;z-index:99999;background:rgba(2,6,23,0.97);color:#e2e8f0;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;padding:1.5rem;overflow:auto;';
  div.innerHTML = `
    <div style="max-width:36rem;border:1px solid #7f1d1d;background:#450a0a;border-radius:16px;padding:2rem;">
      <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fca5a5" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <h2 style="font-size:1.25rem;font-weight:700;color:#fecaca;margin:0;">${title}</h2>
      </div>
      <p style="font-size:0.875rem;line-height:1.75;color:#f1f5f9;margin:0 0 1rem;">${message}</p>
      <ul style="font-size:0.75rem;line-height:1.9;color:#cbd5e1;margin:0 0 1.25rem;padding-left:1.25rem;">
        ${basis.map((b) => `<li>${b}</li>`).join('')}
      </ul>
      <p style="font-size:0.75rem;color:#94a3b8;margin:0;">SEOC Studio · 编程研究与探索有限公司 · jiangtengqiao@qq.com</p>
    </div>`;
  document.body.appendChild(div);
}

/* ---------------- 异常登录检测 ---------------- */

const FP_KEY = 'seoc.session.fp';

/** 设备指纹：UA + 语言 + 屏幕特征 + 时区 的稳定哈希 */
function fingerprint(): string {
  const raw = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ].join('|');
  let h = 5381;
  for (let i = 0; i < raw.length; i++) h = ((h << 5) + h + raw.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/**
 * 校验当前会话指纹。设备环境变化（换设备/模拟器/篡改 UA）时
 * 强制下线并要求重新验证，防止会话被盗用。
 * 返回 true 表示指纹正常，false 表示已触发强制下线。
 */
export async function verifySessionFingerprint(onKick?: () => void): Promise<boolean> {
  const fp = fingerprint();
  const saved = localStorage.getItem(FP_KEY);
  if (!saved) {
    localStorage.setItem(FP_KEY, fp);
    return true;
  }
  if (saved === fp) return true;

  // 指纹变化：强制下线重新验证
  localStorage.setItem(FP_KEY, fp);
  if (isCloudEnabled && supabase) {
    await supabase.auth.signOut();
  }
  try {
    const notice = localStorage.getItem('seoc.local.notifications') || '[]';
    const list = JSON.parse(notice);
    list.unshift({
      id: 'sec-' + Date.now(),
      title: '安全提醒',
      body: '检测到您的登录环境发生变化，为保护账户安全已自动退出，请重新登录验证。',
      kind: 'system',
      read: false,
      created_at: new Date().toISOString(),
    });
    localStorage.setItem('seoc.local.notifications', JSON.stringify(list.slice(0, 50)));
  } catch {
    // 通知失败不影响
  }
  onKick?.();
  return false;
}

/* ---------------- 管理端：访问统计 ---------------- */

export interface VisitorStats {
  total: number;
  unique_ip: number;
  bot_hits: number;
  suspicious_hits: number;
  automation_hits?: number;
  top_ips: { ip: string; hits: number; is_bot: boolean; suspicious: boolean; bot_score?: number }[];
  recent: { ip: string; ua: string; path: string; is_bot: boolean; suspicious: boolean; bot_score?: number; bot_tags?: string; created_at: string }[];
}

export async function getVisitorStats(hours = 24): Promise<VisitorStats | null> {
  if (!(isCloudEnabled && supabase)) return null;
  const { data, error } = await supabase.rpc('get_visitor_stats', { p_hours: hours });
  if (error) return null;
  return data as VisitorStats;
}

/* ---------------- 管理端：封禁库 ---------------- */

export interface BannedIp {
  ip: string;
  reason: string;
  hits: number;
  blocked_until: string | null;
  created_at: string;
}

export async function listBannedIps(): Promise<BannedIp[]> {
  if (!(isCloudEnabled && supabase)) return [];
  const { data, error } = await supabase.rpc('list_banned_ips');
  if (error) return [];
  return (data || []) as BannedIp[];
}

export async function unbanIp(ip: string): Promise<boolean> {
  if (!(isCloudEnabled && supabase)) return false;
  const { error } = await supabase.rpc('unban_ip', { p_ip: ip });
  return !error;
}
