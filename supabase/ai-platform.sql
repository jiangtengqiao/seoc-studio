-- SEOC Studio AI Platform (研智助手) 数据库脚本
-- 可重复执行。在 Supabase SQL Editor 中整体执行一次即可。
-- 积分体系：研点 (Research Points)
-- 会员体系：Lite / Plus / Pro / Max（双轨制：会员是使用门槛，研点是消耗计量）

-- ============================================================
-- 0. profiles 扩展 — 增加会员等级字段
-- ============================================================
alter table profiles add column if not exists membership_tier text not null default 'free' check (membership_tier in ('free','lite','plus','pro','max'));
alter table profiles add column if not exists membership_expires_at timestamptz;

-- ============================================================
-- 1. ai_models — 模型注册表（管理员维护）
-- ============================================================
create table if not exists ai_models (
  id text primary key,
  provider text not null check (provider in ('bytedance', 'alibaba', 'zhipu', 'deepseek', 'anthropic')),
  display_name jsonb not null default '{}',
  input_price numeric(10,6) not null default 0,
  output_price numeric(10,6) not null default 0,
  free_daily_quota int not null default 0,
  min_tier text not null default 'lite' check (min_tier in ('lite','plus','pro','max')),
  enabled boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 兼容旧库：若 ai_models 表已存在但缺少 min_tier 列，则补充
alter table ai_models add column if not exists min_tier text not null default 'lite' check (min_tier in ('lite','plus','pro','max'));
-- 扩展 provider 约束以支持 anthropic
alter table ai_models drop constraint if exists ai_models_provider_check;
alter table ai_models add constraint ai_models_provider_check check (provider in ('bytedance', 'alibaba', 'zhipu', 'deepseek', 'anthropic'));

-- ============================================================
-- 2. ai_credits — 用户研点余额
-- ============================================================
create table if not exists ai_credits (
  user_id uuid primary key references profiles(id) on delete cascade,
  balance numeric(12,4) not null default 0,
  free_remaining int not null default 0,
  free_reset_date date not null default current_date,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 3. ai_transactions — 研点流水
-- ============================================================
create table if not exists ai_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  amount numeric(12,4) not null,
  type text not null check (type in ('purchase', 'consumption', 'free_grant', 'refund', 'admin_adjust')),
  ref_id text,
  note text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 4. ai_usage_logs — 每条消息 token 用量与扣费
-- ============================================================
create table if not exists ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  model_id text not null references ai_models(id),
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cost numeric(10,6) not null default 0,
  is_free boolean not null default false,
  api_key_id uuid,
  interrupted boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 5. ai_api_keys — 用户 API 密钥
-- ============================================================
create table if not exists ai_api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  key_hash text not null unique,
  name text not null,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 6. ai_context_configs — 预留：AI 上下文配置（二次开发用）
-- ============================================================
create table if not exists ai_context_configs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  content_sources jsonb not null default '[]',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- RLS 策略
-- ============================================================

alter table ai_models enable row level security;
alter table ai_credits enable row level security;
alter table ai_transactions enable row level security;
alter table ai_usage_logs enable row level security;
alter table ai_api_keys enable row level security;
alter table ai_context_configs enable row level security;

-- ai_models: 公开读，管理员写
drop policy if exists "ai_models public read" on ai_models;
drop policy if exists "ai_models admin write" on ai_models;
create policy "ai_models public read" on ai_models for select using (true);
create policy "ai_models admin write" on ai_models for all using (is_admin());

-- ai_credits: 本人读写，管理员全权
drop policy if exists "ai_credits self read" on ai_credits;
drop policy if exists "ai_credits self update" on ai_credits;
drop policy if exists "ai_credits admin write" on ai_credits;
create policy "ai_credits self read" on ai_credits for select using (auth.uid() = user_id or is_admin());
create policy "ai_credits self update" on ai_credits for update using (auth.uid() = user_id);
create policy "ai_credits admin write" on ai_credits for all using (is_admin());

-- ai_transactions: 本人读，本人插入，管理员全权
drop policy if exists "ai_transactions self read" on ai_transactions;
drop policy if exists "ai_transactions self insert" on ai_transactions;
drop policy if exists "ai_transactions admin write" on ai_transactions;
create policy "ai_transactions self read" on ai_transactions for select using (auth.uid() = user_id or is_admin());
create policy "ai_transactions self insert" on ai_transactions for insert with check (auth.uid() = user_id);
create policy "ai_transactions admin write" on ai_transactions for all using (is_admin());

-- ai_usage_logs: 本人读+插入，管理员全权
drop policy if exists "ai_usage_logs self read" on ai_usage_logs;
drop policy if exists "ai_usage_logs self insert" on ai_usage_logs;
drop policy if exists "ai_usage_logs admin write" on ai_usage_logs;
create policy "ai_usage_logs self read" on ai_usage_logs for select using (auth.uid() = user_id or is_admin());
create policy "ai_usage_logs self insert" on ai_usage_logs for insert with check (auth.uid() = user_id);
create policy "ai_usage_logs admin write" on ai_usage_logs for all using (is_admin());

-- ai_api_keys: 本人读写，管理员全权
drop policy if exists "ai_api_keys self read" on ai_api_keys;
drop policy if exists "ai_api_keys self insert" on ai_api_keys;
drop policy if exists "ai_api_keys self delete" on ai_api_keys;
drop policy if exists "ai_api_keys admin write" on ai_api_keys;
create policy "ai_api_keys self read" on ai_api_keys for select using (auth.uid() = user_id or is_admin());
create policy "ai_api_keys self insert" on ai_api_keys for insert with check (auth.uid() = user_id);
create policy "ai_api_keys self delete" on ai_api_keys for delete using (auth.uid() = user_id);
create policy "ai_api_keys admin write" on ai_api_keys for all using (is_admin());

-- ai_context_configs: 公开读，管理员写
drop policy if exists "ai_context_configs public read" on ai_context_configs;
drop policy if exists "ai_context_configs admin write" on ai_context_configs;
create policy "ai_context_configs public read" on ai_context_configs for select using (true);
create policy "ai_context_configs admin write" on ai_context_configs for all using (is_admin());

-- ============================================================
-- 触发器：新用户注册时自动创建 ai_credits 记录
-- ============================================================
create or replace function handle_ai_credits_for_new_user()
returns trigger language plpgsql security definer set search_path = public as
$$
begin
  insert into ai_credits (user_id, balance, free_remaining, free_reset_date)
  values (new.id, 0, 0, current_date)
  on conflict (user_id) do nothing;
  return new;
exception when others then
  return new;
end;
$$;

-- 挂到 public.profiles（而非 auth.users）：
-- 修复注册报错 "Database error saving new user"。原挂 auth.users 时，
-- 该触发器可能与 handle_new_user 竞争执行顺序，profiles 行尚未创建时
-- 插入 ai_credits 会触发外键 (references profiles(id)) 违反，
-- 导致整个注册事务回滚。改挂 profiles 后，profiles 行必然已存在。
drop trigger if exists on_auth_user_created_ai_credits on auth.users;
drop trigger if exists on_auth_user_created_ai_credits on profiles;
create trigger on_auth_user_created_ai_credits
  after insert on profiles
  for each row execute function handle_ai_credits_for_new_user();

-- ============================================================
-- 索引
-- ============================================================
create index if not exists idx_ai_transactions_user on ai_transactions(user_id, created_at desc);
create index if not exists idx_ai_usage_logs_user on ai_usage_logs(user_id, created_at desc);
create index if not exists idx_ai_usage_logs_model on ai_usage_logs(model_id, created_at desc);
create index if not exists idx_ai_api_keys_user on ai_api_keys(user_id);
create index if not exists idx_ai_api_keys_hash on ai_api_keys(key_hash);

-- ============================================================
-- 初始模型数据
-- ============================================================
insert into ai_models (id, provider, display_name, input_price, output_price, free_daily_quota, min_tier, enabled, sort_order)
values
  -- 豆包（字节跳动）
  ('doubao-pro-32k', 'bytedance',
   '{"zh-CN":"豆包 Pro 32K","en":"Doubao Pro 32K","ja":"Doubao Pro 32K","ko":"Doubao Pro 32K","fr":"Doubao Pro 32K","de":"Doubao Pro 32K","es":"Doubao Pro 32K","ru":"Doubao Pro 32K","zh-TW":"豆包 Pro 32K"}',
   4.000000, 12.000000, 5, 'lite', true, 1),
  ('doubao-lite-32k', 'bytedance',
   '{"zh-CN":"豆包 Lite 32K","en":"Doubao Lite 32K","ja":"Doubao Lite 32K","ko":"Doubao Lite 32K","fr":"Doubao Lite 32K","de":"Doubao Lite 32K","es":"Doubao Lite 32K","ru":"Doubao Lite 32K","zh-TW":"豆包 Lite 32K"}',
   0.400000, 1.200000, 20, 'lite', true, 2),
  -- 通义千问（阿里云）
  ('qwen-turbo', 'alibaba',
   '{"zh-CN":"通义千问 Turbo","en":"Qwen Turbo","ja":"Qwen Turbo","ko":"Qwen Turbo","fr":"Qwen Turbo","de":"Qwen Turbo","es":"Qwen Turbo","ru":"Qwen Turbo","zh-TW":"通義千問 Turbo"}',
   0.500000, 1.500000, 10, 'lite', true, 3),
  ('qwen-plus', 'alibaba',
   '{"zh-CN":"通义千问 Plus","en":"Qwen Plus","ja":"Qwen Plus","ko":"Qwen Plus","fr":"Qwen Plus","de":"Qwen Plus","es":"Qwen Plus","ru":"Qwen Plus","zh-TW":"通義千問 Plus"}',
   0.800000, 2.000000, 5, 'lite', true, 4),
  ('qwen-max', 'alibaba',
   '{"zh-CN":"通义千问 Max","en":"Qwen Max","ja":"Qwen Max","ko":"Qwen Max","fr":"Qwen Max","de":"Qwen Max","es":"Qwen Max","ru":"Qwen Max","zh-TW":"通義千問 Max"}',
   2.000000, 6.000000, 3, 'plus', true, 5),
  ('qwen-long', 'alibaba',
   '{"zh-CN":"通义千问 Long","en":"Qwen Long","ja":"Qwen Long","ko":"Qwen Long","fr":"Qwen Long","de":"Qwen Long","es":"Qwen Long","ru":"Qwen Long","zh-TW":"通義千問 Long"}',
   0.700000, 2.000000, 0, 'plus', true, 6),
  -- 智谱
  ('glm-4-flash', 'zhipu',
   '{"zh-CN":"智谱 GLM-4 Flash","en":"Zhipu GLM-4 Flash","ja":"Zhipu GLM-4 Flash","ko":"Zhipu GLM-4 Flash","fr":"Zhipu GLM-4 Flash","de":"Zhipu GLM-4 Flash","es":"Zhipu GLM-4 Flash","ru":"Zhipu GLM-4 Flash","zh-TW":"智譜 GLM-4 Flash"}',
   0.000000, 0.000000, 999, 'lite', true, 7),
  ('glm-4-air', 'zhipu',
   '{"zh-CN":"智谱 GLM-4 Air","en":"Zhipu GLM-4 Air","ja":"Zhipu GLM-4 Air","ko":"Zhipu GLM-4 Air","fr":"Zhipu GLM-4 Air","de":"Zhipu GLM-4 Air","es":"Zhipu GLM-4 Air","ru":"Zhipu GLM-4 Air","zh-TW":"智譜 GLM-4 Air"}',
   0.500000, 0.500000, 5, 'lite', true, 8),
  ('glm-4', 'zhipu',
   '{"zh-CN":"智谱 GLM-4","en":"Zhipu GLM-4","ja":"Zhipu GLM-4","ko":"Zhipu GLM-4","fr":"Zhipu GLM-4","de":"Zhipu GLM-4","es":"Zhipu GLM-4","ru":"Zhipu GLM-4","zh-TW":"智譜 GLM-4"}',
   5.000000, 15.000000, 0, 'plus', true, 9),
  ('glm-4-plus', 'zhipu',
   '{"zh-CN":"智谱 GLM-4 Plus","en":"Zhipu GLM-4 Plus","ja":"Zhipu GLM-4 Plus","ko":"Zhipu GLM-4 Plus","fr":"Zhipu GLM-4 Plus","de":"Zhipu GLM-4 Plus","es":"Zhipu GLM-4 Plus","ru":"Zhipu GLM-4 Plus","zh-TW":"智譜 GLM-4 Plus"}',
   8.000000, 24.000000, 0, 'pro', true, 10),
  -- DeepSeek
  ('deepseek-chat', 'deepseek',
   '{"zh-CN":"DeepSeek Chat (V3)","en":"DeepSeek Chat (V3)","ja":"DeepSeek Chat (V3)","ko":"DeepSeek Chat (V3)","fr":"DeepSeek Chat (V3)","de":"DeepSeek Chat (V3)","es":"DeepSeek Chat (V3)","ru":"DeepSeek Chat (V3)","zh-TW":"DeepSeek Chat (V3)"}',
   2.000000, 8.000000, 5, 'lite', true, 11),
  ('deepseek-reasoner', 'deepseek',
   '{"zh-CN":"DeepSeek Reasoner (R1)","en":"DeepSeek Reasoner (R1)","ja":"DeepSeek Reasoner (R1)","ko":"DeepSeek Reasoner (R1)","fr":"DeepSeek Reasoner (R1)","de":"DeepSeek Reasoner (R1)","es":"DeepSeek Reasoner (R1)","ru":"DeepSeek Reasoner (R1)","zh-TW":"DeepSeek Reasoner (R1)"}',
   8.000000, 24.000000, 2, 'pro', true, 12)
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

-- ============================================================
-- 7. ai_topup_orders — 研点充值订单（人工确认制，与 purchases 流程一致）
-- ============================================================
create table if not exists ai_topup_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  yuan numeric(10,2) not null,
  points numeric(12,4) not null,
  status text not null default 'pending' check (status in ('pending','confirmed','rejected')),
  note text,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

alter table ai_topup_orders enable row level security;

drop policy if exists "ai_topup_orders self read" on ai_topup_orders;
drop policy if exists "ai_topup_orders self insert" on ai_topup_orders;
drop policy if exists "ai_topup_orders admin write" on ai_topup_orders;
create policy "ai_topup_orders self read" on ai_topup_orders for select using (auth.uid() = user_id or is_admin());
create policy "ai_topup_orders self insert" on ai_topup_orders for insert with check (auth.uid() = user_id);
create policy "ai_topup_orders admin write" on ai_topup_orders for all using (is_admin()) with check (is_admin());

create index if not exists idx_ai_topup_orders_user on ai_topup_orders(user_id, created_at desc);
create index if not exists idx_ai_topup_orders_status on ai_topup_orders(status);

-- ============================================================
-- 触发器：订单确认时自动加余额并记交易（security definer 绕过 RLS）
-- ============================================================
create or replace function confirm_ai_topup_order()
returns trigger language plpgsql security definer as
$$
begin
  if (new.status = 'confirmed' and (old.status is distinct from 'confirmed')) then
    insert into ai_credits (user_id, balance, free_remaining, free_reset_date)
    values (new.user_id, new.points, 0, current_date)
    on conflict (user_id) do update set
      balance = ai_credits.balance + new.points,
      updated_at = now();

    insert into ai_transactions (user_id, amount, type, ref_id, note)
    values (new.user_id, new.points, 'purchase', new.id::text,
            '充值 ' || new.yuan || ' 元，购买 ' || new.points || ' 研点');

    new.confirmed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists on_ai_topup_order_confirm on ai_topup_orders;
create trigger on_ai_topup_order_confirm
  before update on ai_topup_orders
  for each row execute function confirm_ai_topup_order();

-- ============================================================
-- 8. ai_membership_orders — 会员订单（人工确认制）
-- ============================================================
create table if not exists ai_membership_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  tier text not null check (tier in ('lite','plus','pro','max')),
  period text not null check (period in ('monthly','yearly')),
  yuan numeric(10,2) not null,
  granted_points numeric(12,4) not null default 0,
  status text not null default 'pending' check (status in ('pending','confirmed','rejected')),
  note text,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

alter table ai_membership_orders enable row level security;

drop policy if exists "ai_membership_orders self read" on ai_membership_orders;
drop policy if exists "ai_membership_orders self insert" on ai_membership_orders;
drop policy if exists "ai_membership_orders admin write" on ai_membership_orders;
create policy "ai_membership_orders self read" on ai_membership_orders for select using (auth.uid() = user_id or is_admin());
create policy "ai_membership_orders self insert" on ai_membership_orders for insert with check (auth.uid() = user_id);
create policy "ai_membership_orders admin write" on ai_membership_orders for all using (is_admin()) with check (is_admin());

create index if not exists idx_ai_membership_orders_user on ai_membership_orders(user_id, created_at desc);
create index if not exists idx_ai_membership_orders_status on ai_membership_orders(status);

-- 触发器：会员订单确认时自动升级 tier + 发放研点
create or replace function confirm_ai_membership_order()
returns trigger language plpgsql security definer as
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
      membership_expires_at = case
        when new.period = 'monthly' then (now() + interval '1 month')::timestamptz
        when new.period = 'yearly' then (now() + interval '1 year')::timestamptz
        else (now() + interval '1 month')::timestamptz
      end
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

-- ============================================================
-- 订单限时 & 自动取消（30 分钟未确认自动取消）
-- ============================================================
alter table ai_topup_orders add column if not exists expires_at timestamptz;
alter table ai_membership_orders add column if not exists expires_at timestamptz;

-- 给已有 pending 订单补 expires_at
update ai_topup_orders set expires_at = created_at + interval '30 minutes'
  where status = 'pending' and expires_at is null;
update ai_membership_orders set expires_at = created_at + interval '30 minutes'
  where status = 'pending' and expires_at is null;

-- 创建订单时自动设置 expires_at（30 分钟有效）
create or replace function set_order_expires_at()
returns trigger language plpgsql as
$$
begin
  if new.status = 'pending' and new.expires_at is null then
    new.expires_at = now() + interval '30 minutes';
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

-- 自动取消过期订单（前端加载列表时调用）
create or replace function cancel_expired_orders()
returns void language plpgsql as
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

-- ============================================================
-- 模型价格更新与安全加固：请执行 supabase/fix-v7-ai-hardening.sql
-- （原此处有一段与上方冲突的模型 INSERT，会把价格覆盖回旧口径，
--   现已移除；统一价格表、禁用 anthropic、RLS 修复都在 fix-v7 中。）
-- ============================================================

