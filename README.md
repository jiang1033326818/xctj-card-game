# XCTJ 卡牌游戏

## 项目说明

这是一个简单的卡牌游戏应用，包含前端和后端代码。

## 管理员账户问题解决

如果遇到admin账户登录时显示账户密码错误，或者存在重复的admin账户，可以通过以下方式解决：

1. 访问 `/set-admin.html` 页面
2. 使用以下功能之一：
   - 点击"重置Admin密码为068162"按钮重置密码
   - 点击"清理重复Admin账户"按钮删除重复的admin账户
   - 点击"一键清理并重置"按钮执行完整的清理和重置操作
3. 完成后使用以下账户登录：
   - 用户名: `admin`
   - 密码: `068162`

## 线上环境问题修复

### 问题描述
线上admin页面存在以下问题：
1. 用户列表没有查到用户
2. 没有多福多财相关的统计
3. 游戏记录都显示undefined

### 修复内容
1. 修复了数据库连接和用户数据初始化逻辑
2. 增强了前后端数据格式兼容性处理
3. 优化了统计数据展示和游戏记录解析逻辑

详细修复说明请查看 [DEPLOYMENT-FIX.md](DEPLOYMENT-FIX.md) 文件。

## 解决 431 错误问题

在部署到 Vercel 时，可能会遇到 431 Request Header Fields Too Large 错误。这是因为请求头过大导致的。我们提供了多种解决方案：

### 方案一：使用简化 API

我们提供了简化版的 API 端点，减少请求头处理：

- `/api/simple-ping` - 简化版 ping 端点
- `/api/simple-login` - 简化版登录端点
- `/api/minimal` - 最小化 API 端点
- `/api/minimal-login` - 最小化登录 API 端点

### 方案二：使用本地测试服务器

我们提供了本地测试服务器，可以绕过 Vercel 的限制：

1. 安装依赖：
   ```
   npm install
   ```

2. 启动服务器：
   ```
   npm start
   ```

3. 访问测试页面：
   ```
   http://localhost:3000/minimal-test.html
   ```

### 方案三：使用 XMLHttpRequest 代替 fetch

在前端代码中，使用 XMLHttpRequest 代替 fetch，可以减少请求头大小：

```javascript
const xhr = new XMLHttpRequest();
xhr.open('GET', '/api/minimal', true);
xhr.onload = function() {
  if (xhr.status >= 200 && xhr.status < 300) {
    const data = JSON.parse(xhr.responseText);
    console.log(data);
  }
};
xhr.send();
```

## 项目结构

- `api/` - 后端 API 代码
- `public/` - 前端静态文件
- `frontend/` - React 前端代码
- `server.js` - 本地测试服务器
- `vercel.json` - Vercel 部署配置

## 开发指南

### 本地开发

1. 安装依赖：
   ```
   npm install
   ```

2. 启动服务器：
   ```
   npm run dev
   ```

3. 访问应用：
   ```
   http://localhost:3000
   ```

### 部署到 Vercel

1. 将代码推送到 GitHub 仓库

2. 在 Vercel 中导入项目

3. 设置环境变量：
   - `MONGODB_URI` - MongoDB 连接字符串
   - `JWT_SECRET` - JWT 密钥

4. 部署项目