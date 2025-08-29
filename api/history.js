const { connectToDatabase } = require("./db");
const { getSessionFromRequest } = require("./session");
const { ObjectId } = require("mongodb");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "方法不允许" });
  }

  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return res.status(401).json({ error: "请先登录" });
    }

    const userId = session.userId;
    const { db } = await connectToDatabase();

    // 获取游戏记录
    const gameRecords = await db
      .collection("game_records")
      .find({ userId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    // 获取每个游戏的下注记录
    const gameIds = gameRecords.map(record => record._id);
    const betRecords = await db
      .collection("bet_records")
      .find({ gameRecordId: { $in: gameIds } })
      .toArray();

    // 组织数据
    const betsByGameId = {};
    betRecords.forEach(bet => {
      const gameId = bet.gameRecordId.toString();
      if (!betsByGameId[gameId]) {
        betsByGameId[gameId] = {};
      }
      betsByGameId[gameId][bet.suit] = bet.amount;
    });

    // 合并数据
    const history = gameRecords.map(record => {
      const gameId = record._id.toString();
      return {
        id: gameId,
        userId: record.userId.toString(),
        betAmount: record.betAmount,
        resultSuit: record.resultSuit,
        winnings: record.winnings,
        balanceAfter: record.balanceAfter,
        createdAt: record.createdAt,
        bets: betsByGameId[gameId] || {}
      };
    });

    res.json(history);
  } catch (error) {
    console.error("获取游戏历史错误:", error);
    res.status(500).json({ error: "服务器错误" });
  }
}
