const { MongoClient } = require("mongodb");
const bcrypt = require("bcrypt");

// MongoDB连接URI
const uri = process.env.MONGODB_URI;
const dbName = "game_db";

let client = null;
let db = null;

async function connectToDatabase() {
  try {
    // 如果已经连接，直接返回
    if (client && db) {
      return { client, db };
    }

    // 检查URI是否设置
    if (!uri) {
      throw new Error("MONGODB_URI环境变量未设置");
    }

    // 创建新的客户端实例
    client = new MongoClient(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // 5秒超时
      ssl: true,
      tls: true,
      tlsAllowInvalidCertificates: true, // 允许无效证书（仅用于测试）
      tlsAllowInvalidHostnames: true // 允许无效主机名（仅用于测试）
    });

    // 连接到MongoDB
    await client.connect();

    // 获取数据库实例
    db = client.db(dbName);

    // 测试连接
    await db.command({ ping: 1 });

    console.log("MongoDB连接成功");

    return { client, db };
  } catch (error) {
    console.error("MongoDB连接错误:", error);

    // 重置连接
    client = null;
    db = null;

    // 返回错误
    throw new Error(`数据库连接失败: ${error.message}`);
  }
}

// 简化版初始化函数，只在需要时调用
async function initializeDatabase() {
  try {
    const { db } = await connectToDatabase();

    // 创建默认管理员账户
    const adminPassword = bcrypt.hashSync("068162", 10);

    // 确保users集合存在并有默认用户
    try {
      await db.collection("users").findOne({});
    } catch (e) {
      await db.createCollection("users");
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

    console.log("数据库初始化完成");
  } catch (error) {
    console.error("数据库初始化错误:", error);
    throw error;
  }
}

module.exports = {
  connectToDatabase,
  initializeDatabase
};
