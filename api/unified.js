const { MongoClient, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

// MongoDB连接
const uri =
  process.env.MONGODB_URI ||
  "mongodb+srv://1033326818:Ykswj1bYj6FqCzT1@cluster0.ghauger.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// 数据库和集合名称
const dbName = "card_game";
const usersCollection = "users";
const gameRecordsCollection = "game_records";

// JWT密钥
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// 连接到MongoDB
async function connectToDatabase() {
  if (!client.topology || !client.topology.isConnected()) {
    try {
      await client.connect();
      console.log("Connected to MongoDB");
    } catch (error) {
      console.error("MongoDB连接错误:", error);
      throw error;
    }
  }
  return client.db(dbName);
}

// 初始化数据库
async function initializeDatabase() {
  try {
    const db = await connectToDatabase();

    // 检查users集合是否存在
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    // 如果users集合不存在，创建它并添加管理员用户
    if (!collectionNames.includes(usersCollection)) {
      await db.createCollection(usersCollection);

      // 创建管理员用户
      const adminUser = {
        username: "admin",
        password: await bcrypt.hash("068162", 10),
        is_admin: true,
        balance: 10000,
        created_at: new Date()
      };

      await db.collection(usersCollection).insertOne(adminUser);
      console.log("管理员用户已创建");
    }

    // 如果game_records集合不存在，创建它
    if (!collectionNames.includes(gameRecordsCollection)) {
      await db.createCollection(gameRecordsCollection);
      console.log("游戏记录集合已创建");
    }

    return { success: true, message: "数据库初始化成功" };
  } catch (error) {
    console.error("数据库初始化错误:", error);
    return { success: false, error: error.message };
  }
}

// 用户注册
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
    const newUser = {
      username,
      password: hashedPassword,
      is_admin: false,
      balance: 1000, // 初始余额
      created_at: new Date()
    };

    await db.collection(usersCollection).insertOne(newUser);

    // 生成JWT
    const token = jwt.sign({ username, is_admin: false }, JWT_SECRET, {
      expiresIn: "24h"
    });

    return {
      success: true,
      token,
      user: {
        username,
        is_admin: false,
        balance: 1000
      }
    };
  } catch (error) {
    console.error("注册错误:", error);
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
      return { success: false, error: "用户名或密码不正确" };
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return { success: false, error: "用户名或密码不正确" };
    }

    // 生成JWT
    const token = jwt.sign({ username, is_admin: user.is_admin }, JWT_SECRET, {
      expiresIn: "24h"
    });

    return {
      success: true,
      token,
      user: {
        username,
        is_admin: user.is_admin,
        balance: user.balance
      }
    };
  } catch (error) {
    console.error("登录错误:", error);
    return { success: false, error: error.message };
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

    // 验证token
    const decoded = jwt.verify(token, JWT_SECRET);

    // 从数据库获取用户信息
    const db = await connectToDatabase();
    const user = await db
      .collection(usersCollection)
      .findOne({ username: decoded.username });

    return user;
  } catch (error) {
    console.error("获取用户信息错误:", error);
    return null;
  }
}

// 更新用户余额
async function updateUserBalance(username, newBalance) {
  try {
    const db = await connectToDatabase();
    await db
      .collection(usersCollection)
      .updateOne({ username }, { $set: { balance: newBalance } });
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
    const { bet_suit, amount } = req.body;
    if (!bet_suit || !amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: "无效的请求参数" });
    }

    // 获取用户信息
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: "未授权" });
    }

    // 检查余额
    if (user.balance < amount) {
      return res.status(400).json({ error: "余额不足" });
    }

    // 随机生成结果
    const suits = ["hearts", "diamonds", "clubs", "spades", "joker"];
    const weights = [0.225, 0.225, 0.225, 0.225, 0.1]; // 小丑出现概率较低
    const result_suit = weightedRandom(suits, weights);

    // 计算赢取金额
    let win_amount = 0;
    if (result_suit === bet_suit) {
      // 如果猜中
      if (result_suit === "joker") {
        win_amount = amount * 10; // 小丑赔率10倍
      } else {
        win_amount = amount * 4; // 其他花色赔率4倍
      }
    }

    // 更新余额
    const new_balance = user.balance - amount + win_amount;
    await updateUserBalance(user.username, new_balance);

    // 记录游戏结果
    await recordGame(user.username, bet_suit, result_suit, amount, win_amount);

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
