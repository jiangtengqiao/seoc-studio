#!/usr/bin/env bash
# 网络恢复后执行此脚本，把本地代码推送到 GitHub。
# 用法：bash scripts/push-github.sh 你的Token
set -e
cd "$(dirname "$0")/.."
TOKEN="$1"
if [ -z "$TOKEN" ]; then
  echo "用法：bash scripts/push-github.sh 你的GitHubToken"
  exit 1
fi
git add -A
git -c user.name="jiangtengqiao" -c user.email="jiangtengqiao@qq.com" commit -m "update $(date +%F)" || true
git -c http.extraHeader="Authorization: Bearer $TOKEN" push -u origin main
echo "推送完成：https://github.com/jiangtengqiao/seoc-studio"
