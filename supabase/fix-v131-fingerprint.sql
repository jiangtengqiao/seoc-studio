-- ============================================================
-- SEOC Studio v13.1 无头浏览器指纹评分升级
-- 前提：已执行 fix-v12-security.sql 与 fix-v13-antibot.sql
-- 内容：visitor_logs 增加指纹评分字段；log_visit 高分自动封禁
-- ============================================================

alter table public.visitor_logs
  add column if not exists bot_score int not null default 0,
  add column if not exists bot_tags text not null default '';

create index if not exists idx_visitor_logs_bot_score on public.visitor_logs (bot_score desc) where bot_score >= 40;

-- log_visit 升级：接收客户端指纹评分（p_bot_score 0-100, p_bot_tags 逗号分隔命中项）
create or replace function public.log_visit(
  p_ip text, p_ua text, p_path text, p_referer text, p_user uuid,
  p_trap boolean default false, p_browser_ok boolean default true,
  p_bot_score int default 0, p_bot_tags text default ''
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_minute int;
  v_hour int;
  v_suspicious boolean := false;
  v_score int := coalesce(p_bot_score, 0);
begin
  -- 蜜罐触发：直接拉黑 24 小时
  if p_trap then
    perform public.ban_ip(p_ip, 'honeypot', 24 * 60);
  end if;

  -- 无头浏览器/自动化框架指纹评分：
  -- >=80 几乎确定是 Playwright/Puppeteer 等自动化 → 永久拉黑
  -- >=60 高度可疑 → 封 12 小时并累计
  if v_score >= 80 then
    perform public.ban_ip(p_ip, 'automation-fingerprint', null);
  elsif v_score >= 60 then
    perform public.ban_ip(p_ip, 'automation-suspect', 12 * 60);
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

  -- 评分 >=40 或缺浏览器头也计入可疑
  if v_score >= 40 or not p_browser_ok then
    v_suspicious := true;
  end if;

  insert into public.visitor_logs (ip, ua, path, referer, user_id, suspicious, trap, browser_ok, bot_score, bot_tags)
  values (p_ip, p_ua, p_path, p_referer, p_user, v_suspicious, p_trap, p_browser_ok, v_score, left(coalesce(p_bot_tags, ''), 300));

  return jsonb_build_object(
    'suspicious', v_suspicious,
    'trapped', p_trap,
    'minute_hits', v_minute,
    'bot_score', v_score
  );
end;
$$;

-- 管理端统计升级：返回评分与命中标签
create or replace function public.get_visitor_stats(p_hours int default 24)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_is_admin boolean;
  v_since timestamptz := now() - (coalesce(p_hours, 24) || ' hours')::interval;
begin
  select public.is_admin() into v_is_admin;
  if not coalesce(v_is_admin, false) then
    raise exception 'forbidden';
  end if;

  return jsonb_build_object(
    'total', (select count(*) from public.visitor_logs where created_at > v_since),
    'unique_ip', (select count(distinct ip) from public.visitor_logs where created_at > v_since),
    'bot_hits', (select count(*) from public.visitor_logs where created_at > v_since and is_bot),
    'suspicious_hits', (select count(*) from public.visitor_logs where created_at > v_since and (suspicious or bot_score >= 40)),
    'automation_hits', (select count(*) from public.visitor_logs where created_at > v_since and bot_score >= 60),
    'top_ips', (
      select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select jsonb_build_object(
          'ip', ip, 'hits', count(*), 'is_bot', bool_or(is_bot),
          'suspicious', bool_or(suspicious or bot_score >= 40),
          'bot_score', max(bot_score)
        ) as x
        from public.visitor_logs where created_at > v_since
        group by ip order by count(*) desc limit 10
      ) t
    ),
    'recent', (
      select coalesce(jsonb_agg(y), '[]'::jsonb) from (
        select jsonb_build_object(
          'ip', ip, 'ua', ua, 'path', path, 'is_bot', is_bot,
          'suspicious', (suspicious or bot_score >= 40), 'bot_score', bot_score, 'bot_tags', bot_tags,
          'created_at', created_at
        ) as y
        from public.visitor_logs where created_at > v_since
        order by created_at desc limit 100
      ) t2
    )
  );
end;
$$;
