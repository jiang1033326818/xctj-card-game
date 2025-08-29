// 简化版登录 API
// 用于测试登录功能，减少请求头处理

const { MongoClient } = require("mongodb");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// 数据库配置
const uri = process.env.MONGODB_URI;
const dbName = "card_game";
const usersCollection = "users";

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
      user: {
        username: user.username,
        role: user.is_admin ? "admin" : "user",
        balance: user.balance
      }
    };
  } catch (error) {
    console.error("登录错误:", error);
    return { success: false, error: error.message };
  }
}

// 登录API处理函数
module.exports = async (req, res) => {
  // 设置CORS头
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // 处理OPTIONS请求
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // 只处理POST请求
  if (req.method !== "POST") {
    return res.status(405).json({ error: "方法不允许" });
  }

  try {
    // 验证请求体
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "用户名和密码不能为空" });
    }

    // 处理登录
    const result = await loginUser(username, password);
    if (!result.success) {
      return res.status(401).json({ error: result.error });
    }

    // 返回结果
    return res.status(200).json(result);
  } catch (error) {
    console.error("登录API错误:", error);
    return res.status(500).json({ error: "服务器错误" });
  }
};
