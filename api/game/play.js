const { connectToDatabase } = require("../db");
const { getSessionFromRequest } = require("../session");
const { ObjectId } = require("mongodb");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "方法不允许" });
  }

  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return res.status(401).json({ error: "请先登录" });
    }

    const { bets } = req.body;
    const userId = session.userId;
    const { db } = await connectToDatabase();

    // 计算总下注金额
    const totalBet = Object.values(bets).reduce(
      (sum, amount) => sum + Number(amount),
      0
    );

    // 获取用户信息
    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return res.status(404).json({ error: "用户不存在" });
    }

    if (user.balance < totalBet) {
      return res.status(400).json({ error: "余额不足" });
    }

    // 游戏逻辑
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

    // 计算赢得金额
    let winnings = 0;
    if (bets[result]) {
      winnings = bets[result] * (payouts[result] + 1);
    }

    const newBalance = user.balance - totalBet + winnings;

    // 更新用户余额
    await db
      .collection("users")
      .updateOne(
        { _id: new ObjectId(userId) },
        { $set: { balance: newBalance } }
      );

    // 创建游戏记录
    const gameRecord = {
      userId: new ObjectId(userId),
      betAmount: totalBet,
      resultSuit: result,
      winnings: winnings,
      balanceAfter: newBalance,
      createdAt: new Date()
    };

    const gameRecordResult = await db
      .collection("game_records")
      .insertOne(gameRecord);
    const gameRecordId = gameRecordResult.insertedId;

    // 创建下注记录
    const betRecords = Object.entries(bets).map(([suit, amount]) => ({
      gameRecordId: gameRecordId,
      suit,
      amount: Number(amount)
    }));

    if (betRecords.length > 0) {
      await db.collection("bet_records").insertMany(betRecords);
    }

    // 更新庄家统计
    const profit = totalBet - winnings;
    const suitUpdateField = `${result}Count`;

    await db.collection("house_stats").updateOne(
      { _id: 1 },
      {
        $inc: {
          totalGames: 1,
          totalBets: totalBet,
          totalPayouts: winnings,
          houseProfit: profit,
          [suitUpdateField]: 1
        },
        $set: { updatedAt: new Date() }
      },
      { upsert: true }
    );

    // 返回结果
    res.json({
      success: true,
      result,
      winnings,
      newBalance,
      gameId: gameRecordId.toString()
    });
  } catch (error) {
    console.error("游戏错误:", error);
    res.status(500).json({ error: "服务器错误" });
  }
}
