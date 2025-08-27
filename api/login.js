const bcrypt = require("bcrypt");
const { getDatabase } = require("./db");
const { createSession } = require("./session");

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "方法不允许" });
  }

  const { username, password } = req.body;
  const db = getDatabase();

  db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
    if (err) {
      return res.status(500).json({ error: "数据库错误" });
    }

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: "用户名或密码错误" });
    }

    db.run("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", [user.id]);

    const sessionId = createSession(user.id, user.username, user.is_admin);

    res.setHeader("Set-Cookie", `sessionId=${sessionId}; HttpOnly; Path=/; Max-Age=86400`);

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        balance: user.balance,
        isAdmin: user.is_admin
      }
    });
  });
}
