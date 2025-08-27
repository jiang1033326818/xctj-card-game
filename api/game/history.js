const { getDatabase } = require("../db");
const { getSessionFromRequest } = require("../session");

export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "方法不允许" });
  }

  const session = getSessionFromRequest(req);
  if (!session) {
    return res.status(401).json({ error: "请先登录" });
  }

  const userId = session.userId;
  const db = getDatabase();

  db.all(
    `SELECT gr.*, 
     GROUP_CONCAT(br.suit || ":" || br.amount) as bets_detail
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
}
