#!/bin/bash

echo "🍺 使用Homebrew升级Node.js..."

# 检查是否安装了Homebrew
if ! command -v brew &> /dev/null; then
    echo "❌ 请先安装Homebrew: https://brew.sh/"
    exit 1
fi

# 卸载旧版本Node.js
echo "🗑️ 卸载旧版本..."
brew uninstall --ignore-dependencies node

# 安装最新版本Node.js
echo "⬇️ 安装最新版本Node.js..."
brew install node

# 验证版本
echo "✅ Node.js版本："
node --version
npm --version

# 重新安装Vercel CLI
echo "🚀 重新安装Vercel CLI..."
npm install -g vercel

echo "✅ 升级完成！"