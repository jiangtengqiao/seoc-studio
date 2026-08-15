import { useEffect, useState } from 'react';
import { getVisitorStats, listBannedIps, unbanIp, type VisitorStats, type BannedIp } from '../lib/security';
import { Spinner } from './ui';

/** 管理端：访问者与安全监控面板 */
export default function SecurityPanel() {
  const [hours, setHours] = useState(24);
  const [stats, setStats] = useState<VisitorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [banned, setBanned] = useState<BannedIp[]>([]);
  const [unbanBusy, setUnbanBusy] = useState('');

  const loadBanned = async () => setBanned(await listBannedIps());

  const load = async (h: number) => {
    setLoading(true);
    setError('');
    const d = await getVisitorStats(h);
    if (!d) setError('加载失败：请确认已在 Supabase 执行 fix-v12-security.sql，且您以管理员身份登录。');
    setStats(d);
    setLoading(false);
  };

  useEffect(() => { load(hours); loadBanned(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const shortUa = (ua: string) => (ua.length > 70 ? ua.slice(0, 70) + '…' : ua || '（空 UA，疑似脚本）');

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {[1, 6, 24, 72, 168].map((h) => (
          <button
            key={h}
            className={`badge cursor-pointer transition ${hours === h ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            onClick={() => { setHours(h); load(h); }}
          >
            {h < 24 ? `近 ${h} 小时` : `近 ${h / 24} 天`}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-400">数据来自 visitor_logs（Edge Function 上报，含预览与首次打开）</span>
      </div>

      {loading ? <Spinner text="正在加载访问数据" /> : error ? (
        <p className="card p-6 text-sm text-red-600">{error}</p>
      ) : !stats ? null : (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: '总请求数', value: stats.total, color: 'text-brand-700' },
              { label: '独立 IP', value: stats.unique_ip, color: 'text-slate-800' },
              { label: '爬虫命中', value: stats.bot_hits, color: 'text-violet-600' },
              { label: '疑似攻击/注水', value: stats.suspicious_hits, color: 'text-red-600' },
            ].map((c) => (
              <div key={c.label} className="card p-4">
                <p className={`text-2xl font-bold ${c.color}`}>{c.value.toLocaleString()}</p>
                <p className="mt-1 text-xs text-slate-500">{c.label}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="card overflow-hidden">
              <p className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-800">高频访问 IP（疑似 DDoS / 注水来源）</p>
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-slate-400">
                    <tr><th className="px-4 py-2 font-medium">IP</th><th className="px-2 py-2 font-medium">请求</th><th className="px-4 py-2 font-medium">标记</th></tr>
                  </thead>
                  <tbody>
                    {stats.top_ips.map((t) => (
                      <tr key={t.ip} className="border-t border-slate-50">
                        <td className="px-4 py-2 font-mono">{t.ip}</td>
                        <td className="px-2 py-2 font-mono">{t.hits}</td>
                        <td className="px-4 py-2">
                          {t.is_bot && <span className="badge bg-violet-50 text-violet-600">爬虫</span>}
                          {t.suspicious && <span className="badge bg-red-50 text-red-600">疑似攻击</span>}
                          {!t.is_bot && !t.suspicious && <span className="text-slate-300">正常</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card overflow-hidden">
              <p className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-800">最近 100 条访问日志</p>
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-slate-400">
                    <tr><th className="px-3 py-2 font-medium">时间</th><th className="px-3 py-2 font-medium">IP</th><th className="px-3 py-2 font-medium">路径</th><th className="px-3 py-2 font-medium">UA / 标记</th></tr>
                  </thead>
                  <tbody>
                    {stats.recent.map((r, i) => (
                      <tr key={i} className={`border-t border-slate-50 ${r.suspicious || r.is_bot ? 'bg-red-50/40' : ''}`}>
                        <td className="whitespace-nowrap px-3 py-2 font-mono text-slate-500">{fmtTime(r.created_at)}</td>
                        <td className="px-3 py-2 font-mono">{r.ip}</td>
                        <td className="max-w-[8rem] truncate px-3 py-2 text-slate-600">{r.path}</td>
                        <td className="max-w-[14rem] px-3 py-2">
                          <span className="block truncate text-slate-400" title={r.ua}>{shortUa(r.ua)}</span>
                          {r.is_bot && <span className="badge bg-violet-50 text-violet-600">爬虫</span>}
                          {r.suspicious && <span className="badge bg-red-50 text-red-600">异常</span>}
                          {!!r.bot_score && r.bot_score >= 40 && (
                            <span
                              className="badge bg-fuchsia-50 text-fuchsia-700"
                              title={r.bot_tags || ''}
                            >指纹 {r.bot_score}{r.bot_tags ? `：${r.bot_tags}` : ''}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="card mt-5 overflow-hidden">
            <p className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-800">IP 封禁库（蜜饬自动拉黑 / 洪水攻击自动封禁，可手动解封）</p>
            {banned.length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-400">当前无封禁记录</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr><th className="px-3 py-2">IP</th><th className="px-3 py-2">原因</th><th className="px-3 py-2">拦截次数</th><th className="px-3 py-2">封禁至</th><th className="px-3 py-2">操作</th></tr>
                  </thead>
                  <tbody>
                    {banned.map((b) => (
                      <tr key={b.ip} className="border-t border-slate-50 bg-red-50/30">
                        <td className="px-3 py-2 font-mono">{b.ip}</td>
                        <td className="px-3 py-2">{b.reason === 'honeypot' ? '蜜饬陷阱触发（自动拉黑 24h）' : b.reason === 'flood' ? '洪水攻击（自动封 2h）' : b.reason}</td>
                        <td className="px-3 py-2">{b.hits}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-slate-500">{b.blocked_until ? fmtTime(b.blocked_until) : '永久'}</td>
                        <td className="px-3 py-2">
                          <button
                            className="badge cursor-pointer bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50"
                            disabled={unbanBusy === b.ip}
                            onClick={async () => {
                              setUnbanBusy(b.ip);
                              const ok = await unbanIp(b.ip);
                              if (ok) await loadBanned();
                              setUnbanBusy('');
                            }}
                          >{unbanBusy === b.ip ? '解封中…' : '解封'}</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card mt-5 p-5 text-xs leading-6 text-slate-500">
            <p className="mb-2 text-sm font-semibold text-slate-800">防护机制说明</p>
            <ul className="list-disc space-y-1 pl-4">
              <li>反爬：爬虫/攻击工具 UA（scrapy、sqlmap、nmap、zgrab 等）访问时，服务端直接返回 403 法律警告（著作权法、网络安全法、刑法二百八十五条），并全屏展示警示墙。</li>
              <li>频控：同 IP 每分钟超过 60 次自动标记可疑；每小时超过 1200 次（约 20 次/秒）自动封禁 2 小时。</li>
              <li>蜜饬陷阱：页面埋有对人类不可见的隐藏链接，爬虫提取链接访问即触发，自动拉黑 24 小时并返回法律警告。</li>
              <li>无头浏览器指纹检测：针对 Playwright/Puppeteer/Selenium 等（UA 与真浏览器一致），采集 WebDriver 标记、CDP 注入对象、插件/语言缺失、SwiftShader 软件渲染、零尺寸窗口、行为事件缺失等 12 项信号综合评分；≥80 分永久拉黑，≥60 分封 12 小时，≥40 分标记可疑。</li>
              <li>浏览器完整性：缺少 Sec-Fetch/Accept-Language 等浏览器特征头的伪造 UA 脚本会被标记为可疑（应对伪装 UA 的绕过）。</li>
              <li>异常登录：设备指纹（UA+屏幕+时区哈希）变化时自动强制下线，要求重新登录验证，并给用户发送安全提醒通知。</li>
              <li>钓鱼/木马防护：仅官方域名为有效站点，凡与官网价格不一致的渠道均属假冒（见《举报与反假冒声明》）。</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
