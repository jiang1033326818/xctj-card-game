// 游戏基础模块
const { connectDB, getDB } = require("../database");
const { getUserFromRequest, updateUserBalance } = require("../auth");

/**
 * 游戏基础处理器类
 * 提供所有游戏的通用功能
 */
class BaseGameHandler {
  /**
   * 验证用户并检查余额
   * @param {Object} req 请求对象
   * @param {number} totalAmount 总押注金额
   * @returns {Object} 用户信息或null
   */
  async validateUserAndBalance(req, totalAmount) {
    const user = await getUserFromRequest(req).catch(err => {
      console.log("用户认证失败:", err.message);
      return null;
    });

    if (!user) {
      console.log("用户未授权");
      return null;
    }

    console.log("用户信息:", { username: user.username, balance: user.balance });

    if (user.balance < totalAmount) {
      console.log("用户余额不足:", { balance: user.balance, need: totalAmount });
      throw new Error("余额不足");
    }

    return user;
  }

  /**
   * 验证押注参数
   * @param {Object} bets 押注对象
   * @returns {number} 总押注金额
   */
  validateBets(bets) {
    if (!bets || typeof bets !== "object") {
      throw new Error("无效的请求参数");
    }

    let totalAmount = 0;
    for (const key in bets) {
      if (bets[key] > 0) {
        totalAmount += bets[key];
      }
    }

    if (totalAmount <= 0) {
      throw new Error("押注金额必须大于0");
    }

    return totalAmount;
  }

  /**
   * 更新用户余额
   * @param {string} username 用户名
   * @param {number} newBalance 新余额
   * @returns {boolean} 是否成功
   */
  updateBalance(username, newBalance) {
    const result = updateUserBalance(username, newBalance);
    if (result) {
      console.log("余额更新成功:", { username, newBalance });
    } else {
      console.error("余额更新失败:", { username, newBalance });
    }
    return result;
  }

  /**
   * 记录游戏结果到数据库
   * @param {Object} gameRecord 游戏记录
   */
  async recordGame(gameRecord) {
    try {
      const database = getDB() || (await connectDB());
      const result = await database.game_records.insertOne({
        ...gameRecord,
        created_at: new Date()
      });

      // 返回插入的记录ID，便于追踪问题
      console.log("游戏结果记录成功，记录ID:", result.insertedId);
      return result.insertedId;
    } catch (recordError) {
      console.log("游戏结果记录失败:", recordError.message);
      return null;
    }
  }

  /**
   * 发送成功响应
   * @param {Object} res 响应对象
   * @param {Object} data 响应数据
   */
  sendSuccess(res, data) {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(data));
  }

  /**
   * 发送错误响应
   * @param {Object} res 响应对象
   * @param {number} statusCode 状态码
   * @param {string} message 错误消息
   */
  sendError(res, statusCode, message) {
    res.statusCode = statusCode;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: message }));
  }

  /**
   * 加权随机选择
   * @param {Array} items 包含weight属性的项目数组
   * @returns {Object} 选中的项目
   */
  weightedRandom(items) {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    const random = Math.random() * totalWeight;
    let cumulative = 0;

    for (let item of items) {
      cumulative += item.weight;
      if (random < cumulative) {
        return item;
      }
    }

    return items[0]; // 备用返回
  }
}

module.exports = BaseGameHandler;
