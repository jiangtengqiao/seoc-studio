// 访客日志与安全防护 Edge Function
// POST /functions/v1/visitor-log  body: { path, referer }
// - 记录访问（IP/UA/路径/来源）到 visitor_logs（service_role）
// - 爬虫/攻击工具 UA 直接返回法律警告
// - 高频访问返回 suspicious 标记
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

  let payload: { path?: string; referer?: string } = {};
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

  // —— 反爬检测：恶意爬取返回法律警告 ——
  const botPattern = /(scrapy|python-requests|python-urllib|curl|wget|httpclient|go-http-client|java\/|okhttp|libwww|aiohttp|node-fetch|axios\/|zgrab|masscan|nmap|sqlmap|nikto|dirbuster|gobuster|acunetix|nessus|hydra|metasploit)/i;
  if (botPattern.test(ua)) {
    return new Response(
      JSON.stringify({
        blocked: true,
        code: 'ANTI_CRAWLER',
        title: '警告：恶意爬取属违法行为',
        message:
          '检测到您正在使用自动化工具对本站进行抓取。依据《中华人民共和国著作权法》《中华人民共和国网络安全法》《中华人民共和国数据安全法》及《中华人民共和国刑法》第二百八十五条（非法获取计算机信息系统数据罪）等相关规定，未经授权爬取、批量抓取本站受版权保护的内容，须承担停止侵害、赔偿损失等民事责任；情节严重的，可能构成刑事犯罪，依法须负刑事责任。本站已记录您的 IP 地址与请求特征，并保留追究法律责任的权利。请立即停止恶意爬取；确有正当研究需要的，请通过 jiangtengqiao@qq.com 书面申请授权。',
        legal_basis: [
          '《中华人民共和国网络安全法》第二十七条',
          '《中华人民共和国数据安全法》第三十二条',
          '《中华人民共和国著作权法》第五十三、五十四条',
          '《中华人民共和国刑法》第二百八十五条、第二百八十六条',
        ],
      }),
      { status: 403, headers: cors }
    );
  }

  // —— 记录访问（含频控判定） ——
  let result: Record<string, unknown> = {};
  // 从客户端携带的用户 JWT 中解出 uid（仅用于关联记录，不做鉴权）
  let userId: string | null = null;
  const authHeader = req.headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    try {
      const jwt = authHeader.slice(7).split('.')[1];
      const decoded = JSON.parse(atob(jwt.replace(/-/g, '+').replace(/_/g, '/')));
      userId = typeof decoded.sub === 'string' ? decoded.sub : null;
    } catch {
      // 解析失败按匿名处理
    }
  }
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const r = await fetch(`${url}/rest/v1/rpc/log_visit`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_ip: ip, p_ua: ua, p_path: path, p_referer: referer, p_user: userId }),
    });
    const data = await r.json();
    result = typeof data === 'object' && data ? data : {};
  } catch {
    // 日志失败不影响访客
  }

  // 疑似攻击（高频/注水）标记
  if (result.suspicious) {
    return new Response(
      JSON.stringify({
        blocked: false,
        warning:
          '检测到您的访问频率异常。本站已记录相关行为特征；如为正常使用请稍作等待，如为攻击、注水或其他恶意行为，本站将依法保留证据并追究法律责任。',
      }),
      { status: 200, headers: cors }
    );
  }

  return new Response(JSON.stringify({ ok: true }), { headers: cors });
});
