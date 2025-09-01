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

    // 获取查询参数
    const url = new URL(req.url, `http://${req.headers.host}`);
    const page = parseInt(url.searchParams.get("page")) || 1;
    const limit = parseInt(url.searchParams.get("limit")) || 10;
    const username = url.searchParams.get("username") || "";

    // 确保page和limit在合理范围内
    const pageNum = Math.max(1, page);
    const limitNum = Math.min(Math.max(1, limit), 100); // 限制每页最多100条记录

    console.log("查询参数:", { page: pageNum, limit: limitNum, username });

    let records;
    let totalCount;

    // 确保db已初始化
    const database = getDB() || (await connectDB());

    if (user.is_admin) {
      console.log("管理员用户，获取所有游戏记录");

      // 构建查询条件
      const query = username ? { username } : {};

      // 获取总记录数
      const allRecords = await database.game_records.find(query);
      totalCount = allRecords.length;

      // 获取分页记录
      // 注意：内存数据库的find方法不支持skip和limit，我们需要手动实现
      records = allRecords.slice((pageNum - 1) * limitNum, pageNum * limitNum);
    } else {
      console.log("普通用户，获取个人游戏记录");

      // 普通用户只能查看自己的记录
      const query = { username: user.username };

      // 获取总记录数
      const allRecords = await database.game_records.find(query);
      totalCount = allRecords.length;

      // 获取分页记录
      records = allRecords.slice((pageNum - 1) * limitNum, pageNum * limitNum);
    }

    console.log("获取到游戏记录:", records.length, "条");

    res.setHeader("Content-Type", "application/json");
    return res.end(
      JSON.stringify({
        success: true,
        records,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          pages: Math.ceil(totalCount / limitNum)
        }
      })
    );
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
    // 用户认证
    const user = await getUserFromRequest(req).catch(err => {
      return null;
    });

    if (!user) {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ success: true, users: [] }));
    }

    // 从数据库获取真实用户数据，排除管理员用户
    const database = getDB() || (await connectDB());
    let users;
    if (typeof database.users.toArray === "function") {
      // MongoDB返回的是游标对象
      users = await database.users.toArray();
    } else {
      // 内存数据库直接返回数组
      const result = await database.users.find({});
      // 内存数据库的find方法返回的是带有toArray方法的对象
      if (result && typeof result.toArray === "function") {
        users = await result.toArray();
      } else {
        users = result;
      }
    }

    // 过滤掉管理员用户，按余额排序，取前3名
    const topUsers = users
      .filter(u => !u.is_admin)
      .map(u => ({ username: u.username, balance: u.balance }))
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 3);

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
