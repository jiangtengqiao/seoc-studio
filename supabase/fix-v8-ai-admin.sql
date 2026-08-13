-- ============================================================
-- SEOC Studio AI Platform 管理功能 v8（在 fix-v7 之后执行，幂等）
-- 在 Supabase SQL Editor 中整体执行一次即可。
--
-- 新增：
--  1. profiles.is_banned —— 用户封禁（Edge Function 强制校验）
--  2. notifications 站内通知表 + 订单状态变更自动通知
--  3. 会员到期提醒（前端加载时调用 check_membership_expiry_reminders）
--  4. ai_content_filters 内容审核词表（Edge Function 强制校验输入）
--  5. 管理员 RPC：用户列表 / 调整研点 / 设置会员 / 封禁解封
-- ============================================================

-- ------------------------------------------------------------
-- 1. 封禁字段
-- ------------------------------------------------------------
alter table profiles add column if not exists is_banned boolean not null default false;

-- ------------------------------------------------------------
-- 2. 站内通知
-- ------------------------------------------------------------
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  body text not null default '',
  kind text not null default 'system' check (kind in ('system','order','membership')),
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table notifications enable row level security;

drop policy if exists "notifications self read" on notifications;
create policy "notifications self read" on notifications for select using (auth.uid() = user_id or is_admin());

create index if not exists idx_notifications_user on notifications(user_id, read, created_at desc);

-- 通知写入统一走安全定义者函数
create or replace function notify_user(p_user uuid, p_title text, p_body text, p_kind text default 'system')
returns void
language plpgsql
security definer
set search_path = public
as
$$
begin
  insert into notifications (user_id, title, body, kind)
  values (p_user, p_title, p_body, p_kind);
end;
$$;

revoke execute on function notify_user(uuid, text, text, text) from anon, authenticated;

-- 用户标记单条已读（服务端校验归属）
create or replace function mark_notification_read(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as
$$
begin
  if auth.uid() is null then
    raise exception '未登录';
  end if;
  update notifications set read = true where id = p_id and user_id = auth.uid();
end;
$$;

revoke execute on function mark_notification_read(uuid) from anon;
grant execute on function mark_notification_read(uuid) to authenticated;

-- 用户全部标记已读
create or replace function mark_all_notifications_read()
returns void
language plpgsql
security definer
set search_path = public
as
$$
begin
  if auth.uid() is null then
    raise exception '未登录';
  end if;
  update notifications set read = true where user_id = auth.uid() and read = false;
end;
$$;

revoke execute on function mark_all_notifications_read() from anon;
grant execute on function mark_all_notifications_read() to authenticated;

-- ------------------------------------------------------------
-- 3. 订单状态变更 → 自动站内通知
-- ------------------------------------------------------------
create or replace function notify_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as
$$
begin
  if (new.status is distinct from old.status) then
    if new.status = 'confirmed' then
      perform notify_user(
        new.user_id,
        '充值订单已到账',
        '您的充值订单已核验到账：' || new.points || ' 研点已发放到账户，可以开始使用了。',
        'order'
      );
    elsif new.status = 'rejected' then
      perform notify_user(
        new.user_id,
        '充值订单已关闭',
        '您的充值订单（' || new.yuan || ' 元）已被驳回或取消。' ||
        coalesce('原因：' || nullif(new.admin_note, ''), ''),
        'order'
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists on_topup_order_status_change on ai_topup_orders;
create trigger on_topup_order_status_change
  after update on ai_topup_orders
  for each row execute function notify_order_status_change();

create or replace function notify_membership_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as
$$
begin
  if (new.status is distinct from old.status) then
    if new.status = 'confirmed' then
      perform notify_user(
        new.user_id,
        '会员已开通',
        '您的 ' || new.tier || ' 会员（' || new.period || '）已开通，赠送 ' ||
        new.granted_points || ' 研点已入账。',
        'membership'
      );
    elsif new.status = 'rejected' then
      perform notify_user(
        new.user_id,
        '会员订单已关闭',
        '您的会员订单（' || new.tier || ' · ' || new.period || '）已被驳回或取消。' ||
        coalesce('原因：' || nullif(new.admin_note, ''), ''),
        'membership'
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists on_membership_order_status_change on ai_membership_orders;
create trigger on_membership_order_status_change
  after update on ai_membership_orders
  for each row execute function notify_membership_order_status_change();

-- ------------------------------------------------------------
-- 4. 会员到期提醒（前端应用加载时调用；每用户每天最多提醒一次）
-- ------------------------------------------------------------
create or replace function check_membership_expiry_reminders()
returns void
language plpgsql
security definer
set search_path = public
as
$$
declare
  r record;
begin
  if auth.uid() is null then
    return;
  end if;

  for r in
    select id, membership_tier, membership_expires_at
    from profiles
    where id = auth.uid()
      and membership_tier <> 'free'
      and membership_expires_at is not null
  loop
    -- 3 天内到期
    if r.membership_expires_at <= now() + interval '3 days' then
      if not exists (
        select 1 from notifications
        where user_id = r.id
          and kind = 'membership'
          and title = '会员即将到期'
          and created_at > now() - interval '1 day'
      ) then
        perform notify_user(
          r.id,
          '会员即将到期',
          '您的 ' || r.membership_tier || ' 会员将于 ' ||
          to_char(r.membership_expires_at at time zone 'Asia/Shanghai', 'YYYY-MM-DD HH24:MI') ||
          ' 到期，续费可顺延有效期并保留等级。',
          'membership'
        );
      end if;
    end if;
  end loop;
end;
$$;

revoke execute on function check_membership_expiry_reminders() from anon;
grant execute on function check_membership_expiry_reminders() to authenticated;

-- ------------------------------------------------------------
-- 5. 内容审核词表（Edge Function 输入校验用）
-- ------------------------------------------------------------
create table if not exists ai_content_filters (
  id uuid primary key default gen_random_uuid(),
  pattern text not null unique,
  note text not null default '',
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

alter table ai_content_filters enable row level security;

-- 公开读：Edge Function 用 service_role 读取不受 RLS 限制；公开读便于前端展示。
drop policy if exists "ai_content_filters public read" on ai_content_filters;
drop policy if exists "ai_content_filters admin write" on ai_content_filters;
create policy "ai_content_filters public read" on ai_content_filters for select using (true);
create policy "ai_content_filters admin write" on ai_content_filters for all using (is_admin());

-- ------------------------------------------------------------
-- 6. 管理员 RPC（全部校验 is_admin）
-- ------------------------------------------------------------

-- 用户列表（含研点与会员信息）
create or replace function admin_list_ai_users(p_limit int default 100, p_offset int default 0)
returns table (
  id uuid, email text, nickname text, is_banned boolean,
  membership_tier text, membership_expires_at timestamptz,
  balance numeric, free_remaining int, free_reset_date date, created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as
$$
begin
  if not is_admin() then
    raise exception '仅管理员可访问';
  end if;
  return query
    select p.id, p.email, p.nickname, p.is_banned,
           p.membership_tier, p.membership_expires_at,
           coalesce(c.balance, 0), coalesce(c.free_remaining, 0), c.free_reset_date, p.created_at
    from profiles p
    left join ai_credits c on c.user_id = p.id
    order by p.created_at desc
    limit p_limit offset p_offset;
end;
$$;

revoke execute on function admin_list_ai_users(int, int) from anon, authenticated;
grant execute on function admin_list_ai_users(int, int) to authenticated;

-- 调整研点（正数加 / 负数扣，记录 admin_adjust 流水）
create or replace function admin_adjust_ai_credits(p_user uuid, p_amount numeric, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as
$$
begin
  if not is_admin() then
    raise exception '仅管理员可访问';
  end if;
  if p_amount = 0 then
    raise exception '调整额不能为 0';
  end if;

  if p_amount > 0 then
    insert into ai_credits (user_id, balance, free_remaining, free_reset_date)
    values (p_user, p_amount, 0, current_date)
    on conflict (user_id) do update set
      balance = ai_credits.balance + p_amount,
      updated_at = now();
  else
    update ai_credits set
      balance = greatest(0, balance + p_amount),
      updated_at = now()
    where user_id = p_user;
  end if;

  insert into ai_transactions (user_id, amount, type, note)
  values (p_user, p_amount, 'admin_adjust', coalesce(p_note, '管理员调整'));

  perform notify_user(p_user, '研点账户调整', coalesce(p_note, '管理员调整') ||
    '（' || case when p_amount > 0 then '+' else '' end || p_amount || ' 研点）', 'system');
end;
$$;

revoke execute on function admin_adjust_ai_credits(uuid, numeric, text) from anon, authenticated;
grant execute on function admin_adjust_ai_credits(uuid, numeric, text) to authenticated;

-- 设置会员等级与有效期（p_days 为 null 时立即到期）
create or replace function admin_set_membership(p_user uuid, p_tier text, p_days int default null)
returns void
language plpgsql
security definer
set search_path = public
as
$$
begin
  if not is_admin() then
    raise exception '仅管理员可访问';
  end if;
  if p_tier not in ('free','lite','plus','pro','max') then
    raise exception '无效的会员等级';
  end if;

  update profiles set
    membership_tier = p_tier,
    membership_expires_at = case
      when p_tier = 'free' then null
      when p_days is not null then now() + (p_days || ' days')::interval
      else now() + interval '1 month'
    end
  where id = p_user;

  if p_tier = 'free' then
    perform notify_user(p_user, '会员已调整', '您的会员已调整为免费用户。', 'membership');
  else
    perform notify_user(p_user, '会员已调整', '您的会员等级已调整为 ' || p_tier ||
      '，有效期 ' || coalesce(p_days::text, '30') || ' 天。', 'membership');
  end if;
end;
$$;

revoke execute on function admin_set_membership(uuid, text, int) from anon, authenticated;
grant execute on function admin_set_membership(uuid, text, int) to authenticated;

-- 封禁 / 解封
create or replace function admin_set_banned(p_user uuid, p_banned boolean)
returns void
language plpgsql
security definer
set search_path = public
as
$$
begin
  if not is_admin() then
    raise exception '仅管理员可访问';
  end if;
  update profiles set is_banned = p_banned where id = p_user;
  perform notify_user(p_user,
    case when p_banned then '账户已被封禁' else '账户已解封' end,
    case when p_banned then '您的账户已被管理员封禁，研智助手与 API 暂不可用。如有疑问请联系 jiangtengqiao@qq.com。'
                       else '您的账户已解封，研智助手与 API 已恢复可用。' end,
    'system');
end;
$$;

revoke execute on function admin_set_banned(uuid, boolean) from anon, authenticated;
grant execute on function admin_set_banned(uuid, boolean) to authenticated;
