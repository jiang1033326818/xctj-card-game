// 导入所需模块
const { MongoClient } = require("mongodb");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// 数据库配置
const uri = process.env.MONGODB_URI;
const dbName = "card_game";
const usersCollection = "users";
const gameRecordsCollection = "game_records";

// JWT密钥
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// 连接到数据库
async function connectToDatabase() {
  try {
    const client = new MongoClient(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    await client.connect();
    return client.db(dbName);
  } catch (error) {
    console.error("数据库连接失败:", error);
    throw error;
  }
}

// 从请求中获取用户信息
async function getUserFromRequest(req) {
  try {
    // 从请求头中获取token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return null;
    }

    // 验证token
    const decoded = jwt.verify(token, JWT_SECRET);
    const username = decoded.username;

    // 从数据库获取用户信息
    const db = await connectToDatabase();
    const user = await db.collection(usersCollection).findOne({ username });
    return user;
  } catch (error) {
    console.error("获取用户信息错误:", error);
    return null;
  }
}

// 初始化数据库
async function initializeDatabase() {
  try {
    const db = await connectToDatabase();

    // 检查管理员用户是否存在
    const adminExists = await db
      .collection(usersCollection)
      .findOne({ username: "admin" });
    if (!adminExists) {
      // 创建管理员用户
      const hashedPassword = await bcrypt.hash("068162", 10);
      await db.collection(usersCollection).insertOne({
        username: "admin",
        password: hashedPassword,
        is_admin: true,
        balance: 10000,
        created_at: new Date()
      });
      console.log("管理员用户已创建");
    }

    // 检查测试用户是否存在
    const testUserExists = await db
      .collection(usersCollection)
      .findOne({ username: "test" });
    if (!testUserExists) {
      // 创建测试用户
      const hashedPassword = await bcrypt.hash("test123", 10);
      await db.collection(usersCollection).insertOne({
        username: "test",
        password: hashedPassword,
        is_admin: false,
        balance: 1000,
        created_at: new Date()
      });
      console.log("测试用户已创建");
    }

    return { success: true, message: "数据库初始化成功" };
  } catch (error) {
    console.error("数据库初始化错误:", error);
    return { success: false, error: error.message };
  }
}

// 注册用户
async function registerUser(username, password) {
  try {
    const db = await connectToDatabase();

    // 检查用户名是否已存在
    const existingUser = await db
      .collection(usersCollection)
      .findOne({ username });
    if (existingUser) {
      return { success: false, error: "用户名已存在" };
    }

    // 创建新用户
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.collection(usersCollection).insertOne({
      username,
      password: hashedPassword,
      is_admin: false,
      balance: 1000, // 初始余额
      created_at: new Date()
    });

    return { success: true };
  } catch (error) {
    console.error("注册用户错误:", error);
    return { success: false, error: error.message };
  }
}

// 用户登录
async function loginUser(username, password) {
  try {
    const db = await connectToDatabase();

    // 查找用户
    const user = await db.collection(usersCollection).findOne({ username });
    if (!user) {
      return { success: false, error: "用户名或密码错误" };
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return { success: false, error: "用户名或密码错误" };
    }

    // 生成JWT token
    const token = jwt.sign({ username: user.username }, JWT_SECRET, {
      expiresIn: "24h"
    });

    return {
      success: true,
      token,
      is_admin: user.is_admin
    };
  } catch (error) {
    console.error("登录错误:", error);
    return { success: false, error: error.message };
  }
}

// 更新用户余额
async function updateUserBalance(username, balance) {
  try {
    const db = await connectToDatabase();
    await db
      .collection(usersCollection)
      .updateOne({ username }, { $set: { balance } });
    return true;
  } catch (error) {
    console.error("更新余额错误:", error);
    return false;
  }
}

// 记录游戏结果
async function recordGame(username, bet_suit, result_suit, amount, win_amount) {
  try {
    const db = await connectToDatabase();
    const record = {
      username,
      bet_suit,
      result_suit,
      amount,
      win_amount,
      created_at: new Date()
    };
    await db.collection(gameRecordsCollection).insertOne(record);
    return true;
  } catch (error) {
    console.error("记录游戏结果错误:", error);
    return false;
  }
}

// 获取用户游戏记录
async function getUserGameRecords(username) {
  try {
    const db = await connectToDatabase();
    const records = await db
      .collection(gameRecordsCollection)
      .find({ username })
      .sort({ created_at: -1 })
      .toArray();
    return { success: true, records };
  } catch (error) {
    console.error("获取游戏记录错误:", error);
    return { success: false, error: error.message };
  }
}

// 获取所有用户
async function getAllUsers() {
  try {
    const db = await connectToDatabase();
    const users = await db
      .collection(usersCollection)
      .find({}, { projection: { password: 0 } })
      .toArray();
    return { success: true, users };
  } catch (error) {
    console.error("获取用户列表错误:", error);
    return { success: false, error: error.message };
  }
}

// 更新用户信息
async function updateUser(username, updates) {
  try {
    const db = await connectToDatabase();
    await db
      .collection(usersCollection)
      .updateOne({ username }, { $set: updates });
    return { success: true };
  } catch (error) {
    console.error("更新用户信息错误:", error);
    return { success: false, error: error.message };
  }
}

// 加权随机函数
function weightedRandom(items, weights) {
  const cumulativeWeights = [];
  let sum = 0;

  for (let i = 0; i < weights.length; i++) {
    sum += weights[i];
    cumulativeWeights[i] = sum;
  }

  const random = Math.random() * sum;

  for (let i = 0; i < cumulativeWeights.length; i++) {
    if (random < cumulativeWeights[i]) {
      return items[i];
    }
  }

  return items[0]; // 默认返回第一个
}

// 处理游戏请求
async function handleGame(req, res) {
  try {
    // 验证请求体
    const { bets } = req.body;
    if (!bets || typeof bets !== 'object') {
      return res.status(400).json({ error: "无效的请求参数" });
    }
    
    // 计算总押注金额
    let totalAmount = 0;
    for (const suit in bets) {
      if (bets[suit] > 0) {
        totalAmount += bets[suit];
      }
    }
    
    if (totalAmount <= 0) {
      return res.status(400).json({ error: "押注金额必须大于0" });
    }

    // 获取用户信息
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: "未授权" });
    }

    // 检查余额
    if (user.balance < totalAmount) {
      return res.status(400).json({ error: "余额不足" });
    }

    // 随机生成结果
    const suits = ["hearts", "diamonds", "clubs", "spades", "joker"];
    const weights = [0.225, 0.225, 0.225, 0.225, 0.1]; // 小丑出现概率较低
    const result_suit = weightedRandom(suits, weights);

    // 计算赢取金额
    let win_amount = 0;
    if (bets[result_suit] > 0) {
      // 如果猜中
      if (result_suit === "joker") {
        win_amount = bets[result_suit] * 20; // 小丑赔率20倍
      } else {
        win_amount = bets[result_suit] * 3.5; // 其他花色赔率3.5倍
      }
    }

    // 更新余额
    const new_balance = user.balance - totalAmount + win_amount;
    await updateUserBalance(user.username, new_balance);

    // 记录游戏结果
    await recordGame(user.username, JSON.stringify(bets), result_suit, totalAmount, win_amount);

    // 返回结果
    res.json({
      result_suit,
      win_amount,
      new_balance
    });
  } catch (error) {
    console.error("游戏错误:", error);
    res.status(500).json({ error: "服务器错误" });
  }
}

// 处理更新用户余额请求
async function handleUpdateBalance(req, res) {
  try {
    // 验证请求体
    const { username, balance } = req.body;
    if (!username || balance === undefined || isNaN(balance)) {
      return res.status(400).json({ error: "无效的请求参数" });
    }

    // 获取管理员信息
    const admin = await getUserFromRequest(req);
    if (!admin || !admin.is_admin) {
      return res.status(401).json({ error: "未授权" });
    }

    // 更新用户余额
    const result = await updateUser(username, { balance: Number(balance) });
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("更新余额错误:", error);
    res.status(500).json({ error: "服务器错误" });
  }
}

// 统一API处理函数
module.exports = async (req, res) => {
  // 设置CORS头
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // 处理OPTIONS请求
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // 获取路径
  const path = req.url.split("?")[0];

  // 根据路径和方法处理请求
  try {
    // 初始化数据库
    if (path === "/api/init_db" && req.method === "POST") {
      const result = await initializeDatabase();
      return res.json(result);
    }

    // 注册
    if (path === "/api/register" && req.method === "POST") {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: "用户名和密码不能为空" });
      }
      const result = await registerUser(username, password);
      return res.json(result);
    }

    // 登录
    if (path === "/api/login" && req.method === "POST") {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: "用户名和密码不能为空" });
      }
      const result = await loginUser(username, password);
      return res.json(result);
    }

    // 获取当前用户信息
    if (path === "/api/user" && req.method === "GET") {
      const user = await getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({ error: "未授权" });
      }
      return res.json({
        username: user.username,
        is_admin: user.is_admin,
        balance: user.balance
      });
    }

    // 游戏
    if (path === "/api/game" && req.method === "POST") {
      return handleGame(req, res);
    }

    // 获取游戏记录
    if (path === "/api/game_records" && req.method === "GET") {
      const user = await getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({ error: "未授权" });
      }
      const result = await getUserGameRecords(user.username);
      return res.json(result);
    }

    // 管理员：获取所有用户
    if (path === "/api/admin/users" && req.method === "GET") {
      const user = await getUserFromRequest(req);
      if (!user || !user.is_admin) {
        return res.status(401).json({ error: "未授权" });
      }
      const result = await getAllUsers();
      return res.json(result);
    }

    // 管理员：更新用户余额
    if (path === "/api/update_balance" && req.method === "POST") {
      return handleUpdateBalance(req, res);
    }

    // 404 - 路径不存在
    return res.status(404).json({ error: "路径不存在" });
  } catch (error) {
    console.error("API错误:", error);
    return res.status(500).json({ error: "服务器错误" });
  }
};
