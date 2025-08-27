const bcrypt = require("bcrypt");
const { connectToDatabase } = require("./db");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "方法不允许" });
  }

  try {
    console.log("登录请求开始处理");

    // 检查请求体
    if (!req.body || !req.body.username || !req.body.password) {
      console.log("请求体缺少必要字段");
      return res.status(400).json({ error: "请求缺少必要字段" });
    }

    const { username, password } = req.body;
    console.log(`尝试登录用户: ${username}`);

    // 连接数据库
    console.log("连接数据库...");
    const { db } = await connectToDatabase();
    console.log("数据库连接成功");

    // 查找用户
    console.log("查找用户...");
    const user = await db.collection("users").findOne({ username });

    if (!user) {
      console.log("用户不存在");
      return res.status(401).json({ error: "用户名或密码错误" });
    }

    // 验证密码
    console.log("验证密码...");
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      console.log("密码不匹配");
      return res.status(401).json({ error: "用户名或密码错误" });
    }

    console.log("密码验证成功");

    // 更新最后登录时间
    console.log("更新最后登录时间...");
    await db
      .collection("users")
      .updateOne({ _id: user._id }, { $set: { last_login: new Date() } });

    // 创建会话
    console.log("创建会话...");
    const sessionId = require("crypto").randomBytes(64).toString("hex");

    // 存储会话信息
    console.log("存储会话信息...");
    await db.collection("sessions").updateOne(
      { sessionId },
      {
        $set: {
          userId: user._id,
          username: user.username,
          isAdmin: user.is_admin,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 86400000) // 24小时后过期
        }
      },
      { upsert: true }
    );

    // 设置cookie
    console.log("设置cookie...");
    res.setHeader(
      "Set-Cookie",
      `sessionId=${sessionId}; HttpOnly; Path=/; Max-Age=86400`
    );

    console.log("登录成功");
    res.json({
      success: true,
      user: {
        id: user._id.toString(),
        username: user.username,
        balance: user.balance,
        isAdmin: user.is_admin
      }
    });
  } catch (error) {
    console.error("登录错误:", error);
    res.status(500).json({ error: "服务器错误", message: error.message });
  }
}
