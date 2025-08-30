// 多福多财角子机游戏模块
const BaseGameHandler = require("./base");

/**
 * 多福多财角子机游戏处理器
 */
class SlotGameHandler extends BaseGameHandler {
  constructor() {
    super();
    
    // 游戏配置
    this.config = {
      reels: 5,        // 5个转轴
      rows: 3,         // 3行
      paylines: 243,   // 243种连线方式
      minBet: 10,      // 最小投注
      maxBet: 1000,    // 最大投注
    };

    // 符号配置（从低到高价值）
    this.symbols = [
      { id: 'card_10', name: '10', multiplier: [0, 0, 5, 15, 50], weight: 120 },
      { id: 'card_j', name: 'J', multiplier: [0, 0, 5, 15, 50], weight: 110 },
      { id: 'card_q', name: 'Q', multiplier: [0, 0, 10, 25, 75], weight: 100 },
      { id: 'card_k', name: 'K', multiplier: [0, 0, 10, 25, 75], weight: 90 },
      { id: 'card_a', name: 'A', multiplier: [0, 0, 15, 40, 100], weight: 80 },
      { id: 'coin', name: '金币', multiplier: [0, 0, 20, 60, 150], weight: 70 },
      { id: 'ingot', name: '金元宝', multiplier: [0, 0, 30, 100, 300], weight: 60 },
      { id: 'lantern', name: '灯笼', multiplier: [0, 0, 50, 150, 500], weight: 50 },
      { id: 'dragon', name: '龙', multiplier: [0, 0, 100, 300, 1000], weight: 40 },
      { id: 'wild', name: '福(Wild)', multiplier: [0, 0, 200, 500, 2000], weight: 30 }, // Wild符号
      { id: 'scatter', name: '囍(Scatter)', multiplier: [0, 0, 0, 0, 0], weight: 20 }, // Scatter符号
    ];

    // Jackpot累积奖池配置
    this.jackpotConfig = {
      mini: { min: 100, max: 500, probability: 0.001 },
      minor: { min: 500, max: 2000, probability: 0.0005 },
      major: { min: 2000, max: 10000, probability: 0.0002 },
      grand: { min: 10000, max: 50000, probability: 0.0001 }
    };

    // 免费旋转配置
    this.freeSpinsConfig = {
      triggerScatters: 3,    // 需要3个Scatter触发
      baseSpins: 10,         // 基础免费旋转次数
      maxSpins: 100,         // 最大累积次数
      multiplier: 2          // 免费旋转期间的倍数
    };
  }

  /**
   * 生成转轴结果
   * @returns {Array} 5x3的转轴结果
   */
  generateReels() {
    const reels = [];
    
    for (let reel = 0; reel < this.config.reels; reel++) {
      const reelResult = [];
      
      for (let row = 0; row < this.config.rows; row++) {
        // Wild符号只在第2、3、4列出现
        let availableSymbols = this.symbols;
        if (reel === 0 || reel === 4) {
          availableSymbols = this.symbols.filter(s => s.id !== 'wild');
        }
        
        const symbol = this.weightedRandom(availableSymbols);
        reelResult.push(symbol.id);
      }
      
      reels.push(reelResult);
    }
    
    return reels;
  }

  /**
   * 检查连线组合
   * @param {Array} reels 转轴结果
   * @returns {Array} 中奖线信息
   */
  checkPaylines(reels) {
    const wins = [];
    
    // 检查每一行的连线（简化版243线，实际为3行基础连线）
    for (let row = 0; row < this.config.rows; row++) {
      const line = [];
      for (let reel = 0; reel < this.config.reels; reel++) {
        line.push(reels[reel][row]);
      }
      
      const lineWin = this.checkLine(line, row);
      if (lineWin) {
        wins.push(lineWin);
      }
    }
    
    return wins;
  }

  /**
   * 检查单条线的中奖情况
   * @param {Array} line 一条线的符号
   * @param {number} lineNumber 线号
   * @returns {Object|null} 中奖信息
   */
  checkLine(line, lineNumber) {
    let consecutiveCount = 1;
    let currentSymbol = line[0];
    
    // 处理Wild符号替换
    if (currentSymbol === 'wild') {
      currentSymbol = this.findBestWildReplacement(line);
    }
    
    // 从左到右检查连续符号
    for (let i = 1; i < line.length; i++) {
      let checkSymbol = line[i];
      
      // Wild符号可以替代任何符号（除了Scatter）
      if (checkSymbol === 'wild' || 
          (checkSymbol === currentSymbol) ||
          (currentSymbol === 'wild' && checkSymbol !== 'scatter')) {
        consecutiveCount++;
        if (currentSymbol === 'wild' && checkSymbol !== 'wild' && checkSymbol !== 'scatter') {
          currentSymbol = checkSymbol;
        }
      } else {
        break;
      }
    }
    
    // 需要至少3个连续符号才中奖
    if (consecutiveCount >= 3) {
      const symbol = this.symbols.find(s => s.id === currentSymbol);
      if (symbol && symbol.multiplier[consecutiveCount - 1] > 0) {
        return {
          line: lineNumber,
          symbol: currentSymbol,
          count: consecutiveCount,
          multiplier: symbol.multiplier[consecutiveCount - 1],
          positions: Array.from({length: consecutiveCount}, (_, i) => ({reel: i, row: lineNumber}))
        };
      }
    }
    
    return null;
  }

  /**
   * 寻找Wild符号的最佳替代
   * @param {Array} line 线上的符号
   * @returns {string} 最佳替代符号
   */
  findBestWildReplacement(line) {
    const symbolCounts = {};
    
    line.forEach(symbol => {
      if (symbol !== 'wild' && symbol !== 'scatter') {
        symbolCounts[symbol] = (symbolCounts[symbol] || 0) + 1;
      }
    });
    
    // 返回出现最多的符号，如果没有则返回高价值符号
    const mostCommon = Object.keys(symbolCounts).reduce((a, b) => 
      symbolCounts[a] > symbolCounts[b] ? a : b, 'dragon');
    
    return mostCommon;
  }

  /**
   * 检查Scatter符号和免费旋转
   * @param {Array} reels 转轴结果
   * @returns {Object} Scatter检查结果
   */
  checkScatters(reels) {
    let scatterCount = 0;
    const scatterPositions = [];
    
    for (let reel = 0; reel < reels.length; reel++) {
      for (let row = 0; row < reels[reel].length; row++) {
        if (reels[reel][row] === 'scatter') {
          scatterCount++;
          scatterPositions.push({reel, row});
        }
      }
    }
    
    return {
      count: scatterCount,
      positions: scatterPositions,
      triggeredFreeSpins: scatterCount >= this.freeSpinsConfig.triggerScatters
    };
  }

  /**
   * 检查Jackpot触发
   * @param {number} betAmount 投注金额
   * @returns {Object|null} Jackpot结果
   */
  checkJackpot(betAmount) {
    // 投注额越高，触发概率越大
    const baseProbability = betAmount / this.config.maxBet;
    
    for (const [level, config] of Object.entries(this.jackpotConfig)) {
      const probability = config.probability * (1 + baseProbability);
      
      if (Math.random() < probability) {
        const amount = Math.floor(Math.random() * (config.max - config.min) + config.min);
        return {
          level,
          amount,
          triggered: true
        };
      }
    }
    
    return null;
  }

  /**
   * 计算总赢奖金额
   * @param {Array} wins 中奖线信息
   * @param {number} betAmount 投注金额
   * @param {boolean} isFreeSpins 是否免费旋转
   * @returns {number} 总赢奖金额
   */
  calculateTotalWin(wins, betAmount, isFreeSpins = false) {
    let totalWin = 0;
    
    wins.forEach(win => {
      let lineWin = Math.floor((betAmount / this.config.paylines) * win.multiplier);
      if (isFreeSpins) {
        lineWin *= this.freeSpinsConfig.multiplier;
      }
      totalWin += lineWin;
    });
    
    return totalWin;
  }

  /**
   * 处理多福多财角子机游戏
   * @param {Object} req 请求对象
   * @param {Object} res 响应对象
   */
  async handle(req, res) {
    try {
      console.log("开始处理多福多财角子机游戏请求");
      console.log("请求体:", req.body);
      
      const { bet_amount, free_spins_remaining = 0 } = req.body;
      
      // 验证投注金额
      if (!bet_amount || bet_amount < this.config.minBet || bet_amount > this.config.maxBet) {
        return this.sendError(res, 400, `投注金额必须在${this.config.minBet}-${this.config.maxBet}之间`);
      }

      // 如果不是免费旋转，验证用户和余额
      let user = null;
      if (free_spins_remaining <= 0) {
        user = await this.validateUserAndBalance(req, bet_amount);
        if (!user) {
          return this.sendError(res, 401, "未授权");
        }
      } else {
        // 免费旋转时仍需获取用户信息
        user = await this.validateUserAndBalance(req, 0);
        if (!user) {
          return this.sendError(res, 401, "未授权");
        }
      }

      console.log("开始角子机游戏逻辑处理");
      
      // 生成转轴结果
      const reels = this.generateReels();
      console.log("转轴结果:", reels);
      
      // 检查连线
      const wins = this.checkPaylines(reels);
      console.log("中奖线:", wins);
      
      // 检查Scatter
      const scatterResult = this.checkScatters(reels);
      console.log("Scatter结果:", scatterResult);
      
      // 计算基础赢奖
      const isFreeSpins = free_spins_remaining > 0;
      let totalWin = this.calculateTotalWin(wins, bet_amount, isFreeSpins);
      
      // 检查Jackpot（只在付费旋转时）
      let jackpot = null;
      if (!isFreeSpins) {
        jackpot = this.checkJackpot(bet_amount);
        if (jackpot) {
          totalWin += jackpot.amount;
          console.log("触发Jackpot:", jackpot);
        }
      }
      
      // 计算免费旋转
      let newFreeSpins = free_spins_remaining;
      if (scatterResult.triggeredFreeSpins) {
        newFreeSpins += this.freeSpinsConfig.baseSpins;
        if (newFreeSpins > this.freeSpinsConfig.maxSpins) {
          newFreeSpins = this.freeSpinsConfig.maxSpins;
        }
      }
      if (isFreeSpins && newFreeSpins === free_spins_remaining) {
        newFreeSpins -= 1; // 消耗一次免费旋转
      }
      
      // 计算新余额
      let newBalance = user.balance;
      if (!isFreeSpins) {
        newBalance = user.balance - bet_amount + totalWin;
      } else {
        newBalance = user.balance + totalWin;
      }
      
      console.log("新余额:", newBalance);
      
      // 更新余额
      this.updateBalance(user.username, newBalance);

      // 记录游戏结果
      await this.recordGame({
        username: user.username,
        game_type: "slot",
        bet_amount: isFreeSpins ? 0 : bet_amount,
        reels_result: JSON.stringify(reels),
        wins: JSON.stringify(wins),
        scatter_count: scatterResult.count,
        free_spins_triggered: scatterResult.triggeredFreeSpins ? this.freeSpinsConfig.baseSpins : 0,
        jackpot: jackpot ? JSON.stringify(jackpot) : null,
        total_win: totalWin,
        is_free_spin: isFreeSpins,
      });

      // 返回结果
      const result = {
        reels,
        wins,
        scatter: scatterResult,
        jackpot,
        free_spins_remaining: newFreeSpins,
        total_win: totalWin,
        bet_amount: bet_amount,
        new_balance: newBalance,
        is_free_spin: isFreeSpins
      };
      
      console.log("准备返回结果:", result);
      return this.sendSuccess(res, result);
      
    } catch (error) {
      console.error("多福多财角子机游戏错误:", error);
      
      if (error.message.includes("投注金额")) {
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
const slotHandler = new SlotGameHandler();

module.exports = {
  handleSlotGame: (req, res) => slotHandler.handle(req, res)
};