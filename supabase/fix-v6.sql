-- SEOC Studio v6：能力评估免费额度限制
-- 每日 2 次、每月 15 次，不提供付费加量。脚本可重复执行。

create or replace function enforce_assessment_free_quota() returns trigger
language plpgsql
security definer
set search_path = public
as
$$
declare
  daily_count int;
  monthly_count int;
  china_now timestamp := now() at time zone 'Asia/Shanghai';
begin
  if new.user_id is null then
    return new;
  end if;

  select count(*) into daily_count
  from assessments
  where user_id = new.user_id
    and (created_at at time zone 'Asia/Shanghai')::date = china_now::date;

  if daily_count >= 2 then
    raise exception '每日免费评估额度已用完（2 次）';
  end if;

  select count(*) into monthly_count
  from assessments
  where user_id = new.user_id
    and date_trunc('month', created_at at time zone 'Asia/Shanghai') = date_trunc('month', china_now);

  if monthly_count >= 15 then
    raise exception '本月免费评估额度已用完（15 次）';
  end if;

  return new;
end;
$$;

drop trigger if exists assessment_free_quota on assessments;
create trigger assessment_free_quota
  before insert on assessments
  for each row execute function enforce_assessment_free_quota();
