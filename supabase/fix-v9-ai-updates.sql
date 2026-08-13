-- ============================================================
-- SEOC Studio AI Platform v9 更新（在 fix-v7、fix-v8 之后执行，幂等）
-- 1. DeepSeek 模型切换：deepseek-chat(V3)/deepseek-reasoner(R1) 停用，
--    启用 deepseek-v4-flash 与 deepseek-v4-pro
-- 2. 订单「我已支付」：新增 payment_claimed 字段与用户确认支付 RPC，
--    管理员在管理页看到「已声称支付」标记后点同意/驳回
-- 3. 订单有效期 30 分钟 → 24 小时（人工确认制：24 小时内回复）
-- 4. 会员价格上调（lite/plus/pro/max 四档）
-- ============================================================

-- ------------------------------------------------------------
-- 1. DeepSeek 模型切换
-- ------------------------------------------------------------
-- 旧模型保留但停用（ai_usage_logs 外键引用，不能删行）
update ai_models set enabled = false, sort_order = 90 where id = 'deepseek-chat';
update ai_models set enabled = false, sort_order = 91 where id = 'deepseek-reasoner';

insert into ai_models (id, provider, display_name, input_price, output_price, free_daily_quota, min_tier, enabled, sort_order)
values
  ('deepseek-v4-flash', 'deepseek',
   '{"zh-CN":"DeepSeek V4 Flash","en":"DeepSeek V4 Flash","zh-TW":"DeepSeek V4 Flash"}',
   1, 4, 10, 'lite', true, 11),
  ('deepseek-v4-pro', 'deepseek',
   '{"zh-CN":"DeepSeek V4 Pro","en":"DeepSeek V4 Pro","zh-TW":"DeepSeek V4 Pro"}',
   4, 16, 2, 'plus', true, 12)
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
-- 2. 订单「我已支付」
-- ------------------------------------------------------------
alter table ai_topup_orders add column if not exists payment_claimed boolean not null default false;
alter table ai_topup_orders add column if not exists payment_claimed_at timestamptz;
alter table ai_membership_orders add column if not exists payment_claimed boolean not null default false;
alter table ai_membership_orders add column if not exists payment_claimed_at timestamptz;

-- 用户确认支付（仅本人 pending 订单）
create or replace function claim_ai_topup_order_paid(p_order uuid)
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
    set payment_claimed = true, payment_claimed_at = now()
    where id = p_order and user_id = auth.uid() and status = 'pending';
  if not found then
    raise exception '订单不存在或不可操作';
  end if;
end;
$$;

revoke execute on function claim_ai_topup_order_paid(uuid) from anon;
grant execute on function claim_ai_topup_order_paid(uuid) to authenticated;

create or replace function claim_ai_membership_order_paid(p_order uuid)
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
    set payment_claimed = true, payment_claimed_at = now()
    where id = p_order and user_id = auth.uid() and status = 'pending';
  if not found then
    raise exception '订单不存在或不可操作';
  end if;
end;
$$;

revoke execute on function claim_ai_membership_order_paid(uuid) from anon;
grant execute on function claim_ai_membership_order_paid(uuid) to authenticated;

-- ------------------------------------------------------------
-- 3. 订单有效期：30 分钟 → 24 小时（人工确认制）
-- ------------------------------------------------------------
create or replace function set_order_expires_at()
returns trigger
language plpgsql
set search_path = public
as
$$
begin
  if new.status = 'pending' and new.expires_at is null then
    new.expires_at = now() + interval '24 hours';
  end if;
  return new;
end;
$$;

drop trigger if exists on_topup_order_set_expiry on ai_topup_orders;
create trigger on_topup_order_set_expiry
  before insert on ai_topup_orders
  for each row execute function set_order_expires_at();

drop trigger if exists on_membership_order_set_expiry on ai_membership_orders;
create trigger on_membership_order_set_expiry
  before insert on ai_membership_orders
  for each row execute function set_order_expires_at();

-- 存量 pending 订单延长到 24 小时（从创建时间起算）
update ai_topup_orders
  set expires_at = created_at + interval '24 hours'
  where status = 'pending' and expires_at is not null
    and expires_at < created_at + interval '24 hours';
update ai_membership_orders
  set expires_at = created_at + interval '24 hours'
  where status = 'pending' and expires_at is not null
    and expires_at < created_at + interval '24 hours';

-- ------------------------------------------------------------
-- 4. 会员价格上调（前端 TIER_INFO 与 RPC 价格表同步修改）
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

  -- 服务端价格表（v9 上调后）：与前端 TIER_INFO 保持一致
  v_yuan := case p_period
    when 'monthly' then
      case p_tier when 'lite' then 29 when 'plus' then 59 when 'pro' then 199 when 'max' then 399 end
    else
      case p_tier when 'lite' then 199 when 'plus' then 399 when 'pro' then 1399 when 'max' then 2999 end
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
