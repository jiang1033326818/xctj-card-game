const { destroySession, getSessionFromRequest } = require("./session");

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "方法不允许" });
  }

  const session = getSessionFromRequest(req);
  if (session) {
    const sessionId = req.cookies?.sessionId;
    if (sessionId) {
      destroySession(sessionId);
    }
  }

  res.setHeader("Set-Cookie", "sessionId=; HttpOnly; Path=/; Max-Age=0");
  res.json({ success: true });
}
