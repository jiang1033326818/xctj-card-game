# 喜从天降卡牌游戏

一个简单的卡牌游戏，使用MongoDB作为数据库，部署在Vercel上。

## 项目结构

- `/api/unified.js` - 统一API处理所有后端请求
- `/public/` - 前端静态文件
  - `index.html` - 首页
  - `login.html` - 登录/注册页面
  - `game.html` - 游戏页面
  - `admin.html` - 管理员页面

## 功能特性

- 用户认证（登录/注册）
- 角色区分（管理员/普通用户）
- 卡牌游戏（猜花色）
- 游戏记录
- 管理员统计面板

## 技术栈

- 前端：原生HTML/CSS/JavaScript
- 后端：Node.js
- 数据库：MongoDB Atlas
- 部署：Vercel

## 部署指南

1. 确保已设置MongoDB连接字符串环境变量：
   - 在Vercel项目设置中添加环境变量：`MONGODB_URI`

2. 部署到Vercel：
   ```bash
   vercel --prod
   ```

## 本地开发

1. 安装依赖：
   ```bash
   npm install
   ```

2. 设置环境变量：
   创建`.env.local`文件并添加：
   ```
   MONGODB_URI=你的MongoDB连接字符串
   ```

3. 运行开发服务器：
   ```bash
   npm run dev
   ```

## 默认管理员账户

- 用户名：admin
- 密码：068162

## 注意事项

- 由于Vercel Hobby计划限制，所有API都已合并到一个统一的端点
- 使用`.vercelignore`文件忽略不必要的API文件，以避免超出函数限制