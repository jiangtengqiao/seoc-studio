-- ============================================================
-- SEOC Studio AI Platform v10 修复（在 fix-v9 之后执行，幂等）
-- 1. 通知「标记已读」改为客户端直连更新（新增 self update 策略）
--    —— 此前 RPC 在个别会话下 auth.uid() 取不到导致静默失败
-- 2. 新增通知删除能力（self delete 策略）
-- ============================================================

-- 用户可把自己通知标记为已读（读状态只进不退，防止误改其他字段风险最小化）
drop policy if exists "notifications self mark read" on notifications;
create policy "notifications self mark read" on notifications
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id and read = true);

-- 用户可删除自己的通知
drop policy if exists "notifications self delete" on notifications;
create policy "notifications self delete" on notifications
  for delete using (auth.uid() = user_id);
