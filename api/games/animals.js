// 飞禽走兽游戏模块
const BaseGameHandler = require("./base");
const { validateUserAndBalanceAtomic, updateBalanceAtomic } = require("./base");

/**
 * 飞禽走兽游戏处理器
 */
class AnimalsGameHandler extends BaseGameHandler {
  constructor() {
    super();

    // 飞禽走兽游戏配置 - 重新平衡概率确保庄家优势
    this.animals = [
      { name: "lion", multiplier: 12, weight: 7.1 }, // 狮子 7.1% (期望: 0.071×12≈0.85)
      { name: "panda", multiplier: 8, weight: 10.6 }, // 熊猫 10.6% (期望: 0.106×8≈0.85)
      { name: "eagle", multiplier: 15, weight: 5.7 }, // 老鹰 5.7% (期望: 0.057×15≈0.85)
      { name: "monkey", multiplier: 6, weight: 14.2 }, // 猴子 14.2% (期望: 0.142×6≈0.85)
      { name: "rabbit", multiplier: 4, weight: 21.2 }, // 兔子 21.2% (期望: 0.212×4≈0.85)
      { name: "peacock", multiplier: 10, weight: 8.5 }, // 孔雀 8.5% (期望: 0.085×10≈0.85)
      { name: "pigeon", multiplier: 3, weight: 28.3 }, // 鸽子 28.3% (期望: 0.283×3≈0.85)
      { name: "swallow", multiplier: 5, weight: 17.0 }, // 燕子 17.0% (期望: 0.17×5≈0.85)
      { name: "gold_shark", multiplier: 100, weight: 0.8 }, // 金鲨 0.8% (期望: 0.008×100=0.8)
      { name: "silver_shark", multiplier: 24, weight: 3.5 } // 银鲨 3.5% (期望: 0.035×24≈0.84)
    ];

    // 定义飞禽和走兽分类
    this.birds = ["eagle", "swallow", "pigeon", "peacock"];
    this.beasts = ["lion", "monkey", "panda", "rabbit"];
  }

  /**
   * 计算赢取金额
   * @param {string} resultAnimal 中奖动物
   * @param {Object} bets 押注数据
   * @returns {number} 赢取金额
   */
  calculateWinAmount(resultAnimal, bets) {
    let winAmount = 0;

    console.log("中奖动物:", resultAnimal);
    console.log("押注数据:", bets);

    // 直接动物压注结算
    if (bets[resultAnimal] > 0) {
      const animal = this.animals.find(a => a.name === resultAnimal);
      winAmount += Math.floor(bets[resultAnimal] * animal.multiplier);
    }

    // 飞禽走兽大类压注结算（鲨鱼不给赔付）
    if (resultAnimal !== "gold_shark" && resultAnimal !== "silver_shark") {
      if (this.birds.includes(resultAnimal) && bets["birds"] > 0) {
        const birdWin = Math.floor(bets["birds"] * 2);
        winAmount += birdWin; // 飞禽赔率 1:2
      }
      if (this.beasts.includes(resultAnimal) && bets["beasts"] > 0) {
        const beastWin = Math.floor(bets["beasts"] * 2);
        winAmount += beastWin; // 走兽赔率 1:2
      }
    }

    return winAmount;
  }

  /**
   * 处理飞禽走兽游戏
   * @param {Object} req 请求对象
   * @param {Object} res 响应对象
   */
  async handle(req, res) {
    try {
      console.log("开始处理飞禽走兽游戏请求");
      console.log("请求体:", req.body);

      // 验证押注参数
      const { bets } = req.body;
      const totalAmount = this.validateBets(bets);
      console.log("总押注金额:", totalAmount);

      // 验证用户和余额（使用原子化验证）
      const user = await validateUserAndBalanceAtomic(req, totalAmount);
      if (!user) {
        return this.sendError(res, 401, "未授权");
      }

      console.log("开始游戏逻辑处理");

      // 选择结果动物
      const resultAnimal = this.weightedRandom(this.animals);
      console.log("游戏结果:", resultAnimal.name);

      // 计算赢取金额
      const winAmount = this.calculateWinAmount(resultAnimal.name, bets);
      const netWin = winAmount - totalAmount; // 净赢金额
      console.log("赢取金额:", winAmount, "净赢:", netWin);

      // 原子化更新余额
      const updatedUser = await updateBalanceAtomic(user.username, netWin);
      if (!updatedUser) {
        console.error("原子化余额更新失败！用户:", user.username, "变化金额:", netWin);
        return this.sendError(res, 500, "余额更新失败");
      }

      const newBalance = updatedUser.balance;
      console.log("原子化余额更新成功:", {
        username: user.username,
        oldBalance: user.balance,
        newBalance,
        winAmount,
        totalAmount,
        netWin
      });

      // 记录游戏结果
      const recordId = await this.recordGame({
        username: user.username,
        game_type: "animals",
        bet_data: JSON.stringify(bets),
        result_animal: resultAnimal.name,
        amount: totalAmount,
        win_amount: winAmount,
        old_balance: user.balance,
        new_balance: newBalance,
        balance_change: netWin
      });

      // 返回结果
      const result = {
        record_id: recordId,
        result_animal: resultAnimal.name,
        win_amount: winAmount,
        net_win: netWin,
        new_balance: newBalance,
        total_bet: totalAmount
      };
      console.log("准备返回结果:", result);

      return this.sendSuccess(res, result);
    } catch (error) {
      console.error("飞禽走兽游戏错误:", error);

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
const animalsHandler = new AnimalsGameHandler();

module.exports = {
  handleAnimalsGame: (req, res) => animalsHandler.handle(req, res)
};
