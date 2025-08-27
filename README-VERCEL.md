# 喜从天降游戏 - Vercel部署指南

## 🚀 部署步骤

### 1. 准备工作
```bash
# 安装Vercel CLI
npm i -g vercel

# 登录Vercel账户
vercel login
```

### 2. 项目结构
```
project/
├── api/                 # Serverless API函数
│   ├── db.js           # 数据库工具
│   ├── session.js      # 会话管理
│   ├── login.js        # 登录API
│   ├── user.js         # 用户信息API
│   ├── logout.js       # 登出API
│   └── game/
│       ├── play.js     # 游戏API
│       └── history.js  # 历史记录API
├── public/             # 静态文件
│   ├── index.html      # 游戏页面
│   ├── login.html      # 登录页面
│   └── admin.html      # 管理页面
├── vercel.json         # Vercel配置
└── package.json        # 依赖配置
```

### 3. 部署命令
```bash
# 在项目根目录执行
vercel

# 或者直接部署到生产环境
vercel --prod
```

### 4. 环境变量（可选）
在Vercel Dashboard中设置：
- `NODE_ENV=production`

### 5. 访问地址
部署成功后，Vercel会提供访问地址，例如：
- `https://your-project.vercel.app`

## 🎮 默认账户
- 管理员: `admin` / `068162`
- 管理员: `laojiang` / `068162`

## 📝 注意事项

### 数据库限制
- 使用SQLite存储在`/tmp`目录
- 数据在函数重启时会丢失
- 生产环境建议使用外部数据库（如PlanetScale、Supabase）

### 会话管理
- 当前使用内存存储会话
- 生产环境建议使用Redis或数据库存储

### 性能优化
- Vercel函数有10秒执行时间限制
- 数据库连接会在每次请求时重新建立

## 🔧 生产环境优化建议

### 1. 使用外部数据库
```javascript
// 替换 api/db.js 中的数据库连接
const mysql = require('mysql2/promise');

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});
```

### 2. 使用Redis会话存储
```javascript
// 替换 api/session.js
const redis = require('redis');
const client = redis.createClient(process.env.REDIS_URL);
```

### 3. 添加环境变量
在Vercel Dashboard中添加：
- `DB_HOST`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `REDIS_URL`

## 🐛 故障排除

### 1. 函数超时
- 检查数据库查询性能
- 优化复杂查询

### 2. 数据丢失
- 迁移到持久化数据库
- 定期备份数据

### 3. 会话问题
- 检查Cookie设置
- 验证会话存储机制