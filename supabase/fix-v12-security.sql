-- v12 访客监控与安全防护 + AI 会话/消息自定义删除
-- 在 Supabase SQL Editor 整体执行，可重复执行。

-- ============ 一、访客日志与安全事件 ============
create table if not exists visitor_logs (
  id bigint generated always as identity primary key,
  ip text not null default 'unknown',
  ua text not null default '',
  path text not null default '/',
  referer text not null default '',
  is_bot boolean not null default false,
  suspicious boolean not null default false,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_visitor_logs_created on visitor_logs(created_at desc);
create index if not exists idx_visitor_logs_ip on visitor_logs(ip, created_at desc);

alter table visitor_logs enable row level security;
drop policy if exists "visitor_logs service only" on visitor_logs;
create policy "visitor_logs service only" on visitor_logs
  for all using (false) with check (false);
-- 写入与读取全部走 service_role（Edge Function），前端仅经 RPC 间接访问

-- 记录一次访问（service_role 调用；同时做每 IP 每分钟频控判定）
create or replace function log_visit(p_ip text, p_ua text, p_path text, p_referer text, p_user uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_bot boolean := false;
  v_susp boolean := false;
  v_minute_count int;
begin
  -- 常见爬虫/攻击工具特征
  if p_ua ~* '(scrapy|python-requests|curl|wget|httpclient|go-http|java/|okhttp|libwww|bot|spider|crawler|zgrab|masscan|nmap|sqlmap|nikto|dirbuster|acunetix|nessus)' then
    v_bot := true;
  end if;

  -- 一分钟内同 IP 请求次数（超过 60 视为疑似攻击/注水）
  select count(*) into v_minute_count
  from visitor_logs
  where ip = p_ip and created_at > now() - interval '1 minute';

  if v_minute_count > 60 then
    v_susp := true;
  end if;

  insert into visitor_logs(ip, ua, path, referer, is_bot, suspicious, user_id)
  values (p_ip, p_ua, p_path, p_referer, v_bot, v_susp, p_user);

  return jsonb_build_object(
    'is_bot', v_bot,
    'suspicious', v_susp or v_bot
  );
end;
$$;

-- 管理员：访问统计（仅 admin）
create or replace function get_visitor_stats(p_hours int default 24)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_is_admin boolean;
begin
  select is_admin() into v_is_admin;
  if not coalesce(v_is_admin, false) then
    raise exception '仅管理员可访问';
  end if;

  return jsonb_build_object(
    'total', (select count(*) from visitor_logs where created_at > now() - (p_hours || ' hours')::interval),
    'unique_ip', (select count(distinct ip) from visitor_logs where created_at > now() - (p_hours || ' hours')::interval),
    'bot_hits', (select count(*) from visitor_logs where is_bot and created_at > now() - (p_hours || ' hours')::interval),
    'suspicious_hits', (select count(*) from visitor_logs where suspicious and created_at > now() - (p_hours || ' hours')::interval),
    'top_ips', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select ip, count(*) as hits, bool_or(is_bot) as is_bot, bool_or(suspicious) as suspicious
        from visitor_logs
        where created_at > now() - (p_hours || ' hours')::interval
        group by ip order by hits desc limit 20
      ) t),
    'recent', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select ip, ua, path, is_bot, suspicious, created_at
        from visitor_logs
        order by created_at desc limit 100
      ) t)
  );
end;
$$;
revoke execute on function get_visitor_stats(int) from anon;
grant execute on function get_visitor_stats(int) to authenticated;

-- ============ 二、AI 会话/消息自定义删除（研点不退） ============
create or replace function delete_ai_conversation(p_id uuid)
returns void
language sql
security definer
as $$
  delete from ai_messages where conversation_id = p_id and conversation_id in (select id from ai_conversations where user_id = auth.uid());
  delete from ai_conversations where id = p_id and user_id = auth.uid();
$$;

create or replace function delete_ai_conversations_all()
returns void
language sql
security definer
as $$
  delete from ai_messages where conversation_id in (select id from ai_conversations where user_id = auth.uid());
  delete from ai_conversations where user_id = auth.uid();
$$;

-- 按时间范围删除某会话消息（p_from/p_to 均含端点；研点不退还）
create or replace function delete_ai_messages_range(p_conversation uuid, p_from timestamptz, p_to timestamptz)
returns int
language plpgsql
security definer
as $$
declare
  v_deleted int;
begin
  if not exists (select 1 from ai_conversations where id = p_conversation and user_id = auth.uid()) then
    raise exception '无权操作该会话';
  end if;
  delete from ai_messages
  where conversation_id = p_conversation and created_at between p_from and p_to;
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

-- 按 ID 精确删除若干条消息
create or replace function delete_ai_messages_ids(p_ids uuid[])
returns int
language plpgsql
security definer
as $$
declare
  v_deleted int;
begin
  delete from ai_messages m
  using ai_conversations c
  where m.conversation_id = c.id and c.user_id = auth.uid() and m.id = any(p_ids);
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke execute on function delete_ai_conversation(uuid) from anon;
revoke execute on function delete_ai_conversations_all() from anon;
revoke execute on function delete_ai_messages_range(uuid, timestamptz, timestamptz) from anon;
revoke execute on function delete_ai_messages_ids(uuid[]) from anon;
grant execute on function delete_ai_conversation(uuid) to authenticated;
grant execute on function delete_ai_conversations_all() to authenticated;
grant execute on function delete_ai_messages_range(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function delete_ai_messages_ids(uuid[]) to authenticated;
