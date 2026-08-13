# 研智助手 v7+v8 安全加固与功能补齐 · 部署说明

本批次修复了研智助手的计费漏洞、RLS 越权、订单伪造、死模型、并发透支等问题，
并补齐了会话历史、停止生成、OpenAI 兼容、限流、站内通知、用户管理、在线模型编辑、
内容审核、会员到期提醒等系统级功能。
**上线需要三步：数据库迁移 → Edge Function 重新部署 → 前端重建。**

## 一、数据库迁移（必做）

在 Supabase 控制台 **SQL Editor** 中，**先执行 fix-v7，再执行 fix-v8**（均为幂等，可重复执行）：

1. `supabase/fix-v7-ai-hardening.sql` —— 计费与权限加固
2. `supabase/fix-v8-ai-admin.sql` —— 管理功能

fix-v7 做了这些事：

| # | 修复 | 说明 |
|---|------|------|
| 1 | 删除 `ai_credits self update` RLS | 此前任何用户可用 PostgREST 直接把自己的余额改成任意值 |
| 2 | 删除 `ai_transactions / ai_usage_logs self insert` | 防伪造流水与用量 |
| 3 | 订单表补 `admin_note` 列 | 前端取消与超时自动取消一直在引用不存在的列，导致报错 |
| 4 | `create_ai_topup_order` / `create_ai_membership_order` RPC | 订单金额改为服务端价格表，客户端无法再伪造 0.01 元买 8 万研点 |
| 5 | `cancel_ai_topup_order` / `cancel_ai_membership_order` RPC | 此前用户取消订单被 RLS 拦截（按钮必失败），现走服务端校验 |
| 6 | `spend_ai_credits` / `spend_ai_free_quota` RPC | 原子扣费，防并发请求透支余额 |
| 7 | 重写 `confirm_ai_membership_order` 触发器 | 续费改为**顺延**到期时间（原实现直接覆盖，续费损失剩余天数） |
| 8 | 禁用 anthropic 模型 | `claude-sonnet-4` 此前启用但 Edge Function 无对应端点，调用必 500 |
| 9 | 统一模型定价表 | 原脚本两段 INSERT 互相覆盖，价格口径混乱 |
| 10 | `get_ai_platform_stats` RPC | Admin 页此前显示的是管理员个人统计，现为全站统计 |
| 11 | 新建 `ai_conversations` / `ai_messages` 表 + 保存 RPC | 聊天历史持久化 |
| 12 | 重写 `cancel_expired_orders` | 修复对 admin_note 的引用 |

fix-v8 做了这些事：

| # | 新增 | 说明 |
|---|------|------|
| 1 | `profiles.is_banned` | 封禁字段，Edge Function 强制校验 |
| 2 | `notifications` 站内通知 | 订单确认/驳回自动通知用户，顶栏铃铛展示 |
| 3 | `check_membership_expiry_reminders` RPC | 会员 3 天内到期自动提醒（应用加载时触发，每天最多一次） |
| 4 | `ai_content_filters` 内容审核词表 | 聊天/API 输入命中敏感词即拒绝，Admin 在线维护 |
| 5 | 管理员 RPC | 用户列表 / 调整研点 / 设置会员 / 封禁解封 |

> 注意：`ai-platform.sql` 中与旧价格冲突的第二段模型 INSERT 已移除（避免再次覆盖新价格）。

## 二、Edge Function 重新部署（必做）

代码有两种部署方式，**任选其一**：

### 方式 A：CLI 部署（推荐）

```bash
npx supabase functions deploy ai-chat
npx supabase functions deploy ai-api-proxy
```

### 方式 B：控制台手工粘贴（无 CLI 时）

把以下文件内容贴到对应 Edge Function 编辑器（File name 保持 `index.ts`）：

- `ai-chat` ← `supabase/functions/.deploy/ai-chat-inline.ts`
- `ai-api-proxy` ← `supabase/functions/.deploy/ai-api-proxy-inline.ts`

> 内联版由 `node scripts/gen-inline-deploy.cjs` 自动生成，改完正式版记得重新生成。

## 三、前端重建（GitHub Pages 自动完成）

推送 `main` 分支后，`.github/workflows/deploy.yml` 会自动 `npm run build` 并发布到 gh-pages，无需手工操作。本地验证：

```bash
npm run build     # tsc + vite，应无报错
npm run dev       # 本地冒烟
```

## 四、部署后验证清单

1. 普通用户用浏览器 DevTools 尝试 `update ai_credits set balance=999999 where user_id=me` → 应被 RLS 拒绝（无策略）。
2. 免费额度（`free_remaining > 0`）发一条超长消息 → 服务端应返回 400「输入过长」。
3. 选 `claude-sonnet-4` → 模型列表中不应再出现（已禁用）。
4. 用户取消 pending 订单 → 状态变为「已驳回」并写 admin_note「用户主动取消」。
5. 聊天页刷新 → 会话在侧边栏保留；停止按钮能中断生成。
6. Admin「AI 平台管理」统计卡显示全站数据（含今日调用数、待确认订单数）。
7. OpenAI 客户端先请求 `GET /v1/models` → 返回模型列表。
8. 一分钟内连发 16 条聊天请求 → 第 16 条返回 429。
9. 订单确认/驳回后 → 用户顶栏铃铛收到站内通知。
10. Admin 在线改模型价格 → 保存后立即生效。
11. Admin 封禁某用户 → 该用户聊天/API 立即被 403 拒绝。
12. 聊天输入命中 Admin 配置的敏感词 → 返回 400「输入包含违规内容」。

## 五、回滚

- 前端：`git revert <commit>`
- 数据库：RLS 相关变更如需回滚，手动执行
  `create policy "ai_credits self update" on ai_credits for update using (auth.uid() = user_id);`（不推荐，存在余额篡改漏洞）
- Edge Function：用旧代码重新部署（git 历史中取 `supabase/functions/` 旧版本）。
