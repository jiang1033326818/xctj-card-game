// 多福多财角子机游戏模块
const BaseGameHandler = require("./base");
const { getDB } = require("../database");
const { validateUserAndBalanceAtomic, updateBalanceAtomic } = require("./base");

/**
 * 多福多财角子机游戏处理器
 */
class SlotGameHandler extends BaseGameHandler {
  constructor() {
    super();

    // 游戏配置
    this.config = {
      reels: 5, // 5个转轴
      rows: 5, // 5行（增加为5行）
      paylines: 1024, // 1024种连线方式（增加连线）
      minBet: 10, // 最小投注改为10
      maxBet: 500000 // 最大投注改为50万
    };

    // 符号配置（从低到高价值）- 微调保持小幅庄家优势，但中奖基本覆盖本金
    this.symbols = [
      {
        id: "card_10",
        name: "10",
        multiplier: [0, 12, 30, 60, 120],
        weight: 130
      }, // 略微降低倍数
      {
        id: "card_j",
        name: "J",
        multiplier: [0, 12, 30, 60, 120],
        weight: 125
      },
      {
        id: "card_q",
        name: "Q",
        multiplier: [0, 15, 40, 80, 160],
        weight: 120
      },
      {
        id: "card_k",
        name: "K",
        multiplier: [0, 20, 50, 100, 200],
        weight: 115
      },
      {
        id: "card_a",
        name: "A",
        multiplier: [0, 25, 60, 120, 240],
        weight: 110
      },
      {
        id: "coin",
        name: "金币",
        multiplier: [0, 30, 80, 160, 320],
        weight: 100
      },
      {
        id: "ingot",
        name: "金元宝",
        multiplier: [0, 50, 120, 250, 500],
        weight: 90
      },
      {
        id: "lantern",
        name: "灯笼",
        multiplier: [0, 80, 200, 400, 800],
        weight: 80
      },
      {
        id: "dragon",
        name: "龙",
        multiplier: [0, 120, 300, 600, 1200],
        weight: 70
      },
      {
        id: "wild",
        name: "福(Wild)",
        multiplier: [0, 160, 400, 800, 1600],
        weight: 60
      }, // Wild符号
      {
        id: "scatter",
        name: "囍(Scatter)",
        multiplier: [0, 0, 0, 0, 0],
        weight: 2 // 进一步大幅降低Scatter符号权重，从5降低到2
      } // Scatter符号（进一步降低权重以大幅减少触发概率）
    ];

    // Jackpot累积奖池配置（调整奖金额度与触发概率，再减少50%）
    this.jackpotConfig = {
      mini: { min: 2000, max: 10000, probability: 0.00125 }, // 再减少50%触发概率
      minor: { min: 10000, max: 50000, probability: 0.000375 }, // 再减少50%触发概率
      major: { min: 50000, max: 200000, probability: 0.000125 }, // 再减少50%触发概率
      grand: { min: 200000, max: 1000000, probability: 0.0000625 }, // 再减少50%触发概率
      // 超级大奖：游戏总投注金额
      super: { probability: 0.000025 } // 再减少50%触发概率
    };

    // 免费旋转配置
    this.freeSpinsConfig = {
      triggerScatters: 5, // 进一步增加触发免费旋转所需的Scatter符号数量，从4个增加到5个
      baseSpins: 3, // 进一步减少基础免费旋转次数，从5次减少到3次
      maxSpins: 15, // 进一步降低最大累积次数，从50次减少到15次
      multiplier: 2 // 免费旋转期间的倍数
    };
  }

  /**
   * 获取累计奖池总额
   */
  async getTotalGameBets() {
    try {
      const database = getDB();
      if (!database) return 0;

      // 查找奖池记录
      const poolRecord = await database.game_records.findOne({
        type: "slot_jackpot_pool"
      });
      return poolRecord ? poolRecord.total_bets : 0;
    } catch (error) {
      console.error("获取累计奖池失败:", error);
      return 0;
    }
  }

  /**
   * 更新累计奖池总额
   */
  async updateTotalGameBets(amount) {
    try {
      const database = getDB();
      if (!database) return 0;

      // 查找奖池记录
      let poolRecord = await database.game_records.findOne({
        type: "slot_jackpot_pool"
      });
      let newTotal = amount;

      if (poolRecord) {
        newTotal = (poolRecord.total_bets || 0) + amount;
        await database.game_records.updateOne(
          { type: "slot_jackpot_pool" },
          { $set: { total_bets: newTotal, updated_at: new Date() } }
        );
      } else {
        newTotal = amount;
        await database.game_records.insertOne({
          type: "slot_jackpot_pool",
          total_bets: newTotal,
          created_at: new Date(),
          updated_at: new Date()
        });
      }

      return newTotal;
    } catch (error) {
      console.error("更新累计奖池失败:", error);
      return 0;
    }
  }

  /**
   * 生成转轴结果
   * @returns {Array} 5x5的转轴结果
   */
  generateReels() {
    const reels = [];

    for (let reel = 0; reel < this.config.reels; reel++) {
      const reelResult = [];

      for (let row = 0; row < this.config.rows; row++) {
        // Wild符号只在第2、3、4列出现
        let availableSymbols = this.symbols;
        if (reel === 0 || reel === 4) {
          availableSymbols = this.symbols.filter(s => s.id !== "wild");
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
   * @returns {Array} 中奖线信息
   */
  checkPaylines(reels) {
    const wins = [];
    console.log("检查连线组合，转轴结果:", reels);

    // 适度增加连线数量，保持合理平衡
    // 检查所有5条水平线
    for (let row = 0; row < this.config.rows; row++) {
      const line = [];
      for (let reel = 0; reel < this.config.reels; reel++) {
        line.push(reels[reel][row]);
      }

      console.log(`检查水平线 ${row}:`, line);
      const lineWin = this.checkLine(line, `horizontal-${row}`);
      if (lineWin) {
        console.log(`水平线 ${row} 初步中奖:`, lineWin);
        // 正确计算水平线的位置，只包括连续的中奖符号
        const positions = [];
        // 处理Wild符号替换
        let currentSymbol = line[0];
        if (currentSymbol === "wild") {
          currentSymbol = this.findBestWildReplacement(line);
        }
        console.log(`水平线 ${row} 当前符号:`, currentSymbol);

        // 计算连续符号的位置
        for (let reel = 0; reel < this.config.reels; reel++) {
          const symbol = reels[reel][row];
          console.log(`检查位置 [${reel},${row}] 符号:`, symbol);
          // 检查是否匹配当前符号或为Wild符号
          if (
            symbol === currentSymbol ||
            symbol === "wild" ||
            (currentSymbol === "wild" && symbol !== "scatter")
          ) {
            positions.push({ reel, row });
            console.log(`位置 [${reel},${row}] 匹配，添加到positions`);
          } else {
            // 遇到不匹配的符号就停止
            console.log(`位置 [${reel},${row}] 不匹配，停止检查`);
            break;
          }
        }

        // 只有当连续符号数量大于等于2时才认为中奖
        if (positions.length >= 2) {
          lineWin.positions = positions;
          console.log(`水平线 ${row} 最终中奖:`, lineWin);
          wins.push(lineWin);
        } else {
          console.log(`水平线 ${row} 连续符号不足，不计入中奖`);
        }
      }
    }

    // 添加两条对角线增加中奖机会
    // 主对角线（左上到右下）
    const diagonal1 = [];
    for (let i = 0; i < Math.min(this.config.reels, this.config.rows); i++) {
      diagonal1.push(reels[i][i]);
    }
    console.log("检查主对角线:", diagonal1);
    const diagonal1Win = this.checkLine(diagonal1, "diagonal-1");
    if (diagonal1Win) {
      console.log("主对角线初步中奖:", diagonal1Win);
      // 正确计算对角线的位置，只包括连续的中奖符号
      const positions = [];
      // 处理Wild符号替换
      let currentSymbol = diagonal1[0];
      if (currentSymbol === "wild") {
        currentSymbol = this.findBestWildReplacement(diagonal1);
      }
      console.log("主对角线当前符号:", currentSymbol);

      // 计算连续符号的位置
      for (let i = 0; i < Math.min(this.config.reels, this.config.rows); i++) {
        const symbol = reels[i][i];
        console.log(`检查位置 [${i},${i}] 符号:`, symbol);
        // 检查是否匹配当前符号或为Wild符号
        if (
          symbol === currentSymbol ||
          symbol === "wild" ||
          (currentSymbol === "wild" && symbol !== "scatter")
        ) {
          positions.push({ reel: i, row: i });
          console.log(`位置 [${i},${i}] 匹配，添加到positions`);
        } else {
          // 遇到不匹配的符号就停止
          console.log(`位置 [${i},${i}] 不匹配，停止检查`);
          break;
        }
      }

      // 只有当连续符号数量大于等于2时才认为中奖
      if (positions.length >= 2) {
        diagonal1Win.positions = positions;
        console.log("主对角线最终中奖:", diagonal1Win);
        wins.push(diagonal1Win);
      } else {
        console.log("主对角线连续符号不足，不计入中奖");
      }
    }

    // 反对角线（左下到右上）
    const diagonal2 = [];
    for (let i = 0; i < Math.min(this.config.reels, this.config.rows); i++) {
      const row = this.config.rows - 1 - i;
      diagonal2.push(reels[i][row]);
    }
    console.log("检查反对角线:", diagonal2);
    const diagonal2Win = this.checkLine(diagonal2, "diagonal-2");
    if (diagonal2Win) {
      console.log("反对角线初步中奖:", diagonal2Win);
      // 正确计算反对角线的位置，只包括连续的中奖符号
      const positions = [];
      // 处理Wild符号替换
      let currentSymbol = diagonal2[0];
      if (currentSymbol === "wild") {
        currentSymbol = this.findBestWildReplacement(diagonal2);
      }
      console.log("反对角线当前符号:", currentSymbol);

      // 计算连续符号的位置
      for (let i = 0; i < Math.min(this.config.reels, this.config.rows); i++) {
        const row = this.config.rows - 1 - i;
        const symbol = reels[i][row];
        console.log(`检查位置 [${i},${row}] 符号:`, symbol);
        // 检查是否匹配当前符号或为Wild符号
        if (
          symbol === currentSymbol ||
          symbol === "wild" ||
          (currentSymbol === "wild" && symbol !== "scatter")
        ) {
          positions.push({ reel: i, row });
          console.log(`位置 [${i},${row}] 匹配，添加到positions`);
        } else {
          // 遇到不匹配的符号就停止
          console.log(`位置 [${i},${row}] 不匹配，停止检查`);
          break;
        }
      }

      // 只有当连续符号数量大于等于2时才认为中奖
      if (positions.length >= 2) {
        diagonal2Win.positions = positions;
        console.log("反对角线最终中奖:", diagonal2Win);
        wins.push(diagonal2Win);
      } else {
        console.log("反对角线连续符号不足，不计入中奖");
      }
    }

    console.log("所有中奖线:", wins);
    return wins; // 7条连线（5水平 + 2对角）
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
    if (currentSymbol === "wild") {
      currentSymbol = this.findBestWildReplacement(line);
    }

    // 从左到右检查连续符号
    for (let i = 1; i < line.length; i++) {
      let checkSymbol = line[i];

      // Wild符号可以替代任何符号（除了Scatter）
      if (
        checkSymbol === "wild" ||
        checkSymbol === currentSymbol ||
        (currentSymbol === "wild" && checkSymbol !== "scatter")
      ) {
        consecutiveCount++;
        if (
          currentSymbol === "wild" &&
          checkSymbol !== "wild" &&
          checkSymbol !== "scatter"
        ) {
          currentSymbol = checkSymbol;
        }
      } else {
        break;
      }
    }

    // 需要至少2个连续符号才中奖（降低门槛增加中奖机会）
    if (consecutiveCount >= 2) {
      const symbol = this.symbols.find(s => s.id === currentSymbol);
      if (symbol && symbol.multiplier[consecutiveCount - 1] > 0) {
        return {
          line: lineNumber,
          symbol: currentSymbol,
          count: consecutiveCount,
          multiplier: symbol.multiplier[consecutiveCount - 1],
          positions: [] // 初始化positions数组，将在checkPaylines中填充
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
      if (symbol !== "wild" && symbol !== "scatter") {
        symbolCounts[symbol] = (symbolCounts[symbol] || 0) + 1;
      }
    });

    // 返回出现最多的符号，如果没有则返回高价值符号
    const mostCommon = Object.keys(symbolCounts).reduce(
      (a, b) => (symbolCounts[a] > symbolCounts[b] ? a : b),
      "dragon"
    );

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
        if (reels[reel][row] === "scatter") {
          scatterCount++;
          scatterPositions.push({ reel, row });
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
   * @param {number} totalGameBets 累计投注总额
   * @returns {Object|null} Jackpot结果
   */
  checkJackpot(betAmount, totalGameBets) {
    // 投注额越高，触发概率越大（增强关联性）
    const baseProbability = betAmount / this.config.maxBet;

    // 检查超级大奖（使用总投注金额作为奖金）
    // 超级大奖开奖条件：基于总投注金额
    if (totalGameBets >= 1000) {
      // 至少需要累积1000元投注
      // 增强与投注金额的关联性
      const superProbability =
        this.jackpotConfig.super.probability * (1 + baseProbability * 5);

      if (Math.random() < superProbability) {
        // 奖金与投注金额强关联
        const superAmount = Math.floor(
          totalGameBets * (0.5 + baseProbability * 0.5)
        ); // 50%-100%的总投注金额
        return {
          level: "super",
          amount: superAmount,
          triggered: true,
          type: "super_jackpot"
        };
      }
    }

    // 检查其他Jackpot（提高触发概率，并与投注金额强关联）
    for (const [level, config] of Object.entries(this.jackpotConfig)) {
      if (level === "super") continue; // 跳过超级大奖

      // 增强与投注金额的关联性
      const probability = config.probability * (1 + baseProbability * 5); // 增加更强的概率加成

      if (Math.random() < probability) {
        // 根据投注金额调整奖励金额，使其与投注金额强关联
        let minAmount, maxAmount;

        // 更明显的奖励范围区分
        if (betAmount <= 10) {
          // 小额投注，奖励范围很小
          minAmount = config.min * 0.05;
          maxAmount = config.max * 0.1;
        } else if (betAmount <= 100) {
          // 中等投注，奖励范围较小
          minAmount = config.min * 0.2;
          maxAmount = config.max * 0.4;
        } else if (betAmount <= 500) {
          // 中高投注，奖励范围适中
          minAmount = config.min * 0.5;
          maxAmount = config.max * 0.8;
        } else if (betAmount <= 1000) {
          // 高投注，奖励范围较大
          minAmount = config.min * 0.8;
          maxAmount = config.max * 1.2;
        } else {
          // 超高投注，奖励范围最大（但不超过原设定上限）
          minAmount = Math.min(config.min * (betAmount / 500), config.min * 2);
          maxAmount = Math.min(config.max * (betAmount / 500), config.max);
        }

        // 确保奖励金额不低于最小值且不超过最大值
        minAmount = Math.max(minAmount, config.min * 0.05);
        maxAmount = Math.min(maxAmount, config.max); // 确保不超过最大值

        const amount = Math.floor(
          Math.random() * (maxAmount - minAmount) + minAmount
        );

        // 确保最终金额不超过该奖项的最大值
        const finalAmount = Math.min(Math.round(amount), config.max);

        return {
          level,
          amount: finalAmount,
          triggered: true,
          type: "regular_jackpot"
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
      // 调整奖金计算，保持平衡
      let lineWin = Math.floor(betAmount / 50 * win.multiplier); // 恢复为50倍数
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
      if (
        !bet_amount ||
        bet_amount < this.config.minBet ||
        bet_amount > this.config.maxBet
      ) {
        return this.sendError(
          res,
          400,
          `投注金额必须在${this.config.minBet}-${this.config.maxBet}之间`
        );
      }

      // 如果不是免费旋转，验证用户和余额（使用原子化验证）
      let user = null;
      if (free_spins_remaining <= 0) {
        user = await validateUserAndBalanceAtomic(req, bet_amount);
        if (!user) {
          return this.sendError(res, 401, "未授权");
        }
      } else {
        // 免费旋转时仍需获取用户信息
        user = await validateUserAndBalanceAtomic(req, 0);
        if (!user) {
          return this.sendError(res, 401, "未授权");
        }
      }

      console.log("开始角子机游戏逻辑处理");

      // 获取当前累计奖池总额
      let totalGameBets = await this.getTotalGameBets();

      // 使用前端传来的矩阵，如果没有则生成新的
      let reels;
      if (req.body.game_matrix && Array.isArray(req.body.game_matrix)) {
        reels = req.body.game_matrix;
        console.log("🎲 使用前端传来的游戏矩阵:", reels);
      } else {
        // 后端完全控制游戏逻辑，生成真实的转轴结果
        reels = this.generateReels();
        console.log("后端生成的真实转轴结果:", reels);
      }

      // 检查连线
      const wins = this.checkPaylines(reels);
      console.log("中奖线数量:", wins.length);
      console.log(
        "中奖线详情:",
        wins.map(w => ({
          line: w.line,
          symbol: w.symbol,
          count: w.count,
          multiplier: w.multiplier,
          positions: w.positions
        }))
      );

      // 检查Scatter
      const scatterResult = this.checkScatters(reels);
      console.log("Scatter结果:", scatterResult);

      // 计算基础赢奖
      const isFreeSpins = free_spins_remaining > 0;
      let totalWin = this.calculateTotalWin(wins, bet_amount, isFreeSpins);

      // 检查Jackpot（只在付费旋转时）
      let jackpot = null;
      if (!isFreeSpins) {
        jackpot = this.checkJackpot(bet_amount, totalGameBets);
        if (jackpot) {
          totalWin += jackpot.amount;
          console.log("触发Jackpot:", jackpot);

          // 如果是超级大奖，重置奖池
          if (jackpot.level === "super") {
            totalGameBets = 0;
            await this.updateTotalGameBets(-totalGameBets); // 重置为0
          }
        } else {
          // 累计投注额（只在没有中奖时累计）
          totalGameBets = await this.updateTotalGameBets(bet_amount);
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

      // 计算余额变化
      let balanceChange = 0;
      if (!isFreeSpins) {
        // 付费旋转：赢奖减去投注金额
        balanceChange = totalWin - bet_amount;
      } else {
        // 免费旋转：只加上赢奖
        balanceChange = totalWin;
      }

      console.log("================== 余额计算详情 ==================");
      console.log("计算前状态:");
      console.log("  - 用户余额:", user.balance);
      console.log("  - 投注金额:", bet_amount);
      console.log("  - 中奖金额:", totalWin);
      console.log("  - 免费旋转:", isFreeSpins);
      console.log("  - 中奖线数:", wins.length);
      console.log("  - 余额变化:", balanceChange);
      console.log("================================================");

      // 原子化更新余额
      const updatedUser = await updateBalanceAtomic(
        user.username,
        balanceChange
      );
      if (!updatedUser) {
        console.error("原子化余额更新失败！用户:", user.username, "变化金额:", balanceChange);
        return this.sendError(res, 500, "余额更新失败");
      }

      const newBalance = updatedUser.balance;
      console.log(
        "原子化余额更新成功！用户:",
        user.username,
        "旧余额:",
        user.balance,
        "新余额:",
        newBalance,
        "变化:",
        balanceChange,
        "中奖:",
        totalWin
      );

      // 记录游戏结果
      const recordId = await this.recordGame({
        username: user.username,
        game_type: "slot",
        amount: isFreeSpins ? 0 : bet_amount, // 投注金额
        win_amount: totalWin, // 赢取金额
        bet_amount: isFreeSpins ? 0 : bet_amount, // 保持兼容性
        reels_result: JSON.stringify(reels),
        wins: JSON.stringify(wins),
        scatter_count: scatterResult.count,
        free_spins_triggered: scatterResult.triggeredFreeSpins
          ? this.freeSpinsConfig.baseSpins
          : 0,
        jackpot: jackpot ? JSON.stringify(jackpot) : null,
        total_win: totalWin,
        is_free_spin: isFreeSpins,
        old_balance: user.balance, // 添加旧余额字段
        new_balance: newBalance, // 添加新余额字段
        balance_change: balanceChange // 添加余额变化字段
      });

      // 返回结果
      const result = {
        record_id: recordId, // 添加记录ID字段
        reels,
        wins,
        scatter: scatterResult,
        jackpot,
        free_spins_remaining: newFreeSpins,
        total_win: totalWin,
        bet_amount: bet_amount,
        new_balance: newBalance,
        is_free_spin: isFreeSpins,
        super_jackpot_pool: await this.getTotalGameBets() // 返回总投注金额作为超级大奖池
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

// 获取奖池信息
async function getSlotJackpot(req, res) {
  try {
    const totalGameBets = await slotHandler.getTotalGameBets();
    res.setHeader("Content-Type", "application/json");
    return res.end(
      JSON.stringify({
        success: true,
        super_jackpot_pool: totalGameBets
      })
    );
  } catch (error) {
    console.error("获取奖池信息错误:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ error: "获取奖池信息失败" }));
  }
}

module.exports = {
  handleSlotGame: (req, res) => slotHandler.handle(req, res),
  getSlotJackpot
};
