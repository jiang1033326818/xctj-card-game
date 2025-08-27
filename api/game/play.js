const { getDatabase } = require("../db");
const { getSessionFromRequest } = require("../session");

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "方法不允许" });
  }

  const session = getSessionFromRequest(req);
  if (!session) {
    return res.status(401).json({ error: "请先登录" });
  }

  const { bets } = req.body;
  const userId = session.userId;
  const db = getDatabase();

  const totalBet = Object.values(bets).reduce((sum, amount) => sum + amount, 0);

  db.get("SELECT balance FROM users WHERE id = ?", [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: "数据库错误" });
    }

    if (user.balance < totalBet) {
      return res.status(400).json({ error: "余额不足" });
    }

    const suits = ["hearts", "diamonds", "clubs", "spades", "joker"];
    const cards = [];

    for (let i = 0; i < 13; i++) {
      cards.push("hearts", "diamonds", "clubs", "spades");
    }
    cards.push("joker", "joker");

    const result = cards[Math.floor(Math.random() * cards.length)];

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

    db.run(
      "UPDATE users SET balance = ? WHERE id = ?",
      [newBalance, userId],
      err => {
        if (err) {
          return res.status(500).json({ error: "更新余额失败" });
        }

        db.run(
          `INSERT INTO game_records (user_id, bet_amount, result_suit, winnings, balance_after)
           VALUES (?, ?, ?, ?, ?)`,
          [userId, totalBet, result, winnings, newBalance],
          function(err) {
            if (err) {
              return res.status(500).json({ error: "记录游戏失败" });
            }

            const gameRecordId = this.lastID;

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
}
