// 导入必要的模块
const { MongoClient, ObjectId } = require("mongodb");
const bcrypt = require("bcryptjs");
const cookie = require("cookie");
const crypto = require("crypto");

// MongoDB连接URI
const uri = process.env.MONGODB_URI;
let cachedDb = null;

// 连接到MongoDB
async function connectToDatabase() {
  if (cachedDb) {
    return { db: cachedDb };
  }

  try {
    console.log("正在连接到MongoDB...");
    const client = await MongoClient.connect(uri);
    const db = client.db("card_game");

    // 初始化集合
    await initializeCollections(db);

    cachedDb = db;
    console.log("MongoDB连接成功");
    return { db };
  } catch (error) {
    console.error("MongoDB连接失败:", error);
    throw error;
  }
}

// 初始化数据库集合
async function initializeCollections(db) {
  try {
    // 创建用户集合
    if (!await db.listCollections({ name: "users" }).hasNext()) {
      await db.createCollection("users");
      console.log("创建users集合");
    }

    // 创建会话集合
    if (!await db.listCollections({ name: "sessions" }).hasNext()) {
      await db.createCollection("sessions");
      console.log("创建sessions集合");
    }

    // 创建游戏记录集合
    if (!await db.listCollections({ name: "game_records" }).hasNext()) {
      await db.createCollection("game_records");
      console.log("创建game_records集合");
    }

    // 创建庄家统计集合
    if (!await db.listCollections({ name: "house_stats" }).hasNext()) {
      await db.createCollection("house_stats");
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
      console.log("创建house_stats集合");
    }

    // 检查是否有管理员用户
    const adminUser = await db
      .collection("users")
      .findOne({ username: "admin" });
    if (!adminUser) {
      // 创建默认管理员用户
      const hashedPassword = await bcrypt.hash("068162", 10);
      await db.collection("users").insertOne({
        username: "admin",
        password: hashedPassword,
        balance: 10000,
        is_admin: true,
        created_at: new Date()
      });
      console.log("创建默认管理员用户");
    }
  } catch (error) {
    console.error("初始化集合失败:", error);
  }
}

// 获取当前用户
async function getCurrentUser(req, db) {
  try {
    // 从Cookie中获取会话ID
    const cookies = cookie.parse(req.headers.cookie || "");
    const sessionId = cookies.session_id;

    if (!sessionId) {
      return null;
    }

    // 查找会话
    const session = await db.collection("sessions").findOne({ _id: sessionId });

    if (!session) {
      return null;
    }

    // 查找用户
    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(session.userId) });

    if (!user) {
      return null;
    }

    // 更新最后登录时间
    await db
      .collection("users")
      .updateOne({ _id: user._id }, { $set: { last_login: new Date() } });

    return user;
  } catch (error) {
    console.error("获取当前用户失败:", error);
    return null;
  }
}

// 处理登录请求
async function handleLogin(req, res) {
  console.log("处理登录请求");

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
    console.log(`尝试登录: ${username}`);

    // 连接数据库
    const { db } = await connectToDatabase();
    console.log("数据库连接成功");

    // 查找用户
    const user = await db.collection("users").findOne({ username });

    if (!user) {
      return res.status(401).json({ error: "用户名或密码错误" });
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "用户名或密码错误" });
    }

    // 创建会话
    const sessionId = crypto.randomBytes(32).toString("hex");

    await db.collection("sessions").insertOne({
      _id: sessionId,
      userId: user._id.toString(),
      created_at: new Date()
    });

    // 设置Cookie
    res.setHeader(
      "Set-Cookie",
      cookie.serialize("session_id", sessionId, {
        httpOnly: true,
        path: "/",
        maxAge: 60 * 60 * 24 * 7 // 7天
      })
    );

    // 返回用户信息
    res.status(200).json({
      success: true,
      username: user.username,
      balance: user.balance,
      is_admin: user.is_admin
    });
  } catch (error) {
    console.error("登录失败:", error);
    res.status(500).json({
      success: false,
      error: "登录失败",
      message: error.message
    });
  }
}

// 处理注册请求
async function handleRegister(req, res) {
  console.log("处理注册请求");

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
    console.log(`尝试注册: ${username}`);

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
      balance: 1000, // 初始余额
      is_admin: false,
      created_at: new Date()
    });

    console.log("创建用户成功");

    // 返回成功响应
    res.status(201).json({
      success: true,
      message: "注册成功",
      userId: result.insertedId.toString()
    });
  } catch (error) {
    console.error("注册失败:", error);
    res.status(500).json({
      success: false,
      error: "注册失败",
      message: error.message
    });
  }
}

// 处理登出请求
async function handleLogout(req, res) {
  try {
    // 从Cookie中获取会话ID
    const cookies = cookie.parse(req.headers.cookie || "");
    const sessionId = cookies.session_id;

    if (sessionId) {
      // 连接数据库
      const { db } = await connectToDatabase();

      // 删除会话
      await db.collection("sessions").deleteOne({ _id: sessionId });
    }

    // 清除Cookie
    res.setHeader(
      "Set-Cookie",
      cookie.serialize("session_id", "", {
        httpOnly: true,
        path: "/",
        maxAge: 0
      })
    );

    // 返回成功响应
    res.status(200).json({
      success: true,
      message: "登出成功"
    });
  } catch (error) {
    console.error("登出失败:", error);
    res.status(500).json({
      success: false,
      error: "登出失败",
      message: error.message
    });
  }
}

// 处理获取当前用户请求
async function handleGetUser(req, res) {
  try {
    // 连接数据库
    const { db } = await connectToDatabase();

    // 获取当前用户
    const user = await getCurrentUser(req, db);

    if (!user) {
      return res.status(401).json({ error: "未登录" });
    }

    // 返回用户信息
    res.status(200).json({
      success: true,
      username: user.username,
      balance: user.balance,
      is_admin: user.is_admin
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

    // 检查请求体
    if (!body || !body.suit || !body.amount) {
      return res.status(400).json({ error: "请求缺少必要字段" });
    }

    const { suit, amount } = body;
    const betAmount = parseInt(amount);

    // 验证下注金额
    if (isNaN(betAmount) || betAmount < 10 || betAmount > 1000) {
      return res.status(400).json({ error: "无效的下注金额" });
    }

    // 验证花色
    const validSuits = ["hearts", "diamonds", "clubs", "spades", "joker"];
    if (!validSuits.includes(suit)) {
      return res.status(400).json({ error: "无效的花色" });
    }

    // 连接数据库
    const { db } = await connectToDatabase();

    // 获取当前用户
    const user = await getCurrentUser(req, db);

    if (!user) {
      return res.status(401).json({ error: "未登录" });
    }

    // 检查余额
    if (user.balance < betAmount) {
      return res.status(400).json({ error: "余额不足" });
    }

    // 生成随机花色
    const resultSuit = getRandomSuit();

    // 计算赔率和赢取金额
    const { win, winAmount } = calculateWinnings(suit, resultSuit, betAmount);

    // 更新用户余额
    const newBalance = win
      ? user.balance + winAmount
      : user.balance - betAmount;

    await db
      .collection("users")
      .updateOne({ _id: user._id }, { $set: { balance: newBalance } });

    // 记录游戏结果
    await db.collection("game_records").insertOne({
      userId: user._id,
      username: user.username,
      bet_suit: suit,
      result_suit: resultSuit,
      amount: betAmount,
      win,
      win_amount: win ? winAmount : 0,
      created_at: new Date()
    });

    // 更新庄家统计
    await updateHouseStats(db, resultSuit, betAmount, win ? winAmount : 0);

    // 返回游戏结果
    res.status(200).json({
      success: true,
      card: { suit: resultSuit },
      win,
      winAmount: win ? winAmount : 0,
      amount: betAmount,
      balance: newBalance
    });
  } catch (error) {
    console.error("游戏处理失败:", error);
    res.status(500).json({
      success: false,
      error: "游戏处理失败",
      message: error.message
    });
  }
}

// 生成随机花色
function getRandomSuit() {
  const suits = ["hearts", "diamonds", "clubs", "spades", "joker"];
  const weights = [22, 22, 22, 22, 12]; // 小丑的概率较低

  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < suits.length; i++) {
    if (random < weights[i]) {
      return suits[i];
    }
    random -= weights[i];
  }

  return suits[0]; // 默认返回红桃
}

// 计算赢取金额
function calculateWinnings(betSuit, resultSuit, betAmount) {
  if (betSuit === resultSuit) {
    // 赔率：红桃、方块、梅花、黑桃 = 4倍，小丑 = 10倍
    const multiplier = betSuit === "joker" ? 10 : 4;
    return {
      win: true,
      winAmount: betAmount * multiplier
    };
  }

  return {
    win: false,
    winAmount: 0
  };
}

// 更新庄家统计
async function updateHouseStats(db, resultSuit, betAmount, payoutAmount) {
  try {
    const update = {
      $inc: {
        totalGames: 1,
        totalBets: betAmount,
        totalPayouts: payoutAmount,
        houseProfit: betAmount - payoutAmount
      },
      $set: {
        updatedAt: new Date()
      }
    };

    // 增加对应花色的计数
    if (resultSuit === "hearts") {
      update.$inc.heartsCount = 1;
    } else if (resultSuit === "diamonds") {
      update.$inc.diamondsCount = 1;
    } else if (resultSuit === "clubs") {
      update.$inc.clubsCount = 1;
    } else if (resultSuit === "spades") {
      update.$inc.spadesCount = 1;
    } else if (resultSuit === "joker") {
      update.$inc.jokerCount = 1;
    }

    await db.collection("house_stats").updateOne({ _id: 1 }, update);
  } catch (error) {
    console.error("更新庄家统计失败:", error);
  }
}

// 处理获取游戏记录请求
async function handleGetGameRecords(req, res) {
  try {
    // 连接数据库
    const { db } = await connectToDatabase();

    // 获取当前用户
    const user = await getCurrentUser(req, db);

    if (!user) {
      return res.status(401).json({ error: "未登录" });
    }

    // 查询条件
    const query = user.is_admin ? {} : { userId: user._id };

    // 获取游戏记录
    const records = await db
      .collection("game_records")
      .find(query)
      .sort({ created_at: -1 })
      .limit(100)
      .toArray();

    // 返回游戏记录
    res.status(200).json({
      success: true,
      records
    });
  } catch (error) {
    console.error("获取游戏记录失败:", error);
    res.status(500).json({
      success: false,
      error: "获取游戏记录失败",
      message: error.message
    });
  }
}

// 处理获取庄家统计请求
async function handleGetHouseStats(req, res) {
  try {
    // 连接数据库
    const { db } = await connectToDatabase();

    // 获取当前用户
    const user = await getCurrentUser(req, db);

    if (!user) {
      return res.status(401).json({ error: "未登录" });
    }

    // 检查是否为管理员
    if (!user.is_admin) {
      return res.status(403).json({ error: "权限不足" });
    }

    // 获取庄家统计
    const stats = await db.collection("house_stats").findOne({ _id: 1 });

    if (!stats) {
      return res.status(404).json({ error: "统计数据不存在" });
    }

    // 返回庄家统计
    res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    console.error("获取庄家统计失败:", error);
    res.status(500).json({
      success: false,
      error: "获取庄家统计失败",
      message: error.message
    });
  }
}

// 处理获取所有用户请求
async function handleGetUsers(req, res) {
  try {
    // 连接数据库
    const { db } = await connectToDatabase();

    // 获取当前用户
    const user = await getCurrentUser(req, db);

    if (!user) {
      return res.status(401).json({ error: "未登录" });
    }

    // 检查是否为管理员
    if (!user.is_admin) {
      return res.status(403).json({ error: "权限不足" });
    }

    // 获取所有用户
    const users = await db
      .collection("users")
      .find({}, { projection: { password: 0 } })
      .toArray();

    // 返回用户列表
    res.status(200).json({
      success: true,
      users
    });
  } catch (error) {
    console.error("获取用户列表失败:", error);
    res.status(500).json({
      success: false,
      error: "获取用户列表失败",
      message: error.message
    });
  }
}

// 处理初始化数据库请求
async function handleInitDb(req, res) {
  try {
    // 连接数据库
    const { db } = await connectToDatabase();

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

// 处理测试连接请求
async function handleTestConnection(req, res) {
  try {
    // 连接数据库
    await connectToDatabase();

    // 返回成功响应
    res.status(200).json({
      success: true,
      message: "连接成功!"
    });
  } catch (error) {
    console.error("连接测试失败:", error);
    res.status(500).json({
      success: false,
      error: "数据库连接失败",
      message: error.message
    });
  }
}

// 主处理函数
module.exports = async (req, res) => {
  // 设置CORS头
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );

  // 处理预检请求
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // 获取路径
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  console.log(`处理请求: ${req.method} ${path}`);

  try {
    // 根据路径分发请求
    if (path === "/api/login" || path === "/api/game/login") {
      await handleLogin(req, res);
    } else if (path === "/api/register" || path === "/api/game/register") {
      await handleRegister(req, res);
    } else if (path === "/api/logout" || path === "/api/game/logout") {
      await handleLogout(req, res);
    } else if (path === "/api/user" || path === "/api/game/user") {
      await handleGetUser(req, res);
    } else if (path === "/api/play" || path === "/api/game/play") {
      await handlePlay(req, res);
    } else if (
      path === "/api/game_records" ||
      path === "/api/game/game_records"
    ) {
      await handleGetGameRecords(req, res);
    } else if (
      path === "/api/house_stats" ||
      path === "/api/game/house_stats"
    ) {
      await handleGetHouseStats(req, res);
    } else if (path === "/api/users" || path === "/api/game/users") {
      await handleGetUsers(req, res);
    } else if (path === "/api/init_db" || path === "/api/game/init_db") {
      await handleInitDb(req, res);
    } else if (
      path === "/api/test_connection" ||
      path === "/api/game/test_connection"
    ) {
      await handleTestConnection(req, res);
    } else {
      // 未找到路径
      res.status(404).json({ error: "未找到路径" });
    }
  } catch (error) {
    console.error("请求处理失败:", error);
    res.status(500).json({
      success: false,
      error: "请求处理失败",
      message: error.message
    });
  }
};
