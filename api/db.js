const { MongoClient } = require("mongodb");
const bcrypt = require("bcrypt");

// MongoDB连接URI (需要替换为您的实际连接字符串)
const uri = process.env.MONGODB_URI;
const dbName = "game_db";

let client = null;
let db = null;

async function connectToDatabase() {
  if (client) return { client, db };

  if (!uri) {
    throw new Error("请设置MONGODB_URI环境变量");
  }

  client = new MongoClient(uri);
  await client.connect();
  db = client.db(dbName);

  // 确保集合存在
  await initializeDatabase();

  return { client, db };
}

async function initializeDatabase() {
  // 检查users集合是否存在
  const collections = await db.listCollections().toArray();
  const collectionNames = collections.map(c => c.name);

  // 创建默认管理员账户
  const adminPassword = bcrypt.hashSync("068162", 10);

  // 用户集合
  if (!collectionNames.includes("users")) {
    await db.createCollection("users");
    // 创建唯一索引
    await db.collection("users").createIndex({ username: 1 }, { unique: true });

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
    await db.createCollection("game_records");
  }

  // 押注记录集合
  if (!collectionNames.includes("bet_records")) {
    await db.createCollection("bet_records");
  }

  // 庄家统计集合
  if (!collectionNames.includes("house_stats")) {
    await db.createCollection("house_stats");
    // 初始化庄家统计记录
    await db.collection("house_stats").insertOne({
      total_games: 0,
      total_bets: 0,
      total_payouts: 0,
      house_profit: 0,
      hearts_count: 0,
      diamonds_count: 0,
      clubs_count: 0,
      spades_count: 0,
      joker_count: 0,
      updated_at: new Date()
    });
  }
}

module.exports = { connectToDatabase };
