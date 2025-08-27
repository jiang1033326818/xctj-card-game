#!/bin/bash

echo "🔧 升级Node.js到18版本..."

# 检查是否安装了nvm
if ! command -v nvm &> /dev/null; then
    echo "📦 安装nvm..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
    
    # 重新加载bash配置
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
fi

# 安装Node.js 18
echo "⬇️ 安装Node.js 18..."
nvm install 18
nvm use 18
nvm alias default 18

# 验证版本
echo "✅ Node.js版本："
node --version
npm --version

# 重新安装Vercel CLI
echo "🚀 重新安装Vercel CLI..."
npm install -g vercel

echo "✅ 升级完成！现在可以使用Vercel了"