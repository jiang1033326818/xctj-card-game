const { MongoClient } = require("mongodb");
const bcrypt = require("bcrypt");

// 全局变量，保持连接
let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  // 如果已经有连接，直接返回
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  // 获取连接字符串
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("请设置MONGODB_URI环境变量");
  }

  try {
    // 创建新的客户端实例
    const client = new MongoClient(uri);

    // 连接到MongoDB
    await client.connect();
    const db = client.db("game_db");

    // 缓存连接
    cachedClient = client;
    cachedDb = db;

    return { client, db };
  } catch (error) {
    console.error("数据库连接错误:", error);
    throw error;
  }
}

// 辅助函数：检查集合是否存在
async function collectionExists(db, collectionName) {
  const collections = await db.listCollections().toArray();
  return collections.some(c => c.name === collectionName);
}

// 处理API请求的主函数
module.exports = async (req, res) => {
  // 获取请求路径
  const path = req.url || "/";
  const action = path.split("/").pop();

  console.log(`处理请求: ${path}, 动作: ${action}`);

  try {
    // 根据路径执行不同的操作
    switch (action) {
      case "test":
        return await handleTest(req, res);
      case "init":
        return await handleInit(req, res);
      case "login":
        return await handleLogin(req, res);
      case "logout":
        return await handleLogout(req, res);
      case "play":
        return await handlePlay(req, res);
      case "history":
        return await handleHistory(req, res);
      default:
        return await handleDefault(req, res);
    }
  } catch (error) {
    console.error(`处理${action}请求时出错:`, error);
    res.status(500).json({
      success: false,
      error: "服务器错误",
      message: error.message,
      path: path,
      action: action
    });
  }
};

// 默认处理函数
async function handleDefault(req, res) {
  res.status(200).json({
    message: "API服务器正在运行",
    endpoints: [
      "/api/unified/test - 测试数据库连接",
      "/api/unified/init - 初始化数据库",
      "/api/unified/login - 用户登录",
      "/api/unified/logout - 用户登出",
      "/api/unified/play - 进行游戏",
      "/api/unified/history - 获取游戏历史"
    ],
    timestamp: new Date().toISOString(),
    nodeVersion: process.version
  });
}

// 测试数据库连接
async function handleTest(req, res) {
  console.log("开始测试数据库连接");

  // 连接数据库
  const { db } = await connectToDatabase();
  console.log("数据库连接成功");

  // 创建测试集合（如果不存在）
  if (!await collectionExists(db, "test_collection")) {
    await db.createCollection("test_collection");
    console.log("创建测试集合成功");
  }

  // 插入测试文档
  const result = await db.collection("test_collection").insertOne({
    test: true,
    createdAt: new Date()
  });
  console.log("插入测试文档成功");

  // 查询测试文档
  const count = await db.collection("test_collection").countDocuments();
  console.log(`测试集合中有 ${count} 个文档`);

  // 返回成功响应
  res.status(200).json({
    success: true,
    message: "数据库测试成功",
    insertedId: result.insertedId,
    documentCount: count,
    nodeVersion: process.version
  });
}

// 初始化数据库
async function handleInit(req, res) {
  console.log("开始初始化数据库");

  // 连接数据库
  const { db } = await connectToDatabase();
  console.log("数据库连接成功");

  // 检查users集合是否存在
  if (!await collectionExists(db, "users")) {
    await db.createCollection("users");
    console.log("创建users集合成功");

    // 创建唯一索引
    await db.collection("users").createIndex({ username: 1 }, { unique: true });
    console.log("创建username唯一索引成功");
  }

  // 创建默认管理员账户
  const adminPassword = bcrypt.hashSync("068162", 10);

  // 尝试插入管理员用户
  try {
    await db.collection("users").insertOne({
      username: "admin",
      password: adminPassword,
      balance: 10000,
      is_admin: true,
      created_at: new Date()
    });
    console.log("创建admin用户成功");
  } catch (e) {
    if (e.code !== 11000) {
      // 忽略重复键错误
      throw e;
    }
    console.log("admin用户已存在");
  }

  // 尝试插入laojiang用户
  try {
    await db.collection("users").insertOne({
      username: "laojiang",
      password: adminPassword,
      balance: 10000,
      is_admin: true,
      created_at: new Date()
    });
    console.log("创建laojiang用户成功");
  } catch (e) {
    if (e.code !== 11000) {
      // 忽略重复键错误
      throw e;
    }
    console.log("laojiang用户已存在");
  }

  // 检查其他集合
  const requiredCollections = [
    "sessions",
    "game_records",
    "bet_records",
    "house_stats"
  ];
  for (const collName of requiredCollections) {
    if (!await collectionExists(db, collName)) {
      await db.createCollection(collName);
      console.log(`创建${collName}集合成功`);
    }
  }

  // 初始化庄家统计
  const houseStats = await db.collection("house_stats").findOne({ _id: 1 });
  if (!houseStats) {
    await db.collection("house_stats").insertOne({
      _id: 1,
      totalGames: 0,
      totalBets: 0,
      totalPayouts: 0,
      houseProfit: 0,
      heartsCount: 0,
      diamondsCount: 0,
      clubsCount: 0,
      spadesCount: 0,
      jokerCount: 0,
      updatedAt: new Date()
    });
    console.log("初始化庄家统计成功");
  }

  // 返回成功响应
  res.status(200).json({
    success: true,
    message: "数据库初始化成功"
  });
}

// 处理登录请求
async function handleLogin(req, res) {
  console.log("开始处理登录请求");

  // 检查请求方法
  if (req.method !== "POST") {
    return res.status(405).json({ error: "方法不允许" });
  }

  // 检查请求体
  if (!req.body || !req.body.username || !req.body.password) {
    return res.status(400).json({ error: "请求缺少必要字段" });
  }

  const { username, password } = req.body;
  console.log(`尝试登录用户: ${username}`);

  // 连接数据库
  const { db } = await connectToDatabase();
  console.log("数据库连接成功");

  // 查找用户
  const user = await db.collection("users").findOne({ username });

  if (!user) {
    console.log("用户不存在");
    return res.status(401).json({ error: "用户名或密码错误" });
  }

  // 验证密码
  const passwordMatch = await bcrypt.compare(password, user.password);

  if (!passwordMatch) {
    console.log("密码不匹配");
    return res.status(401).json({ error: "用户名或密码错误" });
  }

  console.log("登录成功");

  // 创建简单会话
  const sessionId = require("crypto").randomBytes(32).toString("hex");

  // 存储会话
  await db.collection("sessions").insertOne({
    sessionId,
    userId: user._id,
    username: user.username,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 86400000) // 24小时后过期
  });

  // 设置cookie
  res.setHeader(
    "Set-Cookie",
    `sessionId=${sessionId}; HttpOnly; Path=/; Max-Age=86400`
  );

  // 返回用户信息
  res.status(200).json({
    success: true,
    user: {
      id: user._id.toString(),
      username: user.username,
      balance: user.balance,
      isAdmin: user.is_admin
    }
  });
}

// 处理登出请求
async function handleLogout(req, res) {
  // 实现登出逻辑
  res.status(200).json({ success: true, message: "登出成功" });
}

// 处理游戏请求
async function handlePlay(req, res) {
  // 实现游戏逻辑
  res.status(200).json({ success: true, message: "游戏功能尚未实现" });
}

// 处理历史记录请求
async function handleHistory(req, res) {
  // 实现历史记录逻辑
  res.status(200).json({ success: true, message: "历史记录功能尚未实现" });
}
