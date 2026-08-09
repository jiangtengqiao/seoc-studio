-- SEOC Studio v5：探索式总期刊包权限修复
-- 在 Supabase SQL Editor 中整体执行一次即可。脚本可重复执行。

drop policy if exists "issues read published" on issues;
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

drop policy if exists "materials read owned" on materials;
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
