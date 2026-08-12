-- SEOC Studio AI Platform (研智助手) 数据库脚本
-- 可重复执行。在 Supabase SQL Editor 中整体执行一次即可。
-- 积分体系：研点 (Research Points)

-- ============================================================
-- 1. ai_models — 模型注册表（管理员维护）
-- ============================================================
create table if not exists ai_models (
  id text primary key,
  provider text not null check (provider in ('bytedance', 'alibaba', 'zhipu', 'deepseek')),
  display_name jsonb not null default '{}',
  input_price numeric(10,6) not null default 0,
  output_price numeric(10,6) not null default 0,
  free_daily_quota int not null default 0,
  enabled boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
returns trigger language plpgsql security definer as
$$
begin
  insert into ai_credits (user_id, balance, free_remaining, free_reset_date)
  values (new.id, 0, 0, current_date)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- 将新 trigger 挂到 auth.users（与 handle_new_user 并行）
drop trigger if exists on_auth_user_created_ai_credits on auth.users;
create trigger on_auth_user_created_ai_credits
  after insert on auth.users
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
insert into ai_models (id, provider, display_name, input_price, output_price, free_daily_quota, enabled, sort_order)
values
  ('doubao-pro-32k', 'bytedance',
   '{"zh-CN":"豆包 Pro","en":"Doubao Pro","ja":"Doubao Pro","ko":"Doubao Pro","fr":"Doubao Pro","de":"Doubao Pro","es":"Doubao Pro","ru":"Doubao Pro","zh-TW":"豆包 Pro"}',
   4.000000, 12.000000, 5, true, 1),
  ('qwen-max', 'alibaba',
   '{"zh-CN":"通义千问 Max","en":"Qwen Max","ja":"Qwen Max","ko":"Qwen Max","fr":"Qwen Max","de":"Qwen Max","es":"Qwen Max","ru":"Qwen Max","zh-TW":"通義千問 Max"}',
   2.000000, 6.000000, 5, true, 2),
  ('qwen-turbo', 'alibaba',
   '{"zh-CN":"通义千问 Turbo","en":"Qwen Turbo","ja":"Qwen Turbo","ko":"Qwen Turbo","fr":"Qwen Turbo","de":"Qwen Turbo","es":"Qwen Turbo","ru":"Qwen Turbo","zh-TW":"通義千問 Turbo"}',
   0.500000, 1.500000, 10, true, 3),
  ('glm-4', 'zhipu',
   '{"zh-CN":"智谱 GLM-4","en":"Zhipu GLM-4","ja":"Zhipu GLM-4","ko":"Zhipu GLM-4","fr":"Zhipu GLM-4","de":"Zhipu GLM-4","es":"Zhipu GLM-4","ru":"Zhipu GLM-4","zh-TW":"智譜 GLM-4"}',
   5.000000, 15.000000, 3, true, 4),
  ('glm-4-flash', 'zhipu',
   '{"zh-CN":"智谱 GLM-4 Flash","en":"Zhipu GLM-4 Flash","ja":"Zhipu GLM-4 Flash","ko":"Zhipu GLM-4 Flash","fr":"Zhipu GLM-4 Flash","de":"Zhipu GLM-4 Flash","es":"Zhipu GLM-4 Flash","ru":"Zhipu GLM-4 Flash","zh-TW":"智譜 GLM-4 Flash"}',
   0.000000, 0.000000, 999, true, 5),
  ('deepseek-chat', 'deepseek',
   '{"zh-CN":"DeepSeek Chat","en":"DeepSeek Chat","ja":"DeepSeek Chat","ko":"DeepSeek Chat","fr":"DeepSeek Chat","de":"DeepSeek Chat","es":"DeepSeek Chat","ru":"DeepSeek Chat","zh-TW":"DeepSeek Chat"}',
   2.000000, 8.000000, 5, true, 6),
  ('deepseek-reasoner', 'deepseek',
   '{"zh-CN":"DeepSeek Reasoner (R1)","en":"DeepSeek Reasoner (R1)","ja":"DeepSeek Reasoner (R1)","ko":"DeepSeek Reasoner (R1)","fr":"DeepSeek Reasoner (R1)","de":"DeepSeek Reasoner (R1)","es":"DeepSeek Reasoner (R1)","ru":"DeepSeek Reasoner (R1)","zh-TW":"DeepSeek Reasoner (R1)"}',
   8.000000, 24.000000, 2, true, 7)
on conflict (id) do update set
  provider = excluded.provider,
  display_name = excluded.display_name,
  input_price = excluded.input_price,
  output_price = excluded.output_price,
  free_daily_quota = excluded.free_daily_quota,
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
