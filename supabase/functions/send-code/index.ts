// SEOC Studio 验证码发送函数
// 部署：supabase functions deploy send-code
// 机密：supabase secrets set RESEND_API_KEY=xxxxx

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SITE = 'https://jiangtengqiao.github.io/seoc-studio/';
const CONTACT = 'jiangtengqiao@qq.com';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// 易混淆字符已剔除（0 O 1 I L），且保证六个字符互不相同
function makeCode(): string {
  const pool = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const picked = new Set<string>();
  while (picked.size < 6) {
    picked.add(pool[Math.floor(Math.random() * pool.length)]);
  }
  return [...picked].join('');
}

function emailHtml(code: string, purpose: string): string {
  const isReg = purpose === 'register';
  const title = isReg ? '注册验证码' : '重置密码验证码';
  const action = isReg ? '完成 SEOC Studio 账户注册' : '重置您的 SEOC Studio 账户密码';
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f7fd;font-family:'PingFang SC','Microsoft YaHei',Helvetica,Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:24px 16px;">

  <div style="text-align:center;padding:18px 0 8px;">
    <span style="display:inline-block;background:#2554eb;color:#fff;font-weight:bold;font-size:15px;letter-spacing:1px;padding:8px 18px;border-radius:10px;">SEOC Studio</span>
    <p style="margin:8px 0 0;font-size:12px;color:#8a93a6;">编程研究与探索 · Study and Explore of Coding</p>
  </div>

  <div style="background:#ffffff;border:1px solid #e3e9f5;border-radius:16px;padding:28px 26px;margin-top:12px;">
    <h1 style="margin:0 0 6px;font-size:19px;color:#172154;">${title}</h1>
    <p style="margin:0 0 4px;font-size:13px;line-height:22px;color:#5a6478;">
      您好。我们收到了您用于<strong style="color:#172154;">${action}</strong>的请求。
      请将下方验证码填入网站对应页面，验证码 <strong style="color:#d97706;">10 分钟内有效</strong>，且仅可使用一次。
    </p>
    <p style="margin:10px 0 0;font-size:12px;line-height:20px;color:#b03a2e;">
      安全警告：SEOC Studio 工作人员不会以任何理由向您电话或私信索要此验证码。如非本人操作，请忽略本邮件并尽快修改密码。
    </p>

    <div style="text-align:center;margin:26px 0 22px;">
      <div style="display:inline-block;background:#eef4ff;border:1px dashed #93b4fd;border-radius:14px;padding:18px 34px;">
        <span style="font-family:'JetBrains Mono',Consolas,monospace;font-size:38px;font-weight:bold;letter-spacing:12px;color:#1d42d8;">${code}</span>
      </div>
    </div>

    <div style="border-top:1px solid #eef1f7;padding-top:18px;">
      <p style="margin:0 0 8px;font-size:13px;font-weight:bold;color:#172154;">声明</p>
      <p style="margin:0;font-size:12px;line-height:21px;color:#5a6478;">
        本平台数字商品一经下单并支付概不退款，下单并支付即视为成年人行为；平台不进行任何促销优惠活动，
        一切价格以官网公示为准。完整条款请阅读官网《用户服务协议》《数字内容购买协议》与《退款政策》。
      </p>
    </div>

    <div style="border-top:1px solid #eef1f7;margin-top:16px;padding-top:18px;">
      <p style="margin:0 0 10px;font-size:13px;font-weight:bold;color:#172154;">正在连载</p>
      <table style="width:100%;border-collapse:collapse;font-size:12px;color:#5a6478;">
        <tr>
          <td style="padding:8px 10px;background:#f7f9fe;border-radius:8px 0 0 0;">订阅式项目</td>
          <td style="padding:8px 10px;background:#f7f9fe;border-radius:0 8px 0 0;">语言起源研究与使用指南，一次购入永久查阅</td>
        </tr>
        <tr>
          <td style="padding:8px 10px;">专研式项目</td>
          <td style="padding:8px 10px;">可训练 AI 从零实现、出版级图表、游戏开发五梯度</td>
        </tr>
        <tr>
          <td style="padding:8px 10px;background:#f7f9fe;border-radius:0 0 0 8px;">探索式项目</td>
          <td style="padding:8px 10px;background:#f7f9fe;border-radius:0 0 8px 0;">高阶学者向专题期刊，含学术交流群，总包 1313 元</td>
        </tr>
      </table>
      <div style="text-align:center;margin-top:14px;">
        <a href="${SITE}" style="display:inline-block;background:#2554eb;color:#ffffff;text-decoration:none;font-size:13px;padding:10px 26px;border-radius:9px;">前往官网</a>
      </div>
      <p style="text-align:center;margin:12px 0 0;font-size:12px;">
        <a href="${SITE}" style="color:#2554eb;text-decoration:none;">官网首页</a>
        &nbsp;·&nbsp;
        <a href="${SITE}assessment" style="color:#2554eb;text-decoration:none;">免费能力评估</a>
        &nbsp;·&nbsp;
        <a href="${SITE}legal" style="color:#2554eb;text-decoration:none;">协议与声明</a>
        &nbsp;·&nbsp;
        <a href="${SITE}announcements" style="color:#2554eb;text-decoration:none;">平台公告</a>
      </p>
    </div>
  </div>

  <div style="text-align:center;padding:18px 10px 6px;font-size:11px;line-height:19px;color:#9aa3b5;">
    <p style="margin:0;">编程研究与探索有限公司 · 负责人 JTQ · 联系邮箱 <a href="mailto:${CONTACT}" style="color:#2554eb;text-decoration:none;">${CONTACT}</a></p>
    <p style="margin:4px 0 0;">本邮件由系统自动发送，请勿直接回复。如收到自称本平台的优惠、代购、内部价信息，均属假冒，请向官方邮箱举报，举报有奖。</p>
    <p style="margin:4px 0 0;">AI for everyone, coding for everyone.</p>
  </div>
</div>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { email, purpose } = await req.json();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: '邮箱格式不正确' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
    }
    if (!['register', 'reset'].includes(purpose)) {
      return new Response(JSON.stringify({ error: '不支持的用途' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // 重置密码前确认账户存在
    if (purpose === 'reset') {
      const { data: p } = await admin.from('profiles').select('id').eq('email', email).maybeSingle();
      if (!p) {
        return new Response(JSON.stringify({ error: '该邮箱尚未注册' }), { status: 404, headers: { ...cors, 'Content-Type': 'application/json' } });
      }
    }

    const code = makeCode();
    await admin.from('verification_codes').update({ used: true }).eq('email', email).eq('purpose', purpose).eq('used', false);
    const { error: insErr } = await admin.from('verification_codes').insert({
      email,
      code,
      purpose,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
    });
    if (insErr) throw insErr;

    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) throw new Error('RESEND_API_KEY 未配置');
    const subject = purpose === 'register' ? `【SEOC Studio】注册验证码 ${code}` : `【SEOC Studio】重置密码验证码 ${code}`;
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'SEOC Studio <onboarding@resend.dev>',
        to: [email],
        subject,
        html: emailHtml(code, purpose)
      })
    });
    if (!r.ok) {
      const t = await r.text();
      throw new Error('邮件发送失败：' + t);
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});
