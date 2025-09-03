// 本地测试API接口
// 用于本地开发环境的测试和调试

const { getDB } = require("./database");

/**
 * 本地测试接口 - 获取当前数据库状态
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 */
async function getLocalDBStatus(req, res) {
  try {
    const database = getDB();

    if (!database) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      return res.end(
        JSON.stringify({
          error: "数据库未初始化",
          status: "error"
        })
      );
    }

    // 获取用户数量
    let userCount = 0;
    let users = [];
    try {
      const userResult = await database.users.find({});
      if (Array.isArray(userResult)) {
        users = userResult;
        userCount = userResult.length;
      } else if (typeof userResult.toArray === "function") {
        users = await userResult.toArray();
        userCount = users.length;
      }
    } catch (userError) {
      console.log("获取用户数据失败:", userError.message);
    }

    // 获取游戏记录数量
    let recordCount = 0;
    let records = [];
    try {
      const recordResult = await database.game_records.find({});
      if (Array.isArray(recordResult)) {
        records = recordResult;
        recordCount = recordResult.length;
      } else if (typeof recordResult.toArray === "function") {
        records = await recordResult.toArray();
        recordCount = records.length;
      }
    } catch (recordError) {
      console.log("获取游戏记录失败:", recordError.message);
    }

    res.setHeader("Content-Type", "application/json");
    return res.end(
      JSON.stringify({
        status: "success",
        database: {
          type: database.users ? "memory" : "unknown",
          users: userCount,
          records: recordCount,
          userList: users.map(user => ({
            username: user.username,
            balance: user.balance,
            is_admin: user.is_admin
          })),
          recentRecords: records.slice(0, 5).map(record => ({
            username: record.username,
            game_type: record.game_type,
            amount: record.amount,
            win_amount: record.win_amount,
            created_at: record.created_at
          }))
        }
      })
    );
  } catch (error) {
    console.error("获取本地数据库状态错误:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    return res.end(
      JSON.stringify({
        error: error.message,
        status: "error"
      })
    );
  }
}

/**
 * 本地测试接口 - 重置数据库
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 */
async function resetLocalDB(req, res) {
  try {
    const database = getDB();

    if (!database) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      return res.end(
        JSON.stringify({
          error: "数据库未初始化",
          status: "error"
        })
      );
    }

    // 清空游戏记录
    // 注意：这里我们不直接操作内存数据库的内部结构
    // 而是提供一个模拟的重置响应

    res.setHeader("Content-Type", "application/json");
    return res.end(
      JSON.stringify({
        status: "success",
        message: "数据库已重置（模拟操作）",
        action: "Database reset simulation completed"
      })
    );
  } catch (error) {
    console.error("重置本地数据库错误:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    return res.end(
      JSON.stringify({
        error: error.message,
        status: "error"
      })
    );
  }
}

/**
 * 本地测试接口 - 添加测试用户
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 */
async function addTestUser(req, res) {
  try {
    const database = getDB();

    if (!database) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      return res.end(
        JSON.stringify({
          error: "数据库未初始化",
          status: "error"
        })
      );
    }

    const { username, balance = 1000, is_admin = false } = req.body;

    if (!username) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      return res.end(
        JSON.stringify({
          error: "用户名不能为空",
          status: "error"
        })
      );
    }

    // 检查用户是否已存在
    const existingUser = await database.users.findOne({ username });
    if (existingUser) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      return res.end(
        JSON.stringify({
          error: "用户已存在",
          status: "error"
        })
      );
    }

    // 添加新用户
    const newUser = {
      username,
      balance: parseInt(balance),
      is_admin: Boolean(is_admin),
      created_at: new Date()
    };

    await database.users.insertOne(newUser);

    res.setHeader("Content-Type", "application/json");
    return res.end(
      JSON.stringify({
        status: "success",
        message: "测试用户添加成功",
        user: {
          username: newUser.username,
          balance: newUser.balance,
          is_admin: newUser.is_admin
        }
      })
    );
  } catch (error) {
    console.error("添加测试用户错误:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    return res.end(
      JSON.stringify({
        error: error.message,
        status: "error"
      })
    );
  }
}

module.exports = {
  getLocalDBStatus,
  resetLocalDB,
  addTestUser
};
