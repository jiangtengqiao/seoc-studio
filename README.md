# SEOC Studio 编程研究与探索

编程研究与探索（Study and Explore of Coding）官方网站与数字内容平台。明亮现代科技风，前端静态托管于 Cloudflare Pages，后端使用 Supabase（认证、数据库、存储）。

## 快速开始

### 环境要求

- Node.js 18 及以上

### 安装与运行

```bash
npm install
npm run dev
```

构建生产版本：

```bash
npm run build
```

构建产物在 `dist/` 目录，可直接部署到 Cloudflare Pages。

### 连接 Supabase（可选）

复制 `.env.example` 为 `.env`，填入你的 Supabase 项目地址与匿名密钥。未配置时站点以本地演示模式运行，账户数据保存在浏览器本地。

```bash
cp .env.example .env
```

数据库结构见 `supabase/schema.sql`，在 Supabase SQL Editor 中执行一次即可。

## 目录结构

```
src/
├── components/     布局与通用组件
├── pages/          全部路由页面
├── lib/            认证、Supabase、内容服务
├── data/           产品目录（唯一数据源）
├── content/
│   ├── legal/      法律文本（Markdown，构建进站点）
│   └── issues/     连载期刊正文（Markdown，构建进站点）
└── styles/         全局样式与 design tokens
supabase/schema.sql 数据库建表脚本
docs/DEPLOYMENT.md  部署与运维手册
```

## 技术栈

Vite · React 18 · TypeScript · Tailwind CSS · React Router · Supabase · react-markdown
