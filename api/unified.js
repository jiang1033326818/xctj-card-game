const { MongoClient, ObjectId } = require("mongodb");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// MongoDB连接
const uri =
  process.env.MONGODB_URI ||
  "mongodb+srv://1033326818:Ykswj1bYj6FqCzT1@cluster0.ghauger.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  ssl: true,
  tls: true,
  tlsAllowInvalidCertificates: true
});

let db;

// 连接数据库
async function connectToDatabase() {
  if (db) return db;

  try {
    await client.connect();
    db = client.db("card_game");
    console.log("Connected to MongoDB");
    return db;
  } catch (error) {
    console.error("MongoDB连接错误:", error);
    throw new Error("数据库连接失败");
  }
}

// 初始化数据库
async function initializeDatabase() {
  try {
    const db = await connectToDatabase();

    // 检查users集合是否存在
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    // 创建users集合（如果不存在）
    if (!collectionNames.includes("users")) {
      await db.createCollection("users");
      console.log("Created users collection");

      // 创建管理员用户
      const adminUser = {
        username: "admin",
        password: await bcrypt.hash("068162", 10),
        is_admin: true,
        balance: 10000,
        created_at: new Date()
      };

      await db.collection("users").insertOne(adminUser);
      console.log("Created admin user");
    }

    // 创建game_records集合（如果不存在）
    if (!collectionNames.includes("game_records")) {
      await db.createCollection("game_records");
      console.log("Created game_records collection");
    }

    return { success: true, message: "数据库初始化成功" };
  } catch (error) {
    console.error("数据库初始化错误:", error);
    return { success: false, error: "数据库初始化失败", message: error.message };
  }
}

// 用户注册
async function handleRegister(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: "用户名和密码不能为空" });
    }

    const db = await connectToDatabase();

    // 检查用户名是否已存在
    const existingUser = await db.collection("users").findOne({ username });
    if (existingUser) {
      return res.status(400).json({ success: false, error: "用户名已存在" });
    }

    // 创建新用户
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      username,
      password: hashedPassword,
      is_admin: false,
      balance: 1000, // 初始余额
      created_at: new Date()
    };

    await db.collection("users").insertOne(newUser);

    // 生成JWT令牌
    const token = jwt.sign(
      {
        id: newUser._id,
        username: newUser.username,
        is_admin: newUser.is_admin
      },
      "your_jwt_secret",
      { expiresIn: "24h" }
    );

    // 设置cookie
    res.setHeader(
      "Set-Cookie",
      `token=${token}; Path=/; HttpOnly; Max-Age=86400`
    );

    return res.status(201).json({
      success: true,
      message: "注册成功",
      user: {
        username: newUser.username,
        is_admin: newUser.is_admin,
        balance: newUser.balance
      }
    });
  } catch (error) {
    console.error("注册错误:", error);
    return res
      .status(500)
      .json({ success: false, error: "注册失败", message: error.message });
  }
}

// 用户登录
async function handleLogin(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: "用户名和密码不能为空" });
    }

    const db = await connectToDatabase();

    // 查找用户
    const user = await db.collection("users").findOne({ username });
    if (!user) {
      return res.status(401).json({ success: false, error: "用户名或密码错误" });
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, error: "用户名或密码错误" });
    }

    // 生成JWT令牌
    const token = jwt.sign(
      { id: user._id, username: user.username, is_admin: user.is_admin },
      "your_jwt_secret",
      { expiresIn: "24h" }
    );

    // 设置cookie
    res.setHeader(
      "Set-Cookie",
      `token=${token}; Path=/; HttpOnly; Max-Age=86400`
    );

    return res.status(200).json({
      success: true,
      message: "登录成功",
      user: {
        username: user.username,
        is_admin: user.is_admin,
        balance: user.balance
      }
    });
  } catch (error) {
    console.error("登录错误:", error);
    return res
      .status(500)
      .json({ success: false, error: "登录失败", message: error.message });
  }
}

// 用户登出
async function handleLogout(req, res) {
  try {
    // 清除cookie
    res.setHeader("Set-Cookie", "token=; Path=/; HttpOnly; Max-Age=0");

    return res.status(200).json({
      success: true,
      message: "登出成功"
    });
  } catch (error) {
    console.error("登出错误:", error);
    return res
      .status(500)
      .json({ success: false, error: "登出失败", message: error.message });
  }
}

// 获取当前用户信息
async function handleGetUser(req, res) {
  try {
    // 从cookie中获取token
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ success: false, error: "未登录" });
    }

    // 验证token
    const decoded = jwt.verify(token, "your_jwt_secret");

    const db = await connectToDatabase();

    // 查找用户
    const user = await db
      .collection("users")
      .findOne({ username: decoded.username });
    if (!user) {
      return res.status(404).json({ success: false, error: "用户不存在" });
    }

    return res.status(200).json({
      success: true,
      username: user.username,
      is_admin: user.is_admin,
      balance: user.balance
    });
  } catch (error) {
    console.error("获取用户信息错误:", error);
    return res.status(401).json({ success: false, error: "未登录或会话已过期" });
  }
}

// 获取所有用户（管理员专用）
async function handleGetAllUsers(req, res) {
  try {
    // 从cookie中获取token
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ success: false, error: "未登录" });
    }

    // 验证token
    const decoded = jwt.verify(token, "your_jwt_secret");

    const db = await connectToDatabase();

    // 检查是否为管理员
    const user = await db
      .collection("users")
      .findOne({ username: decoded.username });
    if (!user || !user.is_admin) {
      return res.status(403).json({ success: false, error: "权限不足" });
    }

    // 获取所有用户
    const users = await db
      .collection("users")
      .find({})
      .project({ password: 0 })
      .toArray();

    return res.status(200).json({
      success: true,
      users
    });
  } catch (error) {
    console.error("获取所有用户错误:", error);
    return res
      .status(500)
      .json({ success: false, error: "获取用户列表失败", message: error.message });
  }
}

// 更新用户余额（管理员专用）
async function handleUpdateBalance(req, res) {
  try {
    // 从cookie中获取token
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ success: false, error: "未登录" });
    }

    // 验证token
    const decoded = jwt.verify(token, "your_jwt_secret");

    const db = await connectToDatabase();

    // 检查是否为管理员
    const adminUser = await db
      .collection("users")
      .findOne({ username: decoded.username });
    if (!adminUser || !adminUser.is_admin) {
      return res.status(403).json({ success: false, error: "权限不足" });
    }

    const { userId, newBalance } = req.body;

    if (!userId || newBalance === undefined) {
      return res.status(400).json({ success: false, error: "用户ID和新余额不能为空" });
    }

    // 更新用户余额
    const result = await db
      .collection("users")
      .updateOne(
        { _id: new ObjectId(userId) },
        { $set: { balance: newBalance } }
      );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, error: "用户不存在" });
    }

    return res.status(200).json({
      success: true,
      message: "余额更新成功"
    });
  } catch (error) {
    console.error("更新余额错误:", error);
    return res
      .status(500)
      .json({ success: false, error: "更新余额失败", message: error.message });
  }
}

// 游戏逻辑
async function handlePlayGame(req, res) {
  try {
    // 从cookie中获取token
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ success: false, error: "未登录" });
    }

    // 验证token
    const decoded = jwt.verify(token, "your_jwt_secret");

    const db = await connectToDatabase();

    // 获取用户
    const user = await db
      .collection("users")
      .findOne({ username: decoded.username });
    if (!user) {
      return res.status(404).json({ success: false, error: "用户不存在" });
    }

    // 获取下注信息
    const { bets } = req.body;

    if (!bets) {
      return res.status(400).json({ success: false, error: "下注信息不能为空" });
    }

    // 计算总下注金额
    let totalBet = 0;
    for (const suit in bets) {
      totalBet += bets[suit];
    }

    if (totalBet <= 0) {
      return res.status(400).json({ success: false, error: "下注金额必须大于0" });
    }

    if (totalBet > user.balance) {
      return res.status(400).json({ success: false, error: "余额不足" });
    }

    // 赔率设置
    const payoutRates = {
      hearts: 3.5,
      diamonds: 3.6,
      clubs: 3.7,
      spades: 3.8,
      joker: 100
    };

    // 概率设置 (总和为100)
    const probabilities = {
      hearts: 28, // 28%
      diamonds: 27, // 27%
      clubs: 26, // 26%
      spades: 18, // 18%
      joker: 1 // 1%
    };

    // 随机生成结果
    const resultSuit = generateRandomSuit(probabilities);

    // 计算赢取金额
    let winAmount = 0;
    if (bets[resultSuit] > 0) {
      winAmount = Math.floor(bets[resultSuit] * payoutRates[resultSuit]);
    }

    // 更新用户余额
    const newBalance = user.balance - totalBet + winAmount;
    await db
      .collection("users")
      .updateOne({ _id: user._id }, { $set: { balance: newBalance } });

    // 记录游戏结果
    const gameRecord = {
      user_id: user._id,
      username: user.username,
      bets: bets,
      bet_amount: totalBet,
      result_suit: resultSuit,
      win_amount: winAmount,
      balance_before: user.balance,
      balance_after: newBalance,
      created_at: new Date()
    };

    await db.collection("game_records").insertOne(gameRecord);

    return res.status(200).json({
      success: true,
      result_suit: resultSuit,
      win_amount: winAmount,
      new_balance: newBalance
    });
  } catch (error) {
    console.error("游戏错误:", error);
    return res
      .status(500)
      .json({ success: false, error: "游戏失败", message: error.message });
  }
}

// 根据概率生成随机花色
function generateRandomSuit(probabilities) {
  const random = Math.random() * 100;
  let cumulativeProbability = 0;

  for (const suit in probabilities) {
    cumulativeProbability += probabilities[suit];
    if (random < cumulativeProbability) {
      return suit;
    }
  }

  // 默认返回黑桃（以防万一）
  return "spades";
}

// 获取游戏记录
async function handleGetGameRecords(req, res) {
  try {
    // 从cookie中获取token
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ success: false, error: "未登录" });
    }

    // 验证token
    const decoded = jwt.verify(token, "your_jwt_secret");

    const db = await connectToDatabase();

    // 获取用户
    const user = await db
      .collection("users")
      .findOne({ username: decoded.username });
    if (!user) {
      return res.status(404).json({ success: false, error: "用户不存在" });
    }

    // 查询条件
    let query = {};

    // 如果不是管理员，只能查看自己的记录
    if (!user.is_admin) {
      query.user_id = user._id;
    }

    // 获取游戏记录
    const records = await db
      .collection("game_records")
      .find(query)
      .sort({ created_at: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      records
    });
  } catch (error) {
    console.error("获取游戏记录错误:", error);
    return res
      .status(500)
      .json({ success: false, error: "获取游戏记录失败", message: error.message });
  }
}

// 路由处理
module.exports = async (req, res) => {
  // 解析cookies
  req.cookies = {};
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    cookieHeader.split(";").forEach(cookie => {
      const parts = cookie.split("=");
      const name = parts[0].trim();
      const value = parts[1].trim();
      req.cookies[name] = value;
    });
  }

  // 解析请求体
  if (req.method === "POST" || req.method === "PUT") {
    try {
      req.body = JSON.parse(req.body);
    } catch (error) {
      req.body = {};
    }
  }

  // 路由处理
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);

  // 初始化数据库
  if (pathname === "/api/init_db" && req.method === "POST") {
    const result = await initializeDatabase();
    return res.status(result.success ? 200 : 500).json(result);
  }

  // 用户注册
  if (pathname === "/api/register" && req.method === "POST") {
    return handleRegister(req, res);
  }

  // 用户登录
  if (pathname === "/api/login" && req.method === "POST") {
    return handleLogin(req, res);
  }

  // 用户登出
  if (pathname === "/api/logout" && req.method === "POST") {
    return handleLogout(req, res);
  }

  // 获取当前用户信息
  if (pathname === "/api/user" && req.method === "GET") {
    return handleGetUser(req, res);
  }

  // 获取所有用户（管理员专用）
  if (pathname === "/api/users" && req.method === "GET") {
    return handleGetAllUsers(req, res);
  }

  // 更新用户余额（管理员专用）
  if (pathname === "/api/update_balance" && req.method === "POST") {
    return handleUpdateBalance(req, res);
  }

  // 游戏
  if (pathname === "/api/play_game" && req.method === "POST") {
    return handlePlayGame(req, res);
  }

  // 获取游戏记录
  if (pathname === "/api/game_records" && req.method === "GET") {
    return handleGetGameRecords(req, res);
  }

  // 404 - 路由不存在
  return res.status(404).json({ success: false, error: "路由不存在" });
};
