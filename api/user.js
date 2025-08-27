const { connectToDatabase } = require("./db");
const { getSessionFromRequest } = require("./session");

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "方法不允许" });
  }

  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return res.status(401).json({ error: "请先登录" });
    }

    const { db } = await connectToDatabase();

    // 查找用户
    const user = await db.collection("users").findOne(
      { _id: session.userId },
      { projection: { password: 0 } } // 排除密码字段
    );

    if (!user) {
      return res.status(404).json({ error: "用户不存在" });
    }

    res.json({
      id: user._id.toString(),
      username: user.username,
      balance: user.balance,
      is_admin: user.is_admin
    });
  } catch (error) {
    console.error("获取用户信息错误:", error);
    res.status(500).json({ error: "服务器错误" });
  }
}
