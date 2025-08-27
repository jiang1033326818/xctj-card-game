const bcrypt = require("bcrypt");
const { connectToDatabase } = require("./db");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "方法不允许" });
  }

  try {
    const { username, password } = req.body;
    const { db } = await connectToDatabase();

    // 查找用户
    const user = await db.collection("users").findOne({ username });

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: "用户名或密码错误" });
    }

    // 更新最后登录时间
    await db
      .collection("users")
      .updateOne({ _id: user._id }, { $set: { last_login: new Date() } });

    // 创建会话
    const sessionId = require("crypto").randomBytes(64).toString("hex");

    // 存储会话信息
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
    res.setHeader(
      "Set-Cookie",
      `sessionId=${sessionId}; HttpOnly; Path=/; Max-Age=86400`
    );

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
    res.status(500).json({ error: "服务器错误" });
  }
}
