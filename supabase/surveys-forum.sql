-- SEOC Studio 问卷中心 + 讨论区 schema
-- 在 Supabase SQL Editor 中整体执行一次即可（可重复执行）。

-- 问卷定义（管理员发布）
create table if not exists surveys (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  intro text not null default '',
  content jsonb not null,          -- 结构化问卷（sections/questions/appendix）
  source_md text not null default '', -- 原始 Markdown 留档
  status text not null default 'published' check (status in ('draft', 'published', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 用户答卷
create table if not exists survey_responses (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references surveys(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  answers jsonb not null,
  created_at timestamptz not null default now(),
  unique (survey_id, user_id)      -- 每用户每问卷仅一份
);

-- 讨论区帖子
create table if not exists forum_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  body text not null,
  tag text not null default '学习交流',
  created_at timestamptz not null default now()
);

-- 讨论区评论
create table if not exists forum_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references forum_posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

alter table surveys enable row level security;
alter table survey_responses enable row level security;
alter table forum_posts enable row level security;
alter table forum_comments enable row level security;

drop policy if exists "surveys public read" on surveys;
drop policy if exists "surveys admin write" on surveys;
drop policy if exists "responses self read" on survey_responses;
drop policy if exists "responses self insert" on survey_responses;
drop policy if exists "responses admin read" on survey_responses;
drop policy if exists "posts public read" on forum_posts;
drop policy if exists "posts auth insert" on forum_posts;
drop policy if exists "posts owner delete" on forum_posts;
drop policy if exists "comments public read" on forum_comments;
drop policy if exists "comments auth insert" on forum_comments;
drop policy if exists "comments owner delete" on forum_comments;

create policy "surveys public read" on surveys for select using (status = 'published' or is_admin());
create policy "surveys admin write" on surveys for all using (is_admin());

create policy "responses self read" on survey_responses for select using (auth.uid() = user_id);
create policy "responses self insert" on survey_responses for insert with check (auth.uid() = user_id);
create policy "responses admin read" on survey_responses for all using (is_admin());

create policy "posts public read" on forum_posts for select using (true);
create policy "posts auth insert" on forum_posts for insert with check (auth.uid() = user_id);
create policy "posts owner delete" on forum_posts for delete using (auth.uid() = user_id or is_admin());

create policy "comments public read" on forum_comments for select using (true);
create policy "comments auth insert" on forum_comments for insert with check (auth.uid() = user_id);
create policy "comments owner delete" on forum_comments for delete using (auth.uid() = user_id or is_admin());

-- 管理员查看问卷回收统计的辅助视图
create or replace view survey_stats as
select s.id, s.slug, s.title, s.status, s.created_at,
       count(r.id) as response_count
from surveys s
left join survey_responses r on r.survey_id = s.id
group by s.id;
