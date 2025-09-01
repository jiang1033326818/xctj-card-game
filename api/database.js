// 数据库连接和操作模块
const { MongoClient } = require("mongodb");
const bcrypt = require("bcryptjs");

// 数据库连接变量
let db;
let client;

/**
 * 连接数据库
 * @returns {Object} 数据库实例
 */
async function connectDB() {
  if (db) {
    return db;
  }

  try {
    // 如果有MongoDB URI环境变量，使用MongoDB
    if (process.env.MONGODB_URI) {
      console.log("连接MongoDB数据库...");
      client = new MongoClient(process.env.MONGODB_URI);
      await client.connect();
      const mongoDb = client.db();
      console.log("MongoDB连接成功");

      // 包装MongoDB为统一接口
      db = createMongoWrapper(mongoDb);

      // 初始化数据库（确保有默认用户）
      await initializeDatabase(db);

      return db;
    } else {
      // 本地开发使用内存数据库
      console.log("使用内存数据库模式（本地开发）");
      db = createMemoryDB();
      return db;
    }
  } catch (error) {
    console.error("数据库连接错误:", error);
    // 如果MongoDB连接失败，回退到内存数据库
    console.log("回退到内存数据库模式");
    db = createMemoryDB();
    return db;
  }
}

/**
 * 包装MongoDB为统一接口
 * @param {Object} mongoDb MongoDB数据库实例
 * @returns {Object} 统一的数据库接口
 */
function createMongoWrapper(mongoDb) {
  return {
    users: {
      findOne: async query => {
        return await mongoDb.collection("users").findOne(query);
      },
      find: async (query = {}, options = {}) => {
        const cursor = await mongoDb.collection("users").find(query, options);
        // 返回带有 toArray 方法的对象
        return {
          toArray: async () => {
            return await cursor.toArray();
          }
        };
      },
      insertOne: async doc => {
        return await mongoDb.collection("users").insertOne(doc);
      },
      updateOne: async (query, update) => {
        return await mongoDb.collection("users").updateOne(query, update);
      },
      deleteOne: async query => {
        return await mongoDb.collection("users").deleteOne(query);
      },
      deleteMany: async query => {
        return await mongoDb.collection("users").deleteMany(query);
      }
    },
    game_records: {
      find: async (query = {}) => {
        const records = await mongoDb
          .collection("game_records")
          .find(query)
          .sort({ created_at: -1 })
          .toArray();
        return records;
      },
      insertOne: async doc => {
        return await mongoDb.collection("game_records").insertOne(doc);
      },
      updateOne: async (query, update) => {
        return await mongoDb
          .collection("game_records")
          .updateOne(query, update);
      },
      findOne: async (query = {}) => {
        return await mongoDb.collection("game_records").findOne(query);
      }
    }
  };
}

/**
 * 创建内存数据库模拟
 * @returns {Object} 内存数据库实例
 */
function createMemoryDB() {
  let memoryDatabase = {
    users: [
      {
        username: "admin",
        password:
          "$2a$10$b.L8Ny3JLByTCDgdtlc53O5uA8.vyjY9QYCpirGzHZ2oVGoLRWKjm", // 密码: 068162
        is_admin: true,
        balance: 10000,
        created_at: new Date()
      },
      {
        username: "test",
        password:
          "$2a$10$IS/22uJqZYLHBZ9oXZW1F.axJ5KgXgzCI4opLPax.YtXrEg6rLzq2", // 密码: test123
        is_admin: false,
        balance: 1000,
        created_at: new Date()
      }
    ],
    game_records: []
  };

  return {
    users: {
      findOne: async query => {
        return (
          memoryDatabase.users.find(user => {
            return Object.keys(query).every(key => user[key] === query[key]);
          }) || null
        );
      },
      find: async (query = {}, options = {}) => {
        let users = [...memoryDatabase.users];

        // 应用过滤
        if (Object.keys(query).length > 0) {
          users = users.filter(user => {
            return Object.keys(query).every(key => user[key] === query[key]);
          });
        }

        // 应用projection
        if (options.projection) {
          users = users.map(user => {
            const newUser = { ...user };
            Object.keys(options.projection).forEach(key => {
              if (options.projection[key] === 0) {
                delete newUser[key];
              }
            });
            return newUser;
          });
        }

        // 返回带有 toArray 方法的对象，以保持与 MongoDB 的一致性
        return {
          toArray: async () => {
            return users;
          }
        };
      },
      insertOne: async doc => {
        const newUser = { ...doc, _id: Date.now().toString() };
        memoryDatabase.users.push(newUser);
        return { insertedId: newUser._id };
      },
      updateOne: async (query, update) => {
        const index = memoryDatabase.users.findIndex(user => {
          return Object.keys(query).every(key => user[key] === query[key]);
        });
        if (index !== -1 && update.$set) {
          memoryDatabase.users[index] = {
            ...memoryDatabase.users[index],
            ...update.$set
          };
          return { modifiedCount: 1 };
        }
        return { modifiedCount: 0 };
      },
      deleteOne: async query => {
        const index = memoryDatabase.users.findIndex(user => {
          return Object.keys(query).every(key => user[key] === query[key]);
        });
        if (index !== -1) {
          memoryDatabase.users.splice(index, 1);
          return { deletedCount: 1 };
        }
        return { deletedCount: 0 };
      },
      deleteMany: async query => {
        let deletedCount = 0;
        // 从后往前删除，避免索引变化问题
        for (let i = memoryDatabase.users.length - 1; i >= 0; i--) {
          const user = memoryDatabase.users[i];
          if (Object.keys(query).every(key => user[key] === query[key])) {
            memoryDatabase.users.splice(i, 1);
            deletedCount++;
          }
        }
        return { deletedCount };
      }
    },
    game_records: {
      find: async (query = {}) => {
        let records = [...memoryDatabase.game_records];
        if (Object.keys(query).length > 0) {
          records = records.filter(record => {
            return Object.keys(query).every(key => record[key] === query[key]);
          });
        }
        return records.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
      },
      insertOne: async doc => {
        const newRecord = {
          ...doc,
          _id: Date.now().toString(),
          created_at: new Date()
        };
        memoryDatabase.game_records.push(newRecord);
        return { insertedId: newRecord._id };
      },
      updateOne: async (query, update) => {
        const index = memoryDatabase.game_records.findIndex(record => {
          return Object.keys(query).every(key => record[key] === query[key]);
        });
        if (index !== -1 && update.$set) {
          memoryDatabase.game_records[index] = {
            ...memoryDatabase.game_records[index],
            ...update.$set,
            updated_at: new Date()
          };
          return { modifiedCount: 1 };
        }
        return { modifiedCount: 0 };
      },
      findOne: async (query = {}) => {
        return (
          memoryDatabase.game_records.find(record => {
            return Object.keys(query).every(key => record[key] === query[key]);
          }) || null
        );
      }
    }
  };
}

/**
 * 初始化数据库（如果是空的MongoDB）
 * @param {Object} database 数据库实例
 */
async function initializeDatabase(database) {
  try {
    // 检查是否已有用户
    const existingUsers = await database.users.find({});
    const usersArray = Array.isArray(existingUsers)
      ? existingUsers
      : await existingUsers.toArray();

    if (usersArray.length === 0) {
      console.log("数据库为空，初始化默认用户...");

      // 创建admin用户
      const adminPassword = await bcrypt.hash("068162", 10);
      await database.users.insertOne({
        username: "admin",
        password: adminPassword,
        is_admin: true,
        balance: 10000,
        created_at: new Date()
      });

      // 创建test用户
      const testPassword = await bcrypt.hash("test123", 10);
      await database.users.insertOne({
        username: "test",
        password: testPassword,
        is_admin: false,
        balance: 1000,
        created_at: new Date()
      });

      console.log("默认用户创建完成：admin (密码: 068162), test (密码: test123)");
    } else {
      console.log(`数据库中已有 ${usersArray.length} 个用户`);
    }
  } catch (error) {
    console.error("初始化数据库失败:", error);
  }
}

/**
 * 获取数据库实例
 * @returns {Object} 当前数据库实例
 */
function getDB() {
  return db;
}

/**
 * 关闭数据库连接
 */
async function closeDB() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

module.exports = {
  connectDB,
  getDB,
  closeDB,
  initializeDatabase
};
