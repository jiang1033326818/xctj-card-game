#!/bin/bash

echo "🚀 开始部署到Vercel..."

# 检查vercel是否安装
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI未安装，正在安装..."
    npm install -g vercel
fi

# 检查项目结构
echo "📁 检查项目结构..."
if [ ! -d "api" ]; then
    echo "❌ api目录不存在"
    exit 1
fi

if [ ! -d "public" ]; then
    echo "❌ public目录不存在"
    exit 1
fi

echo "✅ 项目结构正确"

# 登录Vercel
echo "🔐 请登录Vercel..."
vercel login

# 部署项目
echo "🚀 开始部署..."
vercel --prod

echo "✅ 部署完成！"
echo "🌐 请查看上方提供的URL访问你的应用"