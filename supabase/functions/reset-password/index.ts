// 验证码校验 + 重置密码（一步完成）
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { email, code, password } = await req.json();
    if (!email || !code || !password || password.length < 8) {
      return new Response(JSON.stringify({ error: '参数不完整或密码少于 8 位' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
    }
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: row } = await admin
      .from('verification_codes')
      .select('id, expires_at')
      .eq('email', email)
      .eq('purpose', 'reset')
      .eq('code', code.toUpperCase().trim())
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!row || new Date(row.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: '验证码不正确或已过期' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    const { data: profile } = await admin.from('profiles').select('id').eq('email', email).maybeSingle();
    if (!profile) {
      return new Response(JSON.stringify({ error: '该邮箱尚未注册' }), { status: 404, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    const { error: upErr } = await admin.auth.admin.updateUserById(profile.id, { password });
    if (upErr) throw upErr;
    await admin.from('verification_codes').update({ used: true }).eq('id', row.id);

    return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});
