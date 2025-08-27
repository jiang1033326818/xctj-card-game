const bcrypt = require("bcrypt");
const { connectToDatabase } = require("./simple-db");

module.exports = async (req, res) => {
  try {
    console.log("开始初始化数据库");

    // 连接数据库
    const { db } = await connectToDatabase();
    console.log("数据库连接成功");

    // 检查users集合是否存在
    if (!await collectionExists(db, "users")) {
      await db.createCollection("users");
      console.log("创建users集合成功");

      // 创建唯一索引
      await db
        .collection("users")
        .createIndex({ username: 1 }, { unique: true });
      console.log("创建username唯一索引成功");
    }

    // 创建默认管理员账户
    const adminPassword = bcrypt.hashSync("068162", 10);

    // 尝试插入管理员用户
    try {
      await db.collection("users").insertOne({
        username: "admin",
        password: adminPassword,
        balance: 10000,
        is_admin: true,
        created_at: new Date()
      });
      console.log("创建admin用户成功");
    } catch (e) {
      if (e.code !== 11000) {
        // 忽略重复键错误
        throw e;
      }
      console.log("admin用户已存在");
    }

    // 尝试插入laojiang用户
    try {
      await db.collection("users").insertOne({
        username: "laojiang",
        password: adminPassword,
        balance: 10000,
        is_admin: true,
        created_at: new Date()
      });
      console.log("创建laojiang用户成功");
    } catch (e) {
      if (e.code !== 11000) {
        // 忽略重复键错误
        throw e;
      }
      console.log("laojiang用户已存在");
    }

    // 检查其他集合
    const requiredCollections = [
      "sessions",
      "game_records",
      "bet_records",
      "house_stats"
    ];
    for (const collName of requiredCollections) {
      if (!await collectionExists(db, collName)) {
        await db.createCollection(collName);
        console.log(`创建${collName}集合成功`);
      }
    }

    // 初始化庄家统计
    const houseStats = await db.collection("house_stats").findOne({ _id: 1 });
    if (!houseStats) {
      await db.collection("house_stats").insertOne({
        _id: 1,
        totalGames: 0,
        totalBets: 0,
        totalPayouts: 0,
        houseProfit: 0,
        heartsCount: 0,
        diamondsCount: 0,
        clubsCount: 0,
        spadesCount: 0,
        jokerCount: 0,
        updatedAt: new Date()
      });
      console.log("初始化庄家统计成功");
    }

    // 返回成功响应
    res.status(200).json({
      success: true,
      message: "数据库初始化成功"
    });
  } catch (error) {
    console.error("数据库初始化错误:", error);
    res.status(500).json({
      success: false,
      error: "数据库初始化失败",
      message: error.message
    });
  }
};

// 辅助函数：检查集合是否存在
async function collectionExists(db, collectionName) {
  const collections = await db.listCollections().toArray();
  return collections.some(c => c.name === collectionName);
}
