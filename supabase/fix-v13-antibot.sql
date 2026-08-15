-- ============================================================
-- SEOC Studio v13 反爬升级 SQL
-- 运行前请先执行过 fix-v12-security.sql（依赖 visitor_logs）
-- 内容：IP 封禁库 / 蜜罐触发自动拉黑 / 浏览器完整性标记 / 封禁检查 RPC
-- ============================================================

-- 1) IP 封禁库
create table if not exists public.blocked_ips (
  id bigint generated always as identity primary key,
  ip text not null unique,
  reason text not null default 'auto',
  hits int not null default 0,
  blocked_until timestamptz,
  created_at timestamptz not null default now()
);

alter table public.blocked_ips enable row level security;
-- 无人可读写（仅 service_role / security definer RPC）

-- 2) visitor_logs 增加封禁/蜜罐/浏览器完整性相关字段
alter table public.visitor_logs
  add column if not exists trap boolean not null default false,
  add column if not exists browser_ok boolean not null default true;

-- 3) 封禁检查 + 自动拉黑 RPC（service_role / Edge Function 调用）
create or replace function public.check_ip(p_ip text)
returns table (blocked boolean, reason text)
language plpgsql security definer set search_path = public
as $$
declare
  rec public.blocked_ips%rowtype;
begin
  select * into rec from public.blocked_ips where ip = p_ip;
  if rec.id is null then
    return query select false, ''::text;
  elsif rec.blocked_until is not null and rec.blocked_until < now() then
    -- 临时封禁已过期，自动解封
    delete from public.blocked_ips where id = rec.id;
    return query select false, ''::text;
  else
    update public.blocked_ips set hits = hits + 1 where id = rec.id;
    return query select true, rec.reason;
  end if;
end;
$$;

-- 4) 拉黑 IP RPC：蜜罐触发 / 严重攻击自动调用
--    p_ttl_minutes 为空 = 永久
create or replace function public.ban_ip(p_ip text, p_reason text, p_ttl_minutes int)
returns void
language sql security definer set search_path = public
as $$
  insert into public.blocked_ips (ip, reason, blocked_until)
  values (p_ip, p_reason, case when p_ttl_minutes is null then null else now() + (p_ttl_minutes || ' minutes')::interval end)
  on conflict (ip) do update
    set reason = excluded.reason,
        blocked_until = excluded.blocked_until,
        hits = public.blocked_ips.hits + 1;
$$;

-- 5) log_visit 升级：蜜罐触发即拉黑 24h；高频自动短时封禁
create or replace function public.log_visit(
  p_ip text, p_ua text, p_path text, p_referer text, p_user uuid,
  p_trap boolean default false, p_browser_ok boolean default true
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_minute int;
  v_hour int;
  v_suspicious boolean := false;
begin
  -- 蜜罐触发：直接拉黑 24 小时
  if p_trap then
    perform public.ban_ip(p_ip, 'honeypot', 24 * 60);
  end if;

  select count(*) into v_minute from public.visitor_logs
    where ip = p_ip and created_at > now() - interval '1 minute';
  select count(*) into v_hour from public.visitor_logs
    where ip = p_ip and created_at > now() - interval '1 hour';

  -- 分钟 >60 可疑；小时 >1200（约 20/秒）自动封 2 小时
  if v_minute > 60 then
    v_suspicious := true;
  end if;
  if v_hour > 1200 then
    perform public.ban_ip(p_ip, 'flood', 120);
    v_suspicious := true;
  end if;

  insert into public.visitor_logs (ip, user_agent, path, referer, user_id, suspicious, trap, browser_ok)
  values (p_ip, p_ua, p_path, p_referer, p_user, v_suspicious, p_trap, p_browser_ok);

  return jsonb_build_object(
    'suspicious', v_suspicious,
    'trapped', p_trap,
    'minute_hits', v_minute
  );
end;
$$;

-- 6) 管理端：封禁列表 / 解封
create or replace function public.list_banned_ips()
returns table (ip text, reason text, hits int, blocked_until timestamptz, created_at timestamptz)
language sql security definer set search_path = public
as $$
  select ip, reason, hits, blocked_until, created_at from public.blocked_ips
  order by created_at desc limit 200;
$$;

create or replace function public.unban_ip(p_ip text)
returns void
language sql security definer set search_path = public
as $$ delete from public.blocked_ips where ip = p_ip; $$;

-- 管理员限制（与 v12 同款判定）
revoke all on function public.list_banned_ips() from public, anon, authenticated;
revoke all on function public.unban_ip(text) from public, anon, authenticated;
grant execute on function public.list_banned_ips() to authenticated;
grant execute on function public.unban_ip(text) to authenticated;
alter function public.list_banned_ips() set search_path = public;
-- 在函数内做管理员校验：
create or replace function public.list_banned_ips()
returns table (ip text, reason text, hits int, blocked_until timestamptz, created_at timestamptz)
language plpgsql security definer set search_path = public
as $$
begin
  if not coalesce(public.is_admin(), false) then
    raise exception 'forbidden';
  end if;
  return query select ip, reason, hits, blocked_until, created_at from public.blocked_ips
    order by created_at desc limit 200;
end;
$$;

create or replace function public.unban_ip(p_ip text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not coalesce(public.is_admin(), false) then
    raise exception 'forbidden';
  end if;
  delete from public.blocked_ips where ip = p_ip;
end;
$$;
