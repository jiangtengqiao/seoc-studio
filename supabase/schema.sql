-- SEOC Studio Supabase schema
-- 在 Supabase SQL Editor 中整体执行一次即可。

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  nickname text,
  role text not null default 'user' check (role in ('user', 'admin')),
  qq_bound boolean not null default false,
  wechat_bound boolean not null default false,
  linked_accounts jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table if not exists issues (
  id uuid primary key default gen_random_uuid(),
  product_slug text not null,
  issue_no int not null,
  title text not null,
  lang text not null default '中文',
  word_count int not null default 0,
  content_md text not null,
  patches jsonb not null default '[]',
  published_at timestamptz not null default now(),
  unique (product_slug, issue_no)
);

create table if not exists materials (
  id uuid primary key default gen_random_uuid(),
  product_slug text not null,
  title text not null,
  file_path text not null,
  size text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  product_slug text not null,
  issue_range text not null default 'all',
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected')),
  note text,
  created_at timestamptz not null default now()
);

create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  pinned boolean not null default false,
  published_at timestamptz not null default now()
);

create table if not exists assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  answers jsonb not null,
  result jsonb not null,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
alter table issues enable row level security;
alter table materials enable row level security;
alter table purchases enable row level security;
alter table announcements enable row level security;
alter table assessments enable row level security;

create or replace function is_admin() returns boolean language sql stable as
$$ select exists (select 1 from profiles where id = auth.uid() and role = 'admin') $$;

drop policy if exists "profiles self read" on profiles;
drop policy if exists "profiles self update" on profiles;
drop policy if exists "profiles admin write" on profiles;
drop policy if exists "issues read published" on issues;
drop policy if exists "issues admin write" on issues;
drop policy if exists "materials read owned" on materials;
drop policy if exists "materials admin write" on materials;
drop policy if exists "purchases self read" on purchases;
drop policy if exists "purchases self insert" on purchases;
drop policy if exists "purchases admin write" on purchases;
drop policy if exists "announcements public read" on announcements;
drop policy if exists "announcements admin write" on announcements;
drop policy if exists "assessments self" on assessments;

create policy "profiles self read" on profiles for select using (auth.uid() = id or is_admin());
create policy "profiles self update" on profiles for update using (auth.uid() = id);
create policy "profiles admin write" on profiles for all using (is_admin());

create policy "issues read published" on issues for select using (
  is_admin() or exists (
    select 1 from purchases p
    where p.user_id = auth.uid()
      and p.status = 'confirmed'
      and (
        p.product_slug = issues.product_slug
        or (p.product_slug = 'exploration-bundle' and issues.product_slug like 'exp-python-%')
      )
  )
);
create policy "issues admin write" on issues for all using (is_admin());

create policy "materials read owned" on materials for select using (
  is_admin() or exists (
    select 1 from purchases p
    where p.user_id = auth.uid()
      and p.status = 'confirmed'
      and (
        p.product_slug = materials.product_slug
        or (p.product_slug = 'exploration-bundle' and materials.product_slug like 'exp-python-%')
      )
  )
);
create policy "materials admin write" on materials for all using (is_admin());

create policy "purchases self read" on purchases for select using (auth.uid() = user_id or is_admin());
create policy "purchases self insert" on purchases for insert with check (auth.uid() = user_id);
create policy "purchases admin write" on purchases for update using (is_admin());

create policy "announcements public read" on announcements for select using (true);
create policy "announcements admin write" on announcements for all using (is_admin());

create policy "assessments self" on assessments for all using (auth.uid() = user_id or is_admin());

-- 注册后自动创建 profiles 记录
create or replace function handle_new_user() returns trigger language plpgsql security definer as
$$
begin
  insert into profiles (id, email, nickname)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'nickname', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
