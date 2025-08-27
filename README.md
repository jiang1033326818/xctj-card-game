# 🎰 喜从天降 - 多用户卡牌游戏

一个基于Node.js和SQLite的多用户在线卡牌游戏，支持用户管理、余额系统和游戏历史记录。

## 🎮 游戏特色

- **多用户系统**: 支持用户注册、登录和管理
- **余额管理**: 虚拟筹码系统，支持押注和结算
- **游戏记录**: 完整的游戏历史和统计
- **管理后台**: 管理员可以管理用户和查看统计
- **响应式设计**: 支持桌面和移动设备

## 🚀 在线体验

访问地址：[部署后的URL]

### 默认账户
- **管理员**: `admin` / `068162`
- **管理员**: `laojiang` / `068162`

## 🛠️ 技术栈

- **前端**: HTML5, CSS3, JavaScript (ES6+)
- **后端**: Node.js, Express.js
- **数据库**: SQLite3
- **部署**: Vercel Serverless Functions
- **认证**: Session-based Authentication

## 📁 项目结构

```
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

## 🎯 游戏规则

- **红桃/方块/梅花/黑桃**: 赔率 1:3.5
- **王牌**: 赔率 1:20
- **54张牌**: 普通牌各13张，王牌2张

## 🔧 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm start

# 访问游戏
http://localhost:3000
```

## 📝 更新日志

### v1.0.0
- ✅ 基础游戏功能
- ✅ 用户系统
- ✅ 余额管理
- ✅ 游戏历史
- ✅ 管理后台
- ✅ Vercel部署支持

## 📄 许可证

MIT License

## 👨‍💻 开发者

由 CodeBuddy 开发