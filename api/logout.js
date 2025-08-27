const { destroySession, getSessionFromRequest } = require("./session");
const cookie = require("cookie");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "方法不允许" });
  }

  try {
    // 解析cookie
    const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
    const sessionId = cookies.sessionId;

    if (sessionId) {
      await destroySession(sessionId);
    }

    // 清除cookie
    res.setHeader("Set-Cookie", "sessionId=; HttpOnly; Path=/; Max-Age=0");
    res.json({ success: true });
  } catch (error) {
    console.error("登出错误:", error);
    res.status(500).json({ error: "服务器错误" });
  }
}
