const { MongoClient } = require("mongodb");
const bcrypt = require("bcrypt");

// MongoDB连接URI
const uri = process.env.MONGODB_URI;
const dbName = "game_db";

let client = null;
let db = null;

async function connectToDatabase() {
  try {
    if (client) return { client, db };

    if (!uri) {
      throw new Error("请设置MONGODB_URI环境变量");
    }

    console.log("正在连接到MongoDB...");
    client = new MongoClient(uri);
    await client.connect();
    console.log("MongoDB连接成功");

    db = client.db(dbName);

    // 确保集合存在
    await initializeDatabase();

    return { client, db };
  } catch (error) {
    console.error("MongoDB连接错误:", error);
    throw error;
  }
}

async function initializeDatabase() {
  try {
    // 检查users集合是否存在
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    // 创建默认管理员账户
    const adminPassword = bcrypt.hashSync("068162", 10);

    // 用户集合
    if (!collectionNames.includes("users")) {
      console.log("创建users集合...");
      await db.createCollection("users");
      // 创建唯一索引
      await db
        .collection("users")
        .createIndex({ username: 1 }, { unique: true });

      // 添加默认管理员
      await db
        .collection("users")
        .insertMany(
          [
            {
              username: "admin",
              password: adminPassword,
              balance: 10000,
              is_admin: true,
              created_at: new Date(),
              last_login: null
            },
            {
              username: "laojiang",
              password: adminPassword,
              balance: 10000,
              is_admin: true,
              created_at: new Date(),
              last_login: null
            }
          ],
          { ordered: false }
        )
        .catch(err => {
          // 忽略重复键错误
          if (err.code !== 11000) throw err;
        });
    }

    // 游戏记录集合
    if (!collectionNames.includes("game_records")) {
      console.log("创建game_records集合...");
      await db.createCollection("game_records");
    }

    // 押注记录集合
    if (!collectionNames.includes("bet_records")) {
      console.log("创建bet_records集合...");
      await db.createCollection("bet_records");
    }

    // 会话集合
    if (!collectionNames.includes("sessions")) {
      console.log("创建sessions集合...");
      await db.createCollection("sessions");
      // 创建会话索引，并设置过期时间
      await db
        .collection("sessions")
        .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    }

    // 庄家统计集合
    if (!collectionNames.includes("house_stats")) {
      console.log("创建house_stats集合...");
      await db.createCollection("house_stats");
      // 初始化庄家统计记录
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
        updated_at: new Date()
      });
    }
  } catch (error) {
    console.error("初始化数据库错误:", error);
    throw error;
  }
}

module.exports = { connectToDatabase };
