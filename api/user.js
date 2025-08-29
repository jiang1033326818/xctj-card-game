// 导入所需模块
const { MongoClient } = require("mongodb");
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

// 用户API处理函数
module.exports = async (req, res) => {
  // 设置CORS头
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // 处理OPTIONS请求
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // 只处理GET请求
  if (req.method !== "GET") {
    return res.status(405).json({ error: "方法不允许" });
  }

  try {
    // 获取用户信息
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: "未授权" });
    }

    // 返回用户信息
    return res.status(200).json({
      success: true,
      user: {
        username: user.username,
        role: user.is_admin ? "admin" : "user",
        balance: user.balance
      }
    });
  } catch (error) {
    console.error("用户API错误:", error);
    return res.status(500).json({ error: "服务器错误" });
  }
};
