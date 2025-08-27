# MongoDB 集成指南

本项目已从SQLite迁移到MongoDB，以便在Vercel上正常运行。以下是设置步骤：

## 1. 创建MongoDB Atlas账户

1. 访问 [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. 注册一个免费账户
3. 创建一个新的组织和项目
4. 创建一个免费的M0级别集群

## 2. 设置数据库访问

1. 在MongoDB Atlas控制台中，点击"Database Access"
2. 点击"Add New Database User"
3. 创建一个用户名和密码
4. 设置权限为"Read and Write to Any Database"
5. 点击"Add User"

## 3. 设置网络访问

1. 在MongoDB Atlas控制台中，点击"Network Access"
2. 点击"Add IP Address"
3. 选择"Allow Access from Anywhere"（为了简化设置，生产环境中应该限制IP）
4. 点击"Confirm"

## 4. 获取连接字符串

1. 在MongoDB Atlas控制台中，点击"Databases"
2. 点击"Connect"按钮
3. 选择"Connect your application"
4. 复制连接字符串，它看起来像这样：
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. 将`<username>`和`<password>`替换为您创建的数据库用户凭据

## 5. 在Vercel中设置环境变量

1. 登录到您的Vercel账户
2. 选择您的项目
3. 点击"Settings"
4. 点击"Environment Variables"
5. 添加一个新的环境变量：
   - 名称：`MONGODB_URI`
   - 值：您的MongoDB连接字符串
6. 点击"Save"

## 6. 重新部署您的应用

1. 在Vercel控制台中，点击"Deployments"
2. 点击"Redeploy"按钮

完成以上步骤后，您的应用应该能够正常连接到MongoDB并解决500错误问题。