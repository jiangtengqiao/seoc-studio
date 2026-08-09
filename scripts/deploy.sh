#!/usr/bin/env bash
# SEOC Studio 一键部署脚本（Cloudflare Pages 直连上传模式）
# 用法：bash scripts/deploy.sh
# 首次运行会打开浏览器完成 Cloudflare 授权，之后凭证缓存在本地，后续全自动化。

set -e
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "[提示] 未找到 .env，将以无 Supabase 的演示模式构建。如需真实后端，请先配置 .env。"
fi

echo "==> 安装依赖"
npm ci || npm install

echo "==> 构建"
npm run build

echo "==> 部署到 Cloudflare Pages（项目名 seoc-studio）"
npx wrangler pages deploy dist --project-name=seoc-studio --commit-dirty=true

echo "==> 完成。访问 https://seoc-studio.pages.dev 查看。"
