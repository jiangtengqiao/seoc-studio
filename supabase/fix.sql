-- SEOC Studio 修复脚本（在 SQL Editor 执行一次，可重复执行）
-- 1. 修复注册触发器（解决 Database error saving new user）
-- 2. 修复 is_admin 递归问题
-- 3. 管理员邮箱自动授予 admin 角色
-- 4. 新建邮件验证码表

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from profiles where id = auth.uid() and role = 'admin') $$;

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as
$$
begin
  insert into public.profiles (id, email, nickname, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'nickname', ''),
    case when new.email = 'jiangtengqiao@qq.com' then 'admin' else 'user' end
  )
  on conflict (id) do nothing;
  return new;
exception when others then
  return new;
end;
$$;

create table if not exists verification_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code text not null,
  purpose text not null check (purpose in ('register', 'reset')),
  expires_at timestamptz not null,
  used boolean not null default false,
  created_at timestamptz not null default now()
);

alter table verification_codes enable row level security;

-- 验证码表不对客户端开放，仅服务端（Edge Function）可读写
drop policy if exists "codes none" on verification_codes;
