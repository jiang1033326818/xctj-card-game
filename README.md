# XCTJ 卡牌游戏

## 项目说明

这是一个简单的卡牌游戏应用，包含前端和后端代码。

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