// 简化版登录API，使用最少的依赖和请求头处理
const { MongoClient } = require("mongodb");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

// 数据库连接信息
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://1033326818:Ykswj1bYj6FqCzT1@cluster0.ghauger.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const DB_NAME = "xctj_card_game";
const JWT_SECRET = process.env.JWT_SECRET || "xctj-card-game-secret-key";

// 简化的响应处理函数
function sendResponse(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

// 简化的错误处理函数
function handleError(res, error) {
  console.error("API错误:", error);
  sendResponse(res, 500, {
    success: false,
    message: "服务器内部错误",
    error: error.message
  });
}

// 主处理函数
module.exports = async (req, res) => {
  // 设置CORS头
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // 处理预检请求
  if (req.method === "OPTIONS") {
    return sendResponse(res, 200, {});
  }

  // 只处理POST请求
  if (req.method !== "POST") {
    return sendResponse(res, 405, { success: false, message: "方法不允许" });
  }

  try {
    // 解析请求体
    let body = "";
    for await (const chunk of req) {
      body += chunk.toString();
    }

    // 如果请求体为空，返回错误
    if (!body) {
      return sendResponse(res, 400, { success: false, message: "请求体为空" });
    }

    // 解析JSON
    let data;
    try {
      data = JSON.parse(body);
    } catch (e) {
      return sendResponse(res, 400, { success: false, message: "无效的JSON格式" });
    }

    // 验证必要字段
    const { username, password } = data;
    if (!username || !password) {
      return sendResponse(res, 400, { success: false, message: "用户名和密码不能为空" });
    }

    // 连接数据库
    const client = new MongoClient(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    await client.connect();
    const db = client.db(DB_NAME);
    const usersCollection = db.collection("users");

    // 查找用户
    const user = await usersCollection.findOne({ username });

    // 如果用户不存在
    if (!user) {
      await client.close();
      return sendResponse(res, 401, { success: false, message: "用户名或密码错误" });
    }

    // 验证密码
    const hashedPassword = crypto
      .createHash("md5")
      .update(password)
      .digest("hex");
    if (user.password !== hashedPassword) {
      await client.close();
      return sendResponse(res, 401, { success: false, message: "用户名或密码错误" });
    }

    // 生成JWT令牌
    const token = jwt.sign(
      {
        id: user._id.toString(),
        username: user.username,
        role: user.role || "user"
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    // 关闭数据库连接
    await client.close();

    // 返回成功响应
    return sendResponse(res, 200, {
      success: true,
      message: "登录成功",
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        role: user.role || "user",
        balance: user.balance || 0,
        name: user.name || user.username
      }
    });
  } catch (error) {
    handleError(res, error);
  }
};
