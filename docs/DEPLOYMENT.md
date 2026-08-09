# 部署与运维手册

本手册覆盖从零到上线的完整流程。全部环节使用免费档，无需绑定信用卡。

## 一、托管架构

- 前端：Cloudflare Pages，免费档包含无限站点、全球 CDN、自动 HTTPS。
- 后端：Supabase 免费档，包含 Postgres 数据库、Auth 认证、1GB 文件存储。
- 代码仓库：GitHub 私有仓库，Cloudflare Pages 关联后每次推送自动部署。

## 二、创建 Supabase 项目

1. 打开 supabase.com，用 GitHub 账户登录，新建项目，区域任选（新加坡对国内访问相对友好）。
2. 项目创建完成后，进入 SQL Editor，粘贴并执行 `supabase/schema.sql` 全文。
3. 进入 Settings，API 页面，记录 Project URL 与 anon public key。
4. 进入 Authentication，Providers，确认 Email 登录已开启。免费档允许关闭注册邮箱验证以简化流程，生产环境建议保持开启。

## 三、部署前端到 Cloudflare Pages

方式一：Git 集成（推荐，便于后期维护）

1. 将本项目推送到 GitHub 仓库。
2. 在 Cloudflare 控制台进入 Workers 与 Pages，创建 Pages 项目，关联该仓库。
3. 构建配置：
   - Framework preset：Vite
   - Build command：`npm run build`
   - Build output directory：`dist`
4. 环境变量：在 Pages 项目 Settings，Environment variables 中添加：
   - `VITE_SUPABASE_URL` = 第二步记录的 Project URL
   - `VITE_SUPABASE_ANON_KEY` = anon public key
5. 保存并部署。几分钟后获得 `xxx.pages.dev` 域名。

方式二：直接上传（无 Git 场景）

本地执行 `npm run build`，在 Pages 控制台选择 Direct Upload，上传 `dist` 目录。

## 四、绑定自有域名（可选）

在 Pages 项目的 Custom domains 中添加你的域名，按提示在域名服务商处添加 CNAME 记录。Cloudflare 自动签发免费 HTTPS 证书。

## 五、Supabase 侧配置

1. 进入 Authentication，URL Configuration，将 Site URL 设为你的站点地址（如 `https://xxx.pages.dev`），并把该地址加入 Redirect URLs，否则忘记密码邮件的链接会失效。
2. 创建管理员：在 Authentication，Users 中手动添加你的邮箱账户，然后在 SQL Editor 执行：

```sql
update profiles set role = 'admin' where email = '你的邮箱';
```

## 六、日常运维

| 任务 | 操作入口 |
|---|---|
| 发布或更新期刊 | 网站管理端 `/admin` 的发布期刊页，或直接向 issues 表写入 |
| 发布公告 | 网站管理端 `/admin` 的公告页 |
| 确认用户开通 | 管理端选购确认页，核验收款后点确认 |
| 查看用户邮箱 | Supabase 控制台 Authentication 与 profiles 表 |
| 上传附赠资料 | Supabase Storage 建 `materials` 桶上传，再在 materials 表登记 |
| 修改站点内容 | 推送代码到 GitHub，自动触发重新部署 |

## 七、备份

1. 数据库：Supabase 控制台 Database，Backups，免费档提供 7 天滚动备份。
2. 代码：GitHub 仓库即完整备份。
3. 内置内容：`src/content/` 下的 Markdown 文件随仓库版本化管理。

## 八、多终端维护

任何一台电脑只要装好 Node.js，克隆仓库后 `npm install` 即可开发。内容类修改（期刊、公告）建议优先使用网站管理端在线完成，无需接触代码；结构类修改（页面、样式）在本地改完推送即可，其他终端拉取最新代码保持同步。

## 九、自动化部署（v2 新增）

提供两条自动化路径，任选其一。

### 路径 A：GitHub Actions 推送即部署

1. 把代码推送到 GitHub 仓库的 main 分支。
2. 在仓库 Settings，Secrets and variables，Actions 中添加四个机密：
   - `CLOUDFLARE_API_TOKEN`：在 Cloudflare 控制台的 My Profile，API Tokens 创建，模板选 Edit Cloudflare Workers。
   - `CLOUDFLARE_ACCOUNT_ID`：Cloudflare 控制台右侧栏可见。
   - `VITE_SUPABASE_URL` 与 `VITE_SUPABASE_ANON_KEY`：Supabase 项目 API 页。
3. 之后每次 `git push`，仓库的 Actions 会自动构建并发布到 `seoc-studio.pages.dev`。工作流文件已内置在 `.github/workflows/deploy.yml`。

### 路径 B：本地一键部署

```bash
bash scripts/deploy.sh
```

首次运行会弹出浏览器要求完成 Cloudflare 授权（wrangler login 流程），授权一次后凭证缓存在本机，之后每次执行脚本都是全自动的构建加发布。
