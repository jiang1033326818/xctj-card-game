# 🐙 GitHub + Vercel 部署方案

如果本地Node.js版本升级困难，可以使用GitHub自动部署：

## 步骤1: 创建GitHub仓库

1. 访问 https://github.com/new
2. 创建新仓库，例如：`card-game-vercel`
3. 不要初始化README

## 步骤2: 推送代码到GitHub

```bash
# 初始化git仓库
git init

# 添加所有文件
git add .

# 提交代码
git commit -m "Initial commit: 喜从天降游戏"

# 添加远程仓库（替换为你的仓库地址）
git remote add origin https://github.com/YOUR_USERNAME/card-game-vercel.git

# 推送代码
git push -u origin main
```

## 步骤3: 连接Vercel

1. 访问 https://vercel.com
2. 使用GitHub账户登录
3. 点击 "New Project"
4. 选择你刚创建的仓库
5. 点击 "Deploy"

## 步骤4: 配置完成

- Vercel会自动检测到`vercel.json`配置
- 自动构建和部署
- 提供访问URL

## 优势

- ✅ 无需本地Node.js版本要求
- ✅ 自动部署，代码更新时自动重新部署
- ✅ 免费SSL证书
- ✅ 全球CDN加速

## 推送代码命令

```bash
git add .
git commit -m "Update game"
git push
```

每次推送后，Vercel会自动重新部署。