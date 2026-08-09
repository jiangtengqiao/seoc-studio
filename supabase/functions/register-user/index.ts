// 验证码校验 + 服务端创建已验证账户（绕过邮箱确认开关）
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { email, code, password, nickname } = await req.json();
    if (!email || !code || !password || password.length < 8) {
      return new Response(JSON.stringify({ error: '参数不完整或密码少于 8 位' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
    }
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: row } = await admin
      .from('verification_codes')
      .select('id, expires_at')
      .eq('email', email)
      .eq('purpose', 'register')
      .eq('code', code.toUpperCase().trim())
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!row || new Date(row.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: '验证码不正确或已过期' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nickname: nickname || '' }
    });
    if (cErr) {
      const msg = String(cErr.message || cErr);
      if (msg.includes('already')) {
        return new Response(JSON.stringify({ error: '该邮箱已注册，请直接登录' }), { status: 409, headers: { ...cors, 'Content-Type': 'application/json' } });
      }
      throw cErr;
    }
    await admin.from('verification_codes').update({ used: true }).eq('id', row.id);

    return new Response(JSON.stringify({ ok: true, userId: created.user?.id }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});
