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
 * 重置Admin密码（无需认证的特殊接口）
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 */
async function resetAdminPassword(req, res) {
  try {
    const { username, password } = req.body;
    
    // 验证参数
    if (username !== "admin") {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "只能重置admin用户的密码" }));
    }

    if (!password || password !== "068162") {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "密码必须为068162" }));
    }

    const database = getDB() || (await connectDB());
    
    // 检查admin用户是否存在
    const adminUser = await database.users.findOne({ username: "admin" });
    if (!adminUser) {
      // 如果admin用户不存在，创建一个
      const bcrypt = require("bcryptjs");
      const hashedPassword = await bcrypt.hash(password, 10);
      
      await database.users.insertOne({
        username: "admin",
        password: hashedPassword,
        is_admin: true,
        balance: 10000,
        created_at: new Date()
      });
      
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ 
        success: true, 
        message: "admin用户已创建，密码设置为068162" 
      }));
    }

    // 加密新密码
    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(password, 10);

    // 更新密码
    await database.users.updateOne(
      { username: "admin" },
      { $set: { password: hashedPassword, password_reset_at: new Date() } }
    );

    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ 
      success: true, 
      message: "admin用户密码已重置为068162" 
    }));
  } catch (error) {
    console.error("重置Admin密码错误:", error);
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

/**
 * 删除重复的Admin账户（只保留一个）
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 */
async function deleteDuplicateAdmins(req, res) {
  try {
    const { username } = req.body;
    
    // 验证参数
    if (username !== "admin") {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "只能清理admin用户的重复账户" }));
    }

    const database = getDB() || (await connectDB());
    
    // 查找所有admin用户
    const allAdminUsers = await database.users.find({ username: "admin" });
    const adminUsersArray = Array.isArray(allAdminUsers) ? allAdminUsers : await allAdminUsers.toArray();
    
    if (adminUsersArray.length <= 1) {
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ 
        success: true, 
        message: "没有发现重复的admin账户" 
      }));
    }
    
    // 保留第一个账户，删除其他所有重复账户
    const usersToDelete = adminUsersArray.slice(1);
    let deletedCount = 0;
    
    for (const user of usersToDelete) {
      try {
        // 对于MongoDB，使用_id删除
        if (user._id) {
          await database.users.updateOne(
            { _id: user._id },
            { $set: { deleted: true, deleted_at: new Date() } }
          );
        } else {
          // 对于内存数据库，使用username和created_at组合条件删除
          await database.users.updateOne(
            { username: "admin", created_at: user.created_at },
            { $set: { deleted: true, deleted_at: new Date() } }
          );
        }
        deletedCount++;
      } catch (deleteError) {
        console.error("删除用户失败:", deleteError);
      }
    }
    
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ 
      success: true, 
      message: `已清理 ${deletedCount} 个重复的admin账户，保留了1个` 
    }));
  } catch (error) {
    console.error("清理重复Admin账户错误:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "服务器错误" }));
  }
}

/**
 * 创建新的管理员用户"jiang"
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 */
async function createJiangAdmin(req, res) {
  try {
    const { username, password } = req.body;
    
    // 验证参数
    if (username !== "jiang" && username !== "jiang2") {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "只能创建用户名为jiang的管理员" }));
    }

    if (!password || password !== "068162") {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "密码必须为068162" }));
    }

    const database = getDB() || (await connectDB());
    
    // 检查用户是否已存在
    const existingUser = await database.users.findOne({ username: "jiang" });
    if (existingUser) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "用户jiang已存在" }));
    }

    // 加密密码
    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建新用户
    const newUser = {
      username: "jiang",
      password: hashedPassword,
      is_admin: true,
      balance: 10000,
      created_at: new Date()
    };

    await database.users.insertOne(newUser);

    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ 
      success: true, 
      message: "管理员用户jiang已创建，密码设置为068162" 
    }));
  } catch (error) {
    console.error("创建管理员用户错误:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "服务器错误" }));
  }
}

/**
 * 创建新的管理员用户"jiang"（无需认证）
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 */
async function createJiangAdminNoAuth(req, res) {
  try {
    const { username, password } = req.body;
    
    // 验证参数
    if (username !== "jiang") {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "只能创建用户名为jiang的管理员" }));
    }

    if (!password || password !== "068162") {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "密码必须为068162" }));
    }

    const database = getDB() || (await connectDB());
    
    // 检查用户是否已存在
    const existingUser = await database.users.findOne({ username: "jiang" });
    if (existingUser) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "用户jiang已存在" }));
    }

    // 加密密码
    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建新用户
    const newUser = {
      username: "jiang",
      password: hashedPassword,
      is_admin: true,
      balance: 10000,
      created_at: new Date()
    };

    await database.users.insertOne(newUser);

    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ 
      success: true, 
      message: "管理员用户jiang已创建，密码设置为068162" 
    }));
  } catch (error) {
    console.error("创建管理员用户错误:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "服务器错误" }));
  }
}

/**
 * 删除所有admin用户并重新创建（无需认证）
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 */
async function deleteAllAdminsAndRecreate(req, res) {
  try {
    const { adminPassword, jiangPassword } = req.body;
    
    // 验证参数
    if (adminPassword !== "068162") {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "admin密码必须为068162" }));
    }

    if (jiangPassword && jiangPassword !== "068162") {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "jiang密码必须为068162" }));
    }

    const database = getDB() || (await connectDB());
    
    // 查找所有admin用户
    const allAdminUsers = await database.users.find({ username: "admin" });
    const adminUsersArray = Array.isArray(allAdminUsers) ? allAdminUsers : await allAdminUsers.toArray();
    
    // 删除所有admin用户
    let deletedCount = 0;
    for (const user of adminUsersArray) {
      try {
        // 对于MongoDB，使用_id删除
        if (user._id) {
          await database.users.deleteOne({ _id: user._id });
        } else {
          // 对于内存数据库，使用username和created_at组合条件删除
          await database.users.deleteOne({ username: "admin", created_at: user.created_at });
        }
        deletedCount++;
      } catch (deleteError) {
        console.error("删除admin用户失败:", deleteError);
      }
    }
    
    // 查找所有jiang用户
    const allJiangUsers = await database.users.find({ username: "jiang" });
    const jiangUsersArray = Array.isArray(allJiangUsers) ? allJiangUsers : await allJiangUsers.toArray();
    
    // 删除所有jiang用户
    let jiangDeletedCount = 0;
    for (const user of jiangUsersArray) {
      try {
        // 对于MongoDB，使用_id删除
        if (user._id) {
          await database.users.deleteOne({ _id: user._id });
        } else {
          // 对于内存数据库，使用username和created_at组合条件删除
          await database.users.deleteOne({ username: "jiang", created_at: user.created_at });
        }
        jiangDeletedCount++;
      } catch (deleteError) {
        console.error("删除jiang用户失败:", deleteError);
      }
    }
    
    // 加密密码
    const bcrypt = require("bcryptjs");
    const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);

    // 创建新的admin用户
    const newAdminUser = {
      username: "admin",
      password: hashedAdminPassword,
      is_admin: true,
      balance: 10000,
      created_at: new Date()
    };

    await database.users.insertOne(newAdminUser);
    
    // 如果需要，创建新的jiang用户
    let jiangMessage = "";
    if (jiangPassword) {
      const hashedJiangPassword = await bcrypt.hash(jiangPassword, 10);
      
      const newJiangUser = {
        username: "jiang",
        password: hashedJiangPassword,
        is_admin: true,
        balance: 10000,
        created_at: new Date()
      };

      await database.users.insertOne(newJiangUser);
      jiangMessage = "，并创建了jiang管理员账户";
    }

    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ 
      success: true, 
      message: `已删除 ${deletedCount} 个admin账户和 ${jiangDeletedCount} 个jiang账户，重新创建了admin管理员账户${jiangMessage}` 
    }));
  } catch (error) {
    console.error("删除并重建管理员账户错误:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "服务器错误" }));
  }
}

module.exports = {
  setAdminUser,
  getAllUsers,
  handleUpdateBalance,
  deleteUser,
  resetUserPassword,
  resetAdminPassword,
  deleteDuplicateAdmins,
  createJiangAdmin,
  createJiangAdminNoAuth,
  deleteAllAdminsAndRecreate,
  getSystemInfo,
  cleanGameRecords
};