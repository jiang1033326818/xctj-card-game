# 生产环境部署指南

## 部署到 Vercel

### 1. 环境变量配置
在 Vercel Dashboard 中设置以下环境变量：

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/xctj-game?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-here-please-change-this
NODE_ENV=production
```

### 2. 部署命令
```bash
# 安装 Vercel CLI（如果还没有）
npm i -g vercel

# 部署到预览环境
vercel

# 部署到生产环境
vercel --prod
```

### 3. 数据库准备
确保MongoDB数据库已经设置并且连接字符串正确。数据库会在首次运行时自动初始化。

### 4. 域名配置
部署成功后，Vercel会提供一个默认域名。您可以在Vercel Dashboard中配置自定义域名。

## 本地测试生产版本

```bash
# 安装依赖
npm install

# 启动本地服务器
npm start

# 或使用开发模式（带热重载）
npm run dev
```

## 注意事项

1. **安全性**: 
   - 确保JWT_SECRET使用强随机字符串
   - MongoDB连接字符串包含正确的用户名和密码
   - 不要将敏感信息提交到代码仓库

2. **性能**: 
   - 生产版本已移除调试日志
   - Vercel自动提供CDN加速

3. **数据库**: 
   - 使用MongoDB Atlas或其他云数据库服务
   - 确保数据库连接稳定

4. **监控**: 
   - 检查Vercel Dashboard中的函数日志
   - 监控API响应时间和错误率