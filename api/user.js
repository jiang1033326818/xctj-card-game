const { getDatabase } = require("./db");
const { getSessionFromRequest } = require("./session");

export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "方法不允许" });
  }

  const session = getSessionFromRequest(req);
  if (!session) {
    return res.status(401).json({ error: "请先登录" });
  }

  const db = getDatabase();
  db.get(
    "SELECT id, username, balance, is_admin FROM users WHERE id = ?",
    [session.userId],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: "数据库错误" });
      }
      res.json(user);
    }
  );
}
