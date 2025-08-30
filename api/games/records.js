// 游戏记录和排行榜模块
const { connectDB, getDB } = require("../database");
const { getUserFromRequest, getAllCachedUsers } = require("../auth");

/**
 * 获取游戏记录
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 */
async function getGameRecords(req, res) {
  try {
    console.log("开始获取游戏记录");
    
    const user = await getUserFromRequest(req);
    if (!user) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "未授权" }));
    }

    console.log("用户认证成功:", user.username, "是否管理员:", user.is_admin);

    let records;
    // 确保db已初始化
    const database = getDB() || (await connectDB());
    
    if (user.is_admin) {
      console.log("管理员用户，获取所有游戏记录");
      records = await database.game_records.find({});
    } else {
      console.log("普通用户，获取个人游戏记录");
      records = await database.game_records.find({ username: user.username });
    }

    console.log("获取到游戏记录:", records.length, "条");

    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ success: true, records }));
  } catch (error) {
    console.error("获取游戏记录错误:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ error: "获取游戏记录失败" }));
  }
}

/**
 * 获取排行榜
 * @param {Object} req 请求对象  
 * @param {Object} res 响应对象
 */
async function getTopPlayers(req, res) {
  try {
    console.log("开始获取排行榜数据");
    
    // 用户认证
    const user = await getUserFromRequest(req).catch(err => {
      console.log("用户认证失败:", err.message);
      return null;
    });
    
    if (!user) {
      console.log("用户未授权，返回空排行榜");
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ success: true, users: [] }));
    }
    
    console.log("用户认证成功:", user.username);

    // 使用缓存数据获取排行榜
    const topUsers = getAllCachedUsers();
    console.log("排行榜数据准备完成:", topUsers.length, "个用户");

    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ success: true, users: topUsers }));
    
  } catch (error) {
    console.error("获取排行榜错误:", error.message);
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ success: true, users: [] }));
  }
}

module.exports = {
  getGameRecords,
  getTopPlayers
};