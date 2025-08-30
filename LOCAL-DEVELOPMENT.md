# 本地开发环境使用指南

## 🚀 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 启动本地开发环境
```bash
# 方式一：使用内存数据库（推荐）
npm run dev

# 方式二：使用指定配置文件
npm run dev:local

# 方式三：使用nodemon自动重载
npm run dev:watch
```

### 3. 测试环境
```bash
npm run test:local
```

## 📋 环境配置说明

### 本地开发模式特点
- ✅ **数据隔离**: 使用内存数据库，完全不影响线上数据
- ✅ **热重载**: 代码修改后自动重启服务器
- ✅ **快速启动**: 无需配置外部数据库
- ✅ **完整功能**: 所有API和前端功能正常工作
- ✅ **预置数据**: 自带测试用户和游戏数据

### 预置测试账户
- **管理员**: admin / 068162
- **普通用户**: test / 123456
- **普通用户**: user1 / password

### 配置文件说明
- `.env` - 当前本地开发配置
- `.env.local` - 本地开发专用配置
- `.env.production` - 生产环境配置模板
- `.env.example` - 环境变量示例

## 🔄 开发工作流程

### 日常开发
1. **启动本地环境**
   ```bash
   npm run dev
   ```

2. **访问应用**
   - 主页: http://localhost:3000
   - 登录页: http://localhost:3000/login.html
   - 管理页: http://localhost:3000/admin.html
   - 飞禽走兽: http://localhost:3000/animals.html

3. **修改代码**
   - 前端代码修改后刷新浏览器即可
   - 后端代码修改后nodemon自动重启

4. **测试功能**
   - 使用预置账户测试
   - 数据修改不会影响线上

### 部署到线上
1. **提交代码**
   ```bash
   git add .
   git commit -m "feat: 添加新功能"
   git push
   ```

2. **Vercel自动部署**
   - 代码推送后自动部署
   - 使用生产环境变量
   - 连接线上MongoDB数据库

## 🛠️ 技术细节

### 数据库模式切换
项目根据环境变量自动选择数据库：

```javascript
// 生产环境：有MONGODB_URI环境变量
if (process.env.MONGODB_URI) {
  // 连接MongoDB Atlas
  client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
}

// 本地开发：无MONGODB_URI环境变量
else {
  // 使用内存数据库
  db = createMemoryDB();
}
```

### 环境变量优先级
1. 系统环境变量
2. `.env.local` 文件
3. `.env` 文件
4. 代码默认值

### API兼容性
- 所有API端点在本地和生产环境行为一致
- JWT令牌机制完全相同
- 数据结构100%兼容

## 🔍 常见问题

### Q: 本地数据会影响线上吗？
A: 不会。本地使用内存数据库，重启服务器数据就清空，完全独立于线上MongoDB。

### Q: 如何同步线上数据到本地？
A: 本地开发不需要真实数据，使用预置测试数据即可。如需真实数据，可临时设置MONGODB_URI连接线上库（仅读取）。

### Q: 本地修改的代码如何上线？
A: 直接git提交推送即可，Vercel会自动部署并使用生产环境配置。

### Q: 如何添加新的环境变量？
A: 
1. 在`.env.local`中添加（本地开发）
2. 在Vercel dashboard中添加（生产环境）
3. 更新`.env.example`文件（团队同步）

## 🎯 最佳实践

1. **开发流程**
   - 本地开发 → 本地测试 → 提交代码 → 线上验证

2. **数据安全**
   - 敏感数据不要硬编码在代码中
   - 使用环境变量管理配置
   - 定期轮换JWT密钥

3. **代码质量**
   - 每次提交前本地测试
   - 保持代码结构清晰
   - 添加必要的错误处理

4. **部署安全**
   - 生产环境使用强密码
   - 定期备份数据库
   - 监控应用性能