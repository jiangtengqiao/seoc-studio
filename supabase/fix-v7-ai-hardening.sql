-- ============================================================
-- SEOC Studio AI Platform 安全加固 v7（研智助手修复脚本）
-- 在 Supabase SQL Editor 中整体执行一次即可，可重复执行。
--
-- 修复内容：
--  1. 移除 ai_credits「本人可更新」RLS —— 用户可篡改自己余额的漏洞
--  2. 移除 ai_transactions / ai_usage_logs 的「本人插入」—— 防伪造流水
--  3. 订单表补充 admin_note 列（前端取消与超时自动取消一直在引用）
--  4. 订单创建改服务端价格表 RPC（防客户端伪造金额/研点数）
--  5. 订单自取消改 RPC（原有前端 update 被 RLS 拦截，按钮必失败）
--  6. 原子扣费 RPC（防并发透支）
--  7. 会员续费顺延到期时间（原实现直接覆盖，续费会损失剩余天数）
--  8. anthropic 死模型禁用（Edge Function 无对应端点/Key）
--  9. 模型定价统一为最新口径（原脚本两段 INSERT 互相覆盖）
-- 10. 全站统计 RPC（Admin 原来显示的是管理员个人数据）
-- 11. 聊天历史会话表（ai_conversations / ai_messages）
-- ============================================================

-- ------------------------------------------------------------
-- 1. RLS 漏洞修复
-- ------------------------------------------------------------
-- 用户可通过 PostgREST 直接改自己 balance：删掉该策略。
-- 余额变更只允许：服务端 Edge Function（service_role）与安全定义者函数。
drop policy if exists "ai_credits self update" on ai_credits;

-- 流水与用量日志只能由服务端写入，用户只读。
drop policy if exists "ai_transactions self insert" on ai_transactions;
drop policy if exists "ai_usage_logs self insert" on ai_usage_logs;

-- 订单表：只允许本人读取与管理员操作，用户不能直接 update/insert 任意值。
-- 用户创建/取消订单统一走下面的安全定义者 RPC。
drop policy if exists "ai_topup_orders self insert" on ai_topup_orders;
drop policy if exists "ai_membership_orders self insert" on ai_membership_orders;

-- ------------------------------------------------------------
-- 2. 订单表补 admin_note 列
-- ------------------------------------------------------------
alter table ai_topup_orders add column if not exists admin_note text;
alter table ai_membership_orders add column if not exists admin_note text;

-- ------------------------------------------------------------
-- 3. 服务端价格表 RPC：创建充值订单（防伪造金额）
-- ------------------------------------------------------------
create or replace function create_ai_topup_order(p_plan text)
returns ai_topup_orders
language plpgsql
security definer
set search_path = public
as
$$
declare
  v_user uuid := auth.uid();
  v_yuan numeric(10,2);
  v_points numeric(12,4);
  v_order ai_topup_orders;
begin
  if v_user is null then
    raise exception '未登录';
  end if;

  -- 服务端价格表：与前端 AICredits 页 TOPUP_PLANS 保持一致
  select case p_plan
    when 't10'  then 10::numeric
    when 't50'  then 50::numeric
    when 't100' then 100::numeric
    else null
  end into v_yuan;

  select case p_plan
    when 't10'  then 10000::numeric
    when 't50'  then 60000::numeric
    when 't100' then 150000::numeric
    else null
  end into v_points;

  if v_yuan is null then
    raise exception '无效的充值套餐';
  end if;

  insert into ai_topup_orders (user_id, yuan, points)
  values (v_user, v_yuan, v_points)
  returning * into v_order;

  return v_order;
end;
$$;

revoke execute on function create_ai_topup_order(text) from anon;
grant execute on function create_ai_topup_order(text) to authenticated;

-- ------------------------------------------------------------
-- 4. 服务端价格表 RPC：创建会员订单（防伪造金额）
-- ------------------------------------------------------------
create or replace function create_ai_membership_order(p_tier text, p_period text)
returns ai_membership_orders
language plpgsql
security definer
set search_path = public
as
$$
declare
  v_user uuid := auth.uid();
  v_yuan numeric(10,2);
  v_points numeric(12,4);
  v_order ai_membership_orders;
begin
  if v_user is null then
    raise exception '未登录';
  end if;
  if p_tier not in ('lite','plus','pro','max') then
    raise exception '无效的会员等级';
  end if;
  if p_period not in ('monthly','yearly') then
    raise exception '无效的购买周期';
  end if;

  -- 服务端价格表：与前端 TIER_INFO 保持一致
  v_yuan := case p_period
    when 'monthly' then
      case p_tier when 'lite' then 19 when 'plus' then 39 when 'pro' then 79 when 'max' then 128 end
    else
      case p_tier when 'lite' then 128 when 'plus' then 268 when 'pro' then 588 when 'max' then 998 end
  end;

  v_points := case p_tier
    when 'lite' then 5000 when 'plus' then 15000 when 'pro' then 40000 when 'max' then 80000
  end;

  insert into ai_membership_orders (user_id, tier, period, yuan, granted_points)
  values (v_user, p_tier, p_period, v_yuan, v_points)
  returning * into v_order;

  return v_order;
end;
$$;

revoke execute on function create_ai_membership_order(text, text) from anon;
grant execute on function create_ai_membership_order(text, text) to authenticated;

-- ------------------------------------------------------------
-- 5. 订单自取消 RPC（仅本人 pending 订单，写入 admin_note）
-- ------------------------------------------------------------
create or replace function cancel_ai_topup_order(p_order uuid)
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

  update ai_topup_orders
    set status = 'rejected', admin_note = '用户主动取消'
    where id = p_order and user_id = auth.uid() and status = 'pending';

  if not found then
    raise exception '订单不存在或不可取消';
  end if;
end;
$$;

revoke execute on function cancel_ai_topup_order(uuid) from anon;
grant execute on function cancel_ai_topup_order(uuid) to authenticated;

create or replace function cancel_ai_membership_order(p_order uuid)
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

  update ai_membership_orders
    set status = 'rejected', admin_note = '用户主动取消'
    where id = p_order and user_id = auth.uid() and status = 'pending';

  if not found then
    raise exception '订单不存在或不可取消';
  end if;
end;
$$;

revoke execute on function cancel_ai_membership_order(uuid) from anon;
grant execute on function cancel_ai_membership_order(uuid) to authenticated;

-- ------------------------------------------------------------
-- 6. 原子扣费 RPC（防并发透支）
-- ------------------------------------------------------------
create or replace function spend_ai_credits(p_user uuid, p_cost numeric)
returns numeric
language plpgsql
security definer
set search_path = public
as
$$
declare
  v_balance numeric;
begin
  update ai_credits
    set balance = balance - p_cost, updated_at = now()
    where user_id = p_user and balance >= p_cost
    returning balance into v_balance;

  if v_balance is null then
    select balance into v_balance from ai_credits where user_id = p_user;
    if v_balance is null then
      return -1;
    end if;
    return -1; -- 余额不足
  end if;
  return v_balance;
end;
$$;

revoke execute on function spend_ai_credits(uuid, numeric) from anon, authenticated;

-- 原子消耗一次免费额度，返回剩余次数；无额度返回 -1
create or replace function spend_ai_free_quota(p_user uuid)
returns int
language plpgsql
security definer
set search_path = public
as
$$
declare
  v_remaining int;
begin
  update ai_credits
    set free_remaining = greatest(free_remaining - 1, 0), updated_at = now()
    where user_id = p_user and free_remaining > 0
    returning free_remaining into v_remaining;

  if v_remaining is null then
    return -1;
  end if;
  return v_remaining;
end;
$$;

revoke execute on function spend_ai_free_quota(uuid) from anon, authenticated;

-- ------------------------------------------------------------
-- 7. 会员续费顺延到期时间（覆盖 confirm_ai_membership_order）
-- ------------------------------------------------------------
create or replace function confirm_ai_membership_order()
returns trigger
language plpgsql
security definer
set search_path = public
as
$$
begin
  if (new.status = 'confirmed' and (old.status is distinct from 'confirmed')) then
    -- 升级会员等级（取更高等级）
    update profiles set
      membership_tier = case
        when (new.tier = 'max') then 'max'
        when (new.tier = 'pro' and (profiles.membership_tier in ('free','lite','plus'))) then 'pro'
        when (new.tier = 'plus' and (profiles.membership_tier in ('free','lite'))) then 'plus'
        when (new.tier = 'lite' and profiles.membership_tier = 'free') then 'lite'
        else profiles.membership_tier
      end,
      -- 修复：原实现直接覆盖为 now()+period，续费会损失剩余天数。
      -- 现在改为顺延：从 max(当前到期时间, 现在) 开始叠加。
      membership_expires_at = greatest(now(), coalesce(profiles.membership_expires_at, now()))
        + case when new.period = 'yearly' then interval '1 year' else interval '1 month' end
    where id = new.user_id;

    -- 发放赠送研点
    if (new.granted_points > 0) then
      insert into ai_credits (user_id, balance, free_remaining, free_reset_date)
      values (new.user_id, new.granted_points, 0, current_date)
      on conflict (user_id) do update set
        balance = ai_credits.balance + new.granted_points,
        updated_at = now();

      insert into ai_transactions (user_id, amount, type, ref_id, note)
      values (new.user_id, new.granted_points, 'purchase', new.id::text,
              '购买 ' || new.tier || ' 会员 ' || new.period || '，赠送 ' || new.granted_points || ' 研点');
    end if;

    new.confirmed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists on_ai_membership_order_confirm on ai_membership_orders;
create trigger on_ai_membership_order_confirm
  before update on ai_membership_orders
  for each row execute function confirm_ai_membership_order();

-- ------------------------------------------------------------
-- 8. anthropic 死模型禁用
--    Edge Function 未实现 anthropic 端点与 Key，启用会导致用户付费后 500。
-- ------------------------------------------------------------
update ai_models set enabled = false where provider = 'anthropic';

-- ------------------------------------------------------------
-- 9. 模型定价统一（以最新市场价口径为准，补齐多语言显示名）
--    原 ai-platform.sql 中两段 INSERT 互相覆盖，导致线上价格口径混乱。
-- ------------------------------------------------------------
insert into ai_models (id, provider, display_name, input_price, output_price, free_daily_quota, min_tier, enabled, sort_order)
values
  ('doubao-pro-32k', 'bytedance',
   '{"zh-CN":"豆包 Pro 32K","en":"Doubao Pro 32K","zh-TW":"豆包 Pro 32K"}',
   5, 9, 5, 'lite', true, 1),
  ('doubao-lite-32k', 'bytedance',
   '{"zh-CN":"豆包 Lite 32K","en":"Doubao Lite 32K","zh-TW":"豆包 Lite 32K"}',
   0.5, 1.5, 20, 'lite', true, 2),
  ('qwen-turbo', 'alibaba',
   '{"zh-CN":"通义千问 Turbo","en":"Qwen Turbo","zh-TW":"通義千問 Turbo"}',
   2, 6, 10, 'lite', true, 3),
  ('qwen-plus', 'alibaba',
   '{"zh-CN":"通义千问 Plus","en":"Qwen Plus","zh-TW":"通義千問 Plus"}',
   4, 12, 5, 'plus', true, 4),
  ('qwen-max', 'alibaba',
   '{"zh-CN":"通义千问 Max","en":"Qwen Max","zh-TW":"通義千問 Max"}',
   20, 60, 3, 'pro', true, 5),
  ('qwen-long', 'alibaba',
   '{"zh-CN":"通义千问 Long","en":"Qwen Long","zh-TW":"通義千問 Long"}',
   0.5, 2, 0, 'lite', true, 6),
  ('glm-4-flash', 'zhipu',
   '{"zh-CN":"智谱 GLM-4-Flash","en":"GLM-4-Flash","zh-TW":"智譜 GLM-4-Flash"}',
   0, 0, 999, 'lite', true, 7),
  ('glm-4-air', 'zhipu',
   '{"zh-CN":"智谱 GLM-4-Air","en":"GLM-4-Air","zh-TW":"智譜 GLM-4-Air"}',
   0.5, 0.5, 5, 'lite', true, 8),
  ('glm-4', 'zhipu',
   '{"zh-CN":"智谱 GLM-4","en":"GLM-4","zh-TW":"智譜 GLM-4"}',
   5, 15, 0, 'plus', true, 9),
  ('glm-4-plus', 'zhipu',
   '{"zh-CN":"智谱 GLM-4-Plus","en":"GLM-4-Plus","zh-TW":"智譜 GLM-4-Plus"}',
   5, 15, 0, 'pro', true, 10),
  ('deepseek-chat', 'deepseek',
   '{"zh-CN":"DeepSeek Chat (V3)","en":"DeepSeek Chat (V3)","zh-TW":"DeepSeek Chat (V3)"}',
   2, 8, 5, 'lite', true, 11),
  ('deepseek-reasoner', 'deepseek',
   '{"zh-CN":"DeepSeek Reasoner (R1)","en":"DeepSeek Reasoner (R1)","zh-TW":"DeepSeek Reasoner (R1)"}',
   4, 16, 2, 'plus', true, 12),
  ('claude-sonnet-4', 'anthropic',
   '{"zh-CN":"Claude Sonnet 4","en":"Claude Sonnet 4"}',
   15, 75, 0, 'max', false, 13)
on conflict (id) do update set
  provider = excluded.provider,
  display_name = excluded.display_name,
  input_price = excluded.input_price,
  output_price = excluded.output_price,
  free_daily_quota = excluded.free_daily_quota,
  min_tier = excluded.min_tier,
  enabled = excluded.enabled,
  sort_order = excluded.sort_order,
  updated_at = now();

-- ------------------------------------------------------------
-- 10. 全站统计 RPC（Admin 使用）
-- ------------------------------------------------------------
create or replace function get_ai_platform_stats()
returns json
language sql
security definer
set search_path = public
as
$$
  select json_build_object(
    'total_calls',  (select count(*) from ai_usage_logs),
    'total_cost',   (select coalesce(sum(cost), 0) from ai_usage_logs),
    'active_users', (select count(distinct user_id) from ai_usage_logs),
    'today_calls',  (select count(*) from ai_usage_logs
                     where created_at >= date_trunc('day', now() at time zone 'Asia/Shanghai')
                       and created_at < date_trunc('day', now() at time zone 'Asia/Shanghai') + interval '1 day'),
    'pending_topup',      (select count(*) from ai_topup_orders where status = 'pending'),
    'pending_membership', (select count(*) from ai_membership_orders where status = 'pending')
  );
$$;

revoke execute on function get_ai_platform_stats() from anon, authenticated;
-- 仅管理员可调用（由 Edge Function 或 admin 客户端调用）
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from profiles where id = auth.uid() and role = 'admin') $$;

-- ------------------------------------------------------------
-- 11. 聊天历史会话表
-- ------------------------------------------------------------
create table if not exists ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  model_id text not null default '',
  title text not null default '新对话',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references ai_conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null default '',
  cost numeric(10,6) not null default 0,
  is_free boolean not null default false,
  interrupted boolean not null default false,
  created_at timestamptz not null default now()
);

alter table ai_conversations enable row level security;
alter table ai_messages enable row level security;

drop policy if exists "ai_conversations self read" on ai_conversations;
drop policy if exists "ai_messages self read" on ai_messages;
create policy "ai_conversations self read" on ai_conversations for select using (auth.uid() = user_id or is_admin());
create policy "ai_messages self read" on ai_messages for select using (
  auth.uid() = (select user_id from ai_conversations c where c.id = ai_messages.conversation_id)
  or is_admin()
);

-- 会话与消息由安全定义者函数写入（服务端校验归属）
create or replace function save_ai_conversation(p_conversation uuid, p_model text, p_title text)
returns uuid
language plpgsql
security definer
set search_path = public
as
$$
declare
  v_user uuid := auth.uid();
  v_id uuid;
begin
  if v_user is null then
    raise exception '未登录';
  end if;
  if p_conversation is null then
    insert into ai_conversations (user_id, model_id, title)
    values (v_user, coalesce(p_model, ''), coalesce(nullif(p_title, ''), '新对话'))
    returning id into v_id;
  else
    update ai_conversations
      set title = case when title = '新对话' then coalesce(nullif(p_title, ''), title) else title end,
          model_id = coalesce(nullif(p_model, ''), model_id),
          updated_at = now()
      where id = p_conversation and user_id = v_user;
    if not found then
      raise exception '会话不存在';
    end if;
    v_id := p_conversation;
  end if;
  return v_id;
end;
$$;

revoke execute on function save_ai_conversation(uuid, text, text) from anon;
grant execute on function save_ai_conversation(uuid, text, text) to authenticated;

create or replace function save_ai_message(p_conversation uuid, p_role text, p_content text, p_cost numeric default 0, p_is_free boolean default false, p_interrupted boolean default false)
returns void
language plpgsql
security definer
set search_path = public
as
$$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception '未登录';
  end if;
  if not exists (select 1 from ai_conversations where id = p_conversation and user_id = v_user) then
    raise exception '会话不存在';
  end if;
  if p_role not in ('user','assistant') then
    raise exception '无效的消息角色';
  end if;

  insert into ai_messages (conversation_id, role, content, cost, is_free, interrupted)
  values (p_conversation, p_role, p_content, p_cost, p_is_free, p_interrupted);

  update ai_conversations set updated_at = now() where id = p_conversation;
end;
$$;

revoke execute on function save_ai_message(uuid, text, text, numeric, boolean, boolean) from anon;
grant execute on function save_ai_message(uuid, text, text, numeric, boolean, boolean) to authenticated;

create index if not exists idx_ai_conversations_user on ai_conversations(user_id, updated_at desc);
create index if not exists idx_ai_messages_conversation on ai_messages(conversation_id, created_at);

-- ------------------------------------------------------------
-- 12. 修复超时自动取消函数对 admin_note 的引用
--     （列已在上方补充；原函数在缺列时会直接报错）
-- ------------------------------------------------------------
create or replace function cancel_expired_orders()
returns void
language plpgsql
set search_path = public
as
$$
begin
  update ai_topup_orders
    set status = 'rejected', admin_note = coalesce(admin_note, '') || ' [系统自动取消-超时未确认]'
    where status = 'pending' and expires_at < now();
  update ai_membership_orders
    set status = 'rejected', admin_note = coalesce(admin_note, '') || ' [系统自动取消-超时未确认]'
    where status = 'pending' and expires_at < now();
end;
$$;
