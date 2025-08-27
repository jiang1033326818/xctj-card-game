const { MongoClient } = require("mongodb");

// 全局变量，保持连接
let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  // 如果已经有连接，直接返回
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  // 获取连接字符串
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("请设置MONGODB_URI环境变量");
  }

  try {
    // 创建新的客户端实例，使用最简单的选项
    // MongoDB 5.x 驱动不再需要 useNewUrlParser 和 useUnifiedTopology 选项
    const client = new MongoClient(uri);

    // 连接到MongoDB
    await client.connect();
    const db = client.db("game_db");

    // 缓存连接
    cachedClient = client;
    cachedDb = db;

    return { client, db };
  } catch (error) {
    console.error("数据库连接错误:", error);
    throw error;
  }
}

module.exports = { connectToDatabase };
