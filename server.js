const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const session = require("express-session");
const path = require("path");
const app = express();

// 中间件配置
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("."));
app.use(
  session({
    secret: "card-game-secret-key-068162",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24小时
  })
);

// 初始化数据库
const db = new sqlite3.Database("game.db");

// 创建数据表
db.serialize(() => {
  // 用户表
  db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        balance INTEGER DEFAULT 1000,
        is_admin BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME
    )`);

  // 游戏记录表
  db.run(`CREATE TABLE IF NOT EXISTS game_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        bet_amount INTEGER,
        result_suit TEXT,
        winnings INTEGER,
        balance_after INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

  // 押注记录表
  db.run(`CREATE TABLE IF NOT EXISTS bet_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_record_id INTEGER,
        suit TEXT,
        amount INTEGER,
        FOREIGN KEY (game_record_id) REFERENCES game_records (id)
    )`);

  // 庄家统计表
  db.run(`CREATE TABLE IF NOT EXISTS house_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        total_games INTEGER DEFAULT 0,
        total_bets INTEGER DEFAULT 0,
        total_payouts INTEGER DEFAULT 0,
        house_profit INTEGER DEFAULT 0,
        hearts_count INTEGER DEFAULT 0,
        diamonds_count INTEGER DEFAULT 0,
        clubs_count INTEGER DEFAULT 0,
        spades_count INTEGER DEFAULT 0,
        joker_count INTEGER DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

  // 初始化庄家统计记录
  db.run(`INSERT OR IGNORE INTO house_stats (id) VALUES (1)`);

  // 创建默认管理员账户 (用户名: admin, 密码: 068162)
  const adminPassword = bcrypt.hashSync("068162", 10);
  db.run(
    `INSERT OR IGNORE INTO users (username, password, balance, is_admin) 
            VALUES ('admin', ?, 10000, 1)`,
    [adminPassword]
  );

  // 创建特殊管理员账户 (用户名: laojiang, 密码: 068162)
  db.run(
    `INSERT OR IGNORE INTO users (username, password, balance, is_admin) 
            VALUES ('laojiang', ?, 10000, 1)`,
    [adminPassword]
  );
});

// 认证中间件
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "请先登录" });
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.session.userId || !req.session.isAdmin) {
    return res.status(403).json({ error: "需要管理员权限" });
  }
  next();
};

// API路由

// 用户登录
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
    if (err) {
      return res.status(500).json({ error: "数据库错误" });
    }

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: "用户名或密码错误" });
    }

    // 更新最后登录时间
    db.run("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", [
      user.id
    ]);

    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.isAdmin = user.is_admin;

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
});

// 用户登出
app.post("/api/logout", (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// 获取当前用户信息
app.get("/api/user", requireAuth, (req, res) => {
  db.get(
    "SELECT id, username, balance, is_admin FROM users WHERE id = ?",
    [req.session.userId],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: "数据库错误" });
      }
      res.json(user);
    }
  );
});

// 添加用户 (管理员功能)
app.post("/api/users", requireAdmin, (req, res) => {
  const { username, password, balance = 1000 } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "用户名和密码不能为空" });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  db.run(
    "INSERT INTO users (username, password, balance) VALUES (?, ?, ?)",
    [username, hashedPassword, balance],
    function(err) {
      if (err) {
        if (err.code === "SQLITE_CONSTRAINT") {
          return res.status(400).json({ error: "用户名已存在" });
        }
        return res.status(500).json({ error: "创建用户失败" });
      }

      res.json({
        success: true,
        user: {
          id: this.lastID,
          username,
          balance
        }
      });
    }
  );
});

// 获取用户列表 (管理员功能)
app.get("/api/users", requireAdmin, (req, res) => {
  db.all(
    `SELECT id, username, balance, created_at, last_login 
            FROM users ORDER BY created_at DESC`,
    (err, users) => {
      if (err) {
        return res.status(500).json({ error: "数据库错误" });
      }
      res.json(users);
    }
  );
});

// 更新用户余额 (管理员功能)
app.put("/api/users/:id/balance", requireAdmin, (req, res) => {
  const { balance } = req.body;
  const userId = req.params.id;

  db.run(
    "UPDATE users SET balance = ? WHERE id = ?",
    [balance, userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: "更新失败" });
      }
      res.json({ success: true });
    }
  );
});

// 删除用户 (管理员功能)
app.delete("/api/users/:id", requireAdmin, (req, res) => {
  const userId = req.params.id;

  if (userId == req.session.userId) {
    return res.status(400).json({ error: "不能删除自己的账户" });
  }

  db.run("DELETE FROM users WHERE id = ?", [userId], function(err) {
    if (err) {
      return res.status(500).json({ error: "删除失败" });
    }
    res.json({ success: true });
  });
});

// 游戏相关API

// 下注并开始游戏
app.post("/api/game/play", requireAuth, (req, res) => {
  const { bets } = req.body; // { hearts: 10, joker: 5 }
  const userId = req.session.userId;

  // 计算总押注
  const totalBet = Object.values(bets).reduce((sum, amount) => sum + amount, 0);

  // 检查用户余额
  db.get("SELECT balance FROM users WHERE id = ?", [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: "数据库错误" });
    }

    if (user.balance < totalBet) {
      return res.status(400).json({ error: "余额不足" });
    }

    // 模拟抽牌结果
    const suits = ["hearts", "diamonds", "clubs", "spades", "joker"];
    const cards = [];

    // 添加普通花色各13张
    for (let i = 0; i < 13; i++) {
      cards.push("hearts", "diamonds", "clubs", "spades");
    }
    // 添加2张王牌
    cards.push("joker", "joker");

    const result = cards[Math.floor(Math.random() * cards.length)];

    // 计算奖金
    const payouts = {
      hearts: 3.5,
      diamonds: 3.5,
      clubs: 3.5,
      spades: 3.5,
      joker: 20
    };

    let winnings = 0;
    if (bets[result]) {
      winnings = bets[result] * (payouts[result] + 1);
    }

    const newBalance = user.balance - totalBet + winnings;

    // 更新用户余额
    db.run(
      "UPDATE users SET balance = ? WHERE id = ?",
      [newBalance, userId],
      err => {
        if (err) {
          return res.status(500).json({ error: "更新余额失败" });
        }

        // 记录游戏
        db.run(
          `INSERT INTO game_records (user_id, bet_amount, result_suit, winnings, balance_after)
                    VALUES (?, ?, ?, ?, ?)`,
          [userId, totalBet, result, winnings, newBalance],
          function(err) {
            if (err) {
              return res.status(500).json({ error: "记录游戏失败" });
            }

            const gameRecordId = this.lastID;

            // 记录押注详情
            const betInserts = Object.entries(bets).map(([suit, amount]) => {
              return new Promise((resolve, reject) => {
                db.run(
                  "INSERT INTO bet_records (game_record_id, suit, amount) VALUES (?, ?, ?)",
                  [gameRecordId, suit, amount],
                  err => {
                    if (err) reject(err);
                    else resolve();
                  }
                );
              });
            });

            Promise.all(betInserts)
              .then(() => {
                // 更新庄家统计
                const profit = totalBet - winnings;
                const suitUpdate = `${result}_count = ${result}_count + 1`;

                db.run(
                  `UPDATE house_stats SET 
                            total_games = total_games + 1,
                            total_bets = total_bets + ?,
                            total_payouts = total_payouts + ?,
                            house_profit = house_profit + ?,
                            ${suitUpdate},
                            updated_at = CURRENT_TIMESTAMP
                            WHERE id = 1`,
                  [totalBet, winnings, profit],
                  err => {
                    if (err) {
                      console.error("更新庄家统计失败:", err);
                    }

                    res.json({
                      success: true,
                      result,
                      winnings,
                      newBalance,
                      gameId: gameRecordId
                    });
                  }
                );
              })
              .catch(err => {
                console.error("记录押注失败:", err);
                res.json({
                  success: true,
                  result,
                  winnings,
                  newBalance,
                  gameId: gameRecordId
                });
              });
          }
        );
      }
    );
  });
});

// 获取用户游戏历史
app.get("/api/game/history", requireAuth, (req, res) => {
  const userId = req.session.userId;

  db.all(
    `SELECT gr.*, 
            GROUP_CONCAT(br.suit || ':' || br.amount) as bets_detail
            FROM game_records gr
            LEFT JOIN bet_records br ON gr.id = br.game_record_id
            WHERE gr.user_id = ?
            GROUP BY gr.id
            ORDER BY gr.created_at DESC
            LIMIT 50`,
    [userId],
    (err, records) => {
      if (err) {
        return res.status(500).json({ error: "数据库错误" });
      }

      // 解析押注详情
      const history = records.map(record => ({
        ...record,
        bets: record.bets_detail
          ? Object.fromEntries(
              record.bets_detail.split(",").map(bet => {
                const [suit, amount] = bet.split(":");
                return [suit, parseInt(amount)];
              })
            )
          : {}
      }));

      res.json(history);
    }
  );
});

// 获取庄家统计 (需要管理员权限)
app.get("/api/house/stats", requireAdmin, (req, res) => {
  db.get("SELECT * FROM house_stats WHERE id = 1", (err, stats) => {
    if (err) {
      return res.status(500).json({ error: "数据库错误" });
    }
    res.json(stats);
  });
});

// 重置庄家统计 (需要管理员权限)
app.post("/api/house/reset", requireAdmin, (req, res) => {
  db.run(
    `UPDATE house_stats SET 
            total_games = 0,
            total_bets = 0,
            total_payouts = 0,
            house_profit = 0,
            hearts_count = 0,
            diamonds_count = 0,
            clubs_count = 0,
            spades_count = 0,
            joker_count = 0,
            updated_at = CURRENT_TIMESTAMP
            WHERE id = 1`,
    err => {
      if (err) {
        return res.status(500).json({ error: "重置失败" });
      }
      res.json({ success: true });
    }
  );
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🎰 喜从天降游戏服务器运行在端口 ${PORT}`);
  console.log(`🔗 访问地址: http://localhost:${PORT}`);
  console.log(`👤 默认管理员账户: admin / 068162`);
});

// 优雅关闭
process.on("SIGINT", () => {
  console.log("\n正在关闭服务器...");
  db.close(err => {
    if (err) {
      console.error("关闭数据库连接失败:", err);
    } else {
      console.log("数据库连接已关闭");
    }
    process.exit(0);
  });
});
