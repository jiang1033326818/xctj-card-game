// 喜从天降游戏模块
const BaseGameHandler = require("./base");

/**
 * 喜从天降游戏处理器
 */
class XCTJGameHandler extends BaseGameHandler {
  constructor() {
    super();

    // 喜从天降游戏配置
    this.suits = [
      { name: "hearts", weight: 24.1, multiplier: 3.5 }, // 红桃 24.1%
      { name: "diamonds", weight: 24.1, multiplier: 3.5 }, // 方块 24.1%
      { name: "clubs", weight: 24.1, multiplier: 3.5 }, // 梅花 24.1%
      { name: "spades", weight: 24.1, multiplier: 3.5 }, // 黑桃 24.1%
      { name: "joker", weight: 3.6, multiplier: 20 } // 小丑 3.6%
    ];
  }

  /**
   * 处理喜从天降游戏
   * @param {Object} req 请求对象
   * @param {Object} res 响应对象
   */
  async handle(req, res) {
    try {
      console.log("开始处理喜从天降游戏请求");
      console.log("请求体:", req.body);

      // 验证押注参数
      const { bets } = req.body;
      const totalAmount = this.validateBets(bets);
      console.log("总押注金额:", totalAmount);

      // 验证用户和余额
      const user = await this.validateUserAndBalance(req, totalAmount);
      if (!user) {
        return this.sendError(res, 401, "未授权");
      }

      console.log("开始游戏逻辑处理");

      // 选择结果花色
      const resultSuit = this.weightedRandom(this.suits);
      console.log("游戏结果:", resultSuit.name);

      // 计算赢取金额
      let winAmount = 0;
      if (bets[resultSuit.name] > 0) {
        winAmount = bets[resultSuit.name] * resultSuit.multiplier;
      }
      console.log("赢取金额:", winAmount);

      // 计算新余额
      const newBalance = user.balance - totalAmount + winAmount;
      console.log("新余额:", newBalance);

      // 更新余额
      this.updateBalance(user.username, newBalance);

      // 记录游戏结果
      const recordId = await this.recordGame({
        username: user.username,
        game_type: "xctj",
        bet_suit: JSON.stringify(bets),
        result_suit: resultSuit.name,
        amount: totalAmount,
        win_amount: winAmount,
        old_balance: user.balance, // 添加旧余额字段
        new_balance: newBalance // 添加新余额字段
      });

      // 返回结果
      const result = {
        record_id: recordId, // 添加记录ID字段
        result_suit: resultSuit.name,
        win_amount: winAmount,
        new_balance: newBalance,
        total_bet: totalAmount
      };
      console.log("准备返回结果:", result);

      return this.sendSuccess(res, result);
    } catch (error) {
      console.error("喜从天降游戏错误:", error);

      if (error.message === "无效的请求参数") {
        return this.sendError(res, 400, error.message);
      }
      if (error.message === "押注金额必须大于0") {
        return this.sendError(res, 400, error.message);
      }
      if (error.message === "余额不足") {
        return this.sendError(res, 400, error.message);
      }

      return this.sendError(res, 500, "服务器错误");
    }
  }
}

// 创建实例并导出处理函数
const xctjHandler = new XCTJGameHandler();

module.exports = {
  handleGame: (req, res) => xctjHandler.handle(req, res)
};
