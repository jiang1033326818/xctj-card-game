const bcrypt = require("bcrypt");
const { connectToDatabase } = require("./simple-db");

module.exports = async (req, res) => {
  try {
    console.log("开始处理简化登录请求");

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
  } catch (error) {
    console.error("简化登录错误:", error);
    res.status(500).json({
      error: "服务器错误",
      message: error.message
    });
  }
};
