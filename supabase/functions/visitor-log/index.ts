// 访客日志与安全防护 Edge Function v2（反爬升级版）
// POST /functions/v1/visitor-log  body: { path, referer, trap? }
// - IP 封禁库检查：已封禁 IP 直接 403 法律警告
// - 爬虫/攻击工具 UA：403 法律警告
// - 蜜罐路径（trap:true）：记录并自动拉黑 24 小时
// - 浏览器头完整性（Sec-Fetch / Accept-Language）缺失：标记可疑
// - 频控：分钟超限标记 suspicious，小时洪水自动封 2 小时
Deno.serve(async (req: Request) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json; charset=utf-8',
  };
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method' }), { status: 405, headers: cors });
  }

  let payload: { path?: string; referer?: string; trap?: boolean; bot_score?: number; bot_tags?: string } = {};
  try {
    payload = await req.json();
  } catch {
    // 空 body 也允许
  }

  const ip =
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-real-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown';
  const ua = req.headers.get('user-agent') || '';
  const path = (payload.path || '/').slice(0, 500);
  const referer = (payload.referer || '').slice(0, 500);
  const trap = payload.trap === true;
  const botScore = Math.max(0, Math.min(100, Math.floor(Number(payload.bot_score) || 0)));
  const botTags = String(payload.bot_tags || '').slice(0, 300);

  const REST = (() => {
    const url = Deno.env.get('SUPABASE_URL')!;
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const headers = {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    };
    return {
      rpc: async (fn: string, args: Record<string, unknown>) => {
        const r = await fetch(`${url}/rest/v1/rpc/${fn}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(args),
        });
        return await r.json().catch(() => null);
      },
    };
  })();

  const legalWarning = (code: string, title: string, message: string) =>
    new Response(
      JSON.stringify({
        blocked: true,
        code,
        title,
        message,
        legal_basis: [
          '《中华人民共和国网络安全法》第二十七条',
          '《中华人民共和国数据安全法》第三十二条',
          '《中华人民共和国著作权法》第五十三、五十四条',
          '《中华人民共和国刑法》第二百八十五条、第二百八十六条',
        ],
      }),
      { status: 403, headers: cors }
    );

  // —— 0) IP 封禁库检查：命中直接拒绝 ——
  try {
    const ban = await REST.rpc('check_ip', { p_ip: ip });
    if (Array.isArray(ban) && ban[0]?.blocked) {
      return legalWarning(
        'IP_BANNED',
        '警告：您的 IP 已被本站封禁',
        `检测到来自您当前 IP 的恶意爬取或攻击行为，依据《中华人民共和国网络安全法》《中华人民共和国刑法》第二百八十五条等相关规定，本站已封禁该 IP（原因：${ban[0].reason || 'auto'}）。本站已保留全部请求日志与证据，并保留追究法律责任的权利。确有异议或正当研究需要的，请通过 jiangtengqiao@qq.com 书面申诉。`
      );
    }
  } catch {
    // 封禁库不可用不阻断正常流程
  }

  // —— 1) 反爬检测：恶意爬取返回法律警告 ——
  const botPattern = /(scrapy|python-requests|python-urllib|curl|wget|httpclient|go-http-client|java\/|okhttp|libwww|aiohttp|node-fetch|axios\/|zgrab|masscan|nmap|sqlmap|nikto|dirbuster|gobuster|acunetix|nessus|hydra|metasploit|headlesschrome|phantomjs|puppeteer|playwright|selenium)/i;
  if (botPattern.test(ua)) {
    return legalWarning(
      'ANTI_CRAWLER',
      '警告：恶意爬取属违法行为',
      '检测到您正在使用自动化工具对本站进行抓取。依据《中华人民共和国著作权法》《中华人民共和国网络安全法》《中华人民共和国数据安全法》及《中华人民共和国刑法》第二百八十五条（非法获取计算机信息系统数据罪）等相关规定，未经授权爬取、批量抓取本站受版权保护的内容，须承担停止侵害、赔偿损失等民事责任；情节严重的，可能构成刑事犯罪，依法须负刑事责任。本站已记录您的 IP 地址与请求特征，并保留追究法律责任的权利。请立即停止恶意爬取；确有正当研究需要的，请通过 jiangtengqiao@qq.com 书面申请授权。'
    );
  }

  // —— 2) 蜜罐路径：正常用户不可能访问到（页面隐藏链接，仅爬虫会抓） ——
  if (trap) {
    // log_visit 内会自动 ban_ip 24 小时
    try {
      await REST.rpc('log_visit', {
        p_ip: ip, p_ua: ua, p_path: '[honeypot]', p_referer: referer,
        p_user: null, p_trap: true, p_browser_ok: false,
      });
    } catch { /* ignore */ }
    return legalWarning(
      'HONEYPOT',
      '警告：恶意爬取属违法行为',
      '您访问了本站对正常用户不可见的隐藏路径，该行为被确认为自动化恶意爬取。依据《中华人民共和国网络安全法》第二十七条、《中华人民共和国刑法》第二百八十五条，非法获取计算机信息系统数据可处三年以下有期徒刑或拘役；情节特别严重的处三年以上七年以下有期徒刑。您的 IP 已被自动封禁并完整记录证据。确有正当研究需要的，请通过 jiangtengqiao@qq.com 书面申请授权。'
    );
  }

  // —— 3) 浏览器完整性检测：伪造 UA 的脚本常缺浏览器特征头 ——
  const secFetch = req.headers.get('sec-fetch-mode');
  const secChUa = req.headers.get('sec-ch-ua');
  const lang = req.headers.get('accept-language');
  // 真浏览器（含移动端）访问站点页面时几乎必带 sec-fetch-mode 与 accept-language
  const browserOk = !!((secFetch || secChUa) && lang);

  // —— 4) 从用户 JWT 解 uid（仅用于关联记录，不做鉴权） ——
  let userId: string | null = null;
  const authHeader = req.headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ') && !authHeader.includes(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '')) {
    try {
      const jwt = authHeader.slice(7).split('.')[1];
      const decoded = JSON.parse(atob(jwt.replace(/-/g, '+').replace(/_/g, '/')));
      userId = typeof decoded.sub === 'string' ? decoded.sub : null;
    } catch {
      // 解析失败按匿名处理
    }
  }

  // —— 5) 服务端二次评分：无头浏览器即使伪造指纹，也常缺行为/头特征 ——
  let finalScore = botScore;
  if (!browserOk) finalScore += 15;              // 缺浏览器特征头（伪造 UA 脚本）
  if (botScore > 0 && !trap) finalScore += 5;     // 带评分上报但无蜜饬，正常前端也带，仅微调
  finalScore = Math.min(finalScore, 100);

  // —— 6) 记录访问（含频控判定/自动封禁；SQL 内高分自动拉黑） ——
  let result: Record<string, unknown> = {};
  try {
    const data = await REST.rpc('log_visit', {
      p_ip: ip, p_ua: ua, p_path: path, p_referer: referer,
      p_user: userId, p_trap: false, p_browser_ok: browserOk,
      p_bot_score: finalScore, p_bot_tags: botTags,
    });
    result = typeof data === 'object' && data ? data : {};
  } catch {
    // 日志失败不影响访客
  }

  // —— 7) 指纹评分极高：直接拦截（SQL 已同步拉黑） ——
  if (finalScore >= 80) {
    return legalWarning(
      'BOT_SCORE',
      '警告：检测到自动化访问工具',
      '本站通过多重指纹检测确认您正在使用无头浏览器或自动化框架（如 Playwright、Puppeteer、Selenium 等）对本站进行抓取。依据《中华人民共和国网络安全法》第二十七条、《中华人民共和国刑法》第二百八十五条，未经授权爬取本站受版权保护的内容须承担法律责任，情节严重的可处三年以下有期徒刑或拘役。您的 IP 已被自动封禁并完整记录证据。确有正当研究需要的，请通过 jiangtengqiao@qq.com 书面申请授权。'
    );
  }

  // 可疑（高频/无浏览器特征头/中高指纹评分）
  if (result.suspicious || (result.minute_hits && Number(result.minute_hits) > 60) || !browserOk || finalScore >= 40) {
    return new Response(
      JSON.stringify({
        blocked: false,
        warning:
          '检测到您的访问行为或环境异常。本站已记录相关行为特征；如为正常使用请使用标准浏览器访问，如为攻击、注水或其他恶意行为，本站将依法保留证据并追究法律责任。',
      }),
      { status: 200, headers: cors }
    );
  }

  return new Response(JSON.stringify({ ok: true }), { headers: cors });
});
