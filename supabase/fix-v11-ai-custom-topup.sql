-- ============================================================
-- SEOC Studio AI Platform v11 自定义金额充值（在 fix-v10 之后执行，幂等）
-- 自定义充值：金额必须为 1-100000 之间的正整数，1 元 = 1000 研点
-- （固定套餐 t10/t50/t100 含赠送比例，自定义金额无赠送）
-- ============================================================

create or replace function create_ai_topup_order_custom(p_yuan numeric)
returns ai_topup_orders
language plpgsql
security definer
set search_path = public
as
$$
declare
  v_user uuid := auth.uid();
  v_points numeric(12,4);
  v_order ai_topup_orders;
begin
  if v_user is null then
    raise exception '未登录';
  end if;

  -- 正整数校验（无小数、不小于 1、上限 10 万元防手误）
  if p_yuan is null or p_yuan <> floor(p_yuan) or p_yuan < 1 or p_yuan > 100000 then
    raise exception '充值金额必须为 1-100000 之间的正整数';
  end if;

  v_points := p_yuan * 1000;

  insert into ai_topup_orders (user_id, yuan, points)
  values (v_user, p_yuan, v_points)
  returning * into v_order;

  return v_order;
end;
$$;

revoke execute on function create_ai_topup_order_custom(numeric) from anon;
grant execute on function create_ai_topup_order_custom(numeric) to authenticated;
