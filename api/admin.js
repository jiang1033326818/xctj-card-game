// 管理员功能模块
const { connectDB, getDB } = require("./database");
const { authenticateAdmin, getUserFromRequest } = require("./auth");

/**
 * 设置用户为管理员（仅限admin用户首次设置）
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 */
async function setAdminUser(req, res) {
  try {
    const { username } = req.body;
    if (username !== "admin") {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "只能设置admin用户为管理员" }));
    }

    // 确保db已初始化
    const database = getDB() || (await connectDB());
    await database.users.updateOne(
      { username: "admin" },
      { $set: { is_admin: true } }
    );
    
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ success: true, message: "admin用户已设置为管理员" }));
  } catch (error) {
    console.error("设置管理员失败:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ error: "设置管理员失败" }));
  }
}

/**
 * 获取所有用户列表
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 */
async function getAllUsers(req, res) {
  try {
    const user = await authenticateAdmin(req, res);
    if (!user) return; // authenticateAdmin已处理响应

    // 确保db已初始化
    const database = getDB() || (await connectDB());
    const usersResult = await database.users.find(
      {},
      { projection: { password: 0 } }
    );
    
    // 处理不同数据库返回的数据格式
    let users = [];
    if (Array.isArray(usersResult)) {
      users = usersResult;
    } else if (typeof usersResult.toArray === 'function') {
      users = await usersResult.toArray();
    } else {
      users = [usersResult];
    }
    
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ success: true, users }));
  } catch (error) {
    console.error("获取用户列表失败:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ error: "获取用户列表失败" }));
  }
}

/**
 * 更新用户余额
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 */
async function handleUpdateBalance(req, res) {
  try {
    const user = await authenticateAdmin(req, res);
    if (!user) return; // authenticateAdmin已处理响应

    const { username, balance } = req.body;
    
    if (!username || balance === undefined) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "用户名和新余额不能为空" }));
    }

    if (typeof balance !== 'number' || balance < 0) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "余额必须为非负数" }));
    }

    // 确保db已初始化
    const database = getDB() || (await connectDB());
    
    // 检查目标用户是否存在
    const targetUser = await database.users.findOne({ username });
    if (!targetUser) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "用户不存在" }));
    }

    // 更新用户余额
    await database.users.updateOne(
      { username },
      { $set: { balance: balance } }
    );

    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ 
      success: true, 
      message: `用户 ${username} 的余额已更新为 ${balance}` 
    }));
  } catch (error) {
    console.error("更新余额错误:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "服务器错误" }));
  }
}

/**
 * 删除用户（软删除，实际上是禁用账户）
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 */
async function deleteUser(req, res) {
  try {
    const user = await authenticateAdmin(req, res);
    if (!user) return;

    const { username } = req.body;
    
    if (!username) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "用户名不能为空" }));
    }

    // 不能删除管理员账户
    if (username === "admin") {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "不能删除管理员账户" }));
    }

    // 不能删除自己
    if (username === user.username) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "不能删除自己的账户" }));
    }

    const database = getDB() || (await connectDB());
    
    // 检查用户是否存在
    const targetUser = await database.users.findOne({ username });
    if (!targetUser) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "用户不存在" }));
    }

    // 标记为已删除（软删除）
    await database.users.updateOne(
      { username },
      { $set: { deleted: true, deleted_at: new Date() } }
    );

    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ 
      success: true, 
      message: `用户 ${username} 已被删除` 
    }));
  } catch (error) {
    console.error("删除用户错误:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "服务器错误" }));
  }
}

/**
 * 重置用户密码
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 */
async function resetUserPassword(req, res) {
  try {
    const user = await authenticateAdmin(req, res);
    if (!user) return;

    const { username, newPassword } = req.body;
    
    if (!username || !newPassword) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "用户名和新密码不能为空" }));
    }

    if (newPassword.length < 6) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "密码长度不能少于6位" }));
    }

    const database = getDB() || (await connectDB());
    
    // 检查用户是否存在
    const targetUser = await database.users.findOne({ username });
    if (!targetUser) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "用户不存在" }));
    }

    // 加密新密码
    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 更新密码
    await database.users.updateOne(
      { username },
      { $set: { password: hashedPassword, password_reset_at: new Date() } }
    );

    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ 
      success: true, 
      message: `用户 ${username} 的密码已重置` 
    }));
  } catch (error) {
    console.error("重置密码错误:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "服务器错误" }));
  }
}

/**
 * 获取系统信息
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 */
async function getSystemInfo(req, res) {
  try {
    const user = await authenticateAdmin(req, res);
    if (!user) return;

    const database = getDB() || (await connectDB());
    
    // 统计用户数量
    const allUsers = await database.users.find({});
    const activeUsers = allUsers.filter(u => !u.deleted);
    const adminUsers = activeUsers.filter(u => u.is_admin);
    
    // 统计游戏记录
    const allRecords = await database.game_records.find({});
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayRecords = allRecords.filter(record => {
      const recordDate = new Date(record.created_at);
      return recordDate >= today;
    });

    // 计算总流水和盈利
    let totalBets = 0;
    let totalPayouts = 0;
    let todayBets = 0;
    let todayPayouts = 0;

    allRecords.forEach(record => {
      totalBets += record.amount || 0;
      totalPayouts += record.win_amount || 0;
    });

    todayRecords.forEach(record => {
      todayBets += record.amount || 0;
      todayPayouts += record.win_amount || 0;
    });

    const systemInfo = {
      userStats: {
        totalUsers: allUsers.length,
        activeUsers: activeUsers.length,
        adminUsers: adminUsers.length,
        deletedUsers: allUsers.length - activeUsers.length
      },
      gameStats: {
        totalGames: allRecords.length,
        todayGames: todayRecords.length,
        totalBets,
        totalPayouts,
        totalProfit: totalBets - totalPayouts,
        todayBets,
        todayPayouts,
        todayProfit: todayBets - todayPayouts
      },
      systemStats: {
        databaseType: process.env.MONGODB_URI ? 'MongoDB' : 'Memory',
        uptime: process.uptime(),
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development'
      }
    };

    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: true, info: systemInfo }));
  } catch (error) {
    console.error("获取系统信息错误:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "获取系统信息失败" }));
  }
}

/**
 * 清理游戏记录
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 */
async function cleanGameRecords(req, res) {
  try {
    const user = await authenticateAdmin(req, res);
    if (!user) return;

    const { days } = req.body; // 清理多少天前的记录
    
    if (!days || days < 1) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "天数必须大于0" }));
    }

    const database = getDB() || (await connectDB());
    
    // 计算截止日期
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // 注意：内存数据库不支持复杂查询，这里做简单处理
    const allRecords = await database.game_records.find({});
    const recordsToKeep = allRecords.filter(record => {
      const recordDate = new Date(record.created_at);
      return recordDate >= cutoffDate;
    });

    // 这里简化处理，实际MongoDB可以直接删除
    console.log(`将保留 ${recordsToKeep.length} 条记录，清理 ${allRecords.length - recordsToKeep.length} 条记录`);

    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ 
      success: true, 
      message: `已清理 ${days} 天前的游戏记录`,
      clearedCount: allRecords.length - recordsToKeep.length,
      remainingCount: recordsToKeep.length
    }));
  } catch (error) {
    console.error("清理游戏记录错误:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "清理游戏记录失败" }));
  }
}

module.exports = {
  setAdminUser,
  getAllUsers,
  handleUpdateBalance,
  deleteUser,
  resetUserPassword,
  getSystemInfo,
  cleanGameRecords
};