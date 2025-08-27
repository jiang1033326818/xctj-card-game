const { MongoClient } = require("mongodb");
const bcrypt = require("bcrypt");
const cookie = require("cookie");

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
  // 设置CORS头
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // 处理OPTIONS请求
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // 获取请求路径
  const path = req.url || "/";
  console.log(`处理请求: ${path}`);

  // 解析路径
  const pathParts = path.split("/").filter(Boolean);
  const mainPath = pathParts[0] || "";
  const action = pathParts[1] || "";

  console.log(`主路径: ${mainPath}, 动作: ${action}`);

  try {
    // 根据路径执行不同的操作
    if (mainPath === "" || mainPath === "api") {
      // 根路径
      if (action === "") {
        return handleDefault(req, res);
      } else if (action === "test") {
        return await handleTest(req, res);
      } else if (action === "init") {
        return await handleInit(req, res);
      } else if (action === "login") {
        return await handleLogin(req, res);
      } else if (action === "logout") {
        return await handleLogout(req, res);
      } else if (action === "user") {
        return await handleUser(req, res);
      } else if (action === "play") {
        return await handlePlay(req, res);
      } else if (action === "history") {
        return await handleHistory(req, res);
      } else if (action === "check-env") {
        return await handleCheckEnv(req, res);
      } else if (action === "create-user") {
        return await handleCreateUser(req, res);
      }
    }

    // 如果没有匹配的路由
    return res.status(404).json({
      error: "未找到请求的资源",
      path: path
    });
  } catch (error) {
    console.error(`处理请求时出错:`, error);
    res.status(500).json({
      success: false,
      error: "服务器错误",
      message: error.message,
      path: path
    });
  }
};

// 默认处理函数
async function handleDefault(req, res) {
  res.status(200).json({
    message: "API服务器正在运行",
    endpoints: [
      "/api/test - 测试数据库连接",
      "/api/init - 初始化数据库",
      "/api/login - 用户登录",
      "/api/logout - 用户登出",
      "/api/user - 用户信息",
      "/api/play - 进行游戏",
      "/api/history - 获取游戏历史",
      "/api/check-env - 检查环境变量",
      "/api/create-user - 创建新用户"
    ],
    timestamp: new Date().toISOString(),
    nodeVersion: process.version
  });
}

// 测试数据库连接
async function handleTest(req, res) {
  console.log("开始测试数据库连接");

  try {
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
      insertedId: result.insertedId.toString(),
      documentCount: count,
      nodeVersion: process.version
    });
  } catch (error) {
    console.error("数据库测试失败:", error);
    res.status(500).json({
      success: false,
      error: "数据库连接失败",
      message: error.message
    });
  }
}

// 初始化数据库
async function handleInit(req, res) {
  console.log("开始初始化数据库");

  try {
    // 连接数据库
    const { db } = await connectToDatabase();
    console.log("数据库连接成功");

    // 检查users集合是否存在
    if (!await collectionExists(db, "users")) {
      await db.createCollection("users");
      console.log("创建users集合成功");

      // 创建唯一索引
      await db
        .collection("users")
        .createIndex({ username: 1 }, { unique: true });
      console.log("创建username唯一索引成功");
    }

    // 创建默认管理员账户
    const adminPassword = await bcrypt.hash("068162", 10);

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
  } catch (error) {
    console.error("数据库初始化失败:", error);
    res.status(500).json({
      success: false,
      error: "数据库初始化失败",
      message: error.message
    });
  }
}

// 处理登录请求
async function handleLogin(req, res) {
  console.log("开始处理登录请求");

  // 检查请求方法
  if (req.method !== "POST") {
    return res.status(405).json({ error: "方法不允许" });
  }

  try {
    // 解析请求体
    let body;
    if (typeof req.body === "object") {
      body = req.body;
    } else if (req.body) {
      try {
        body = JSON.parse(req.body);
      } catch (e) {
        console.error("解析请求体失败:", e);
        return res.status(400).json({ error: "无效的JSON格式" });
      }
    } else {
      // 尝试从请求流中读取
      const buffers = [];
      for await (const chunk of req) {
        buffers.push(chunk);
      }
      const data = Buffer.concat(buffers).toString();
      try {
        body = data ? JSON.parse(data) : {};
      } catch (e) {
        console.error("从请求流解析JSON失败:", e);
        return res.status(400).json({ error: "无效的JSON格式" });
      }
    }

    console.log("解析的请求体:", body);

    // 检查请求体
    if (!body || !body.username || !body.password) {
      return res.status(400).json({ error: "请求缺少必要字段" });
    }

    const { username, password } = body;
    console.log(`尝试登录用户: ${username}`);

    // 连接数据库
    const { db } = await connectToDatabase();
    console.log("数据库连接成功");

    // 查找用户
    const user = await db.collection("users").findOne({ username });

    console.log("查找用户结果:", user ? "找到用户" : "未找到用户");

    if (!user) {
      console.log("用户不存在");
      return res.status(401).json({ error: "用户名或密码错误" });
    }

    // 验证密码
    const passwordMatch = await bcrypt.compare(password, user.password);

    console.log("密码验证结果:", passwordMatch ? "密码匹配" : "密码不匹配");

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
  } catch (error) {
    console.error("登录处理失败:", error);
    res.status(500).json({
      success: false,
      error: "登录处理失败",
      message: error.message
    });
  }
}

// 处理登出请求
async function handleLogout(req, res) {
  try {
    // 获取会话ID
    const cookies = cookie.parse(req.headers.cookie || "");
    const sessionId = cookies.sessionId;

    if (sessionId) {
      // 连接数据库
      const { db } = await connectToDatabase();

      // 删除会话
      await db.collection("sessions").deleteOne({ sessionId });

      // 清除cookie
      res.setHeader("Set-Cookie", `sessionId=; HttpOnly; Path=/; Max-Age=0`);
    }

    // 返回成功响应
    res.status(200).json({ success: true, message: "登出成功" });
  } catch (error) {
    console.error("登出处理失败:", error);
    res.status(500).json({
      success: false,
      error: "登出处理失败",
      message: error.message
    });
  }
}

// 处理用户信息请求
async function handleUser(req, res) {
  try {
    // 获取会话ID
    const cookies = cookie.parse(req.headers.cookie || "");
    const sessionId = cookies.sessionId;

    if (!sessionId) {
      return res.status(401).json({ error: "未登录" });
    }

    // 连接数据库
    const { db } = await connectToDatabase();

    // 查找会话
    const session = await db.collection("sessions").findOne({ sessionId });

    if (!session) {
      return res.status(401).json({ error: "会话无效" });
    }

    // 检查会话是否过期
    if (new Date() > new Date(session.expiresAt)) {
      await db.collection("sessions").deleteOne({ sessionId });
      return res.status(401).json({ error: "会话已过期" });
    }

    // 查找用户
    const user = await db.collection("users").findOne({ _id: session.userId });

    if (!user) {
      return res.status(404).json({ error: "用户不存在" });
    }

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
  } catch (error) {
    console.error("获取用户信息失败:", error);
    res.status(500).json({
      success: false,
      error: "获取用户信息失败",
      message: error.message
    });
  }
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

// 检查环境变量
async function handleCheckEnv(req, res) {
  const uri = process.env.MONGODB_URI || "未设置";
  const maskedUri =
    uri === "未设置" ? "未设置" : uri.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@");

  res.status(200).json({
    success: true,
    environment: {
      nodeVersion: process.version,
      mongodbUri: maskedUri,
      hasMongodbUri: !!process.env.MONGODB_URI
    }
  });
}

// 创建新用户
async function handleCreateUser(req, res) {
  console.log("开始处理创建用户请求");

  // 检查请求方法
  if (req.method !== "POST") {
    return res.status(405).json({ error: "方法不允许" });
  }

  try {
    // 解析请求体
    let body;
    if (typeof req.body === "object") {
      body = req.body;
    } else if (req.body) {
      try {
        body = JSON.parse(req.body);
      } catch (e) {
        console.error("解析请求体失败:", e);
        return res.status(400).json({ error: "无效的JSON格式" });
      }
    } else {
      // 尝试从请求流中读取
      const buffers = [];
      for await (const chunk of req) {
        buffers.push(chunk);
      }
      const data = Buffer.concat(buffers).toString();
      try {
        body = data ? JSON.parse(data) : {};
      } catch (e) {
        console.error("从请求流解析JSON失败:", e);
        return res.status(400).json({ error: "无效的JSON格式" });
      }
    }

    console.log("解析的请求体:", body);

    // 检查请求体
    if (!body || !body.username || !body.password) {
      return res.status(400).json({ error: "请求缺少必要字段" });
    }

    const { username, password } = body;
    console.log(`尝试创建用户: ${username}`);

    // 连接数据库
    const { db } = await connectToDatabase();
    console.log("数据库连接成功");

    // 检查用户是否已存在
    const existingUser = await db.collection("users").findOne({ username });
    if (existingUser) {
      return res.status(409).json({ error: "用户名已存在" });
    }

    // 哈希密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户
    const result = await db.collection("users").insertOne({
      username,
      password: hashedPassword,
      balance: 1000,
      is_admin: false,
      created_at: new Date()
    });

    console.log("创建用户成功");

    // 返回成功响应
    res.status(201).json({
      success: true,
      message: "用户创建成功",
      userId: result.insertedId.toString()
    });
  } catch (error) {
    console.error("创建用户失败:", error);
    res.status(500).json({
      success: false,
      error: "创建用户失败",
      message: error.message
    });
  }
}
