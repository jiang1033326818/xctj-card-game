// 统计功能模块
const { connectDB, getDB } = require("./database");
const { authenticateAdmin } = require("./auth");

/**
 * 获取庄家统计数据（按游戏类型分类）
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 */
async function getHouseStats(req, res) {
  try {
    const user = await authenticateAdmin(req, res);
    if (!user) return; // authenticateAdmin已处理响应

    // 确保db已初始化
    const database = getDB() || (await connectDB());
    const records = await database.game_records.find({});

    // 初始化统计数据
    const stats = {
      // 总体统计
      totalGames: records.length,
      totalBets: 0,
      totalPayouts: 0,
      houseProfit: 0,

      // 喜从天降游戏统计
      xctjStats: {
        totalGames: 0,
        totalBets: 0,
        totalPayouts: 0,
        houseProfit: 0,
        heartsCount: 0,
        diamondsCount: 0,
        clubsCount: 0,
        spadesCount: 0,
        jokerCount: 0
      },

      // 飞禽走兽游戏统计
      animalsStats: {
        totalGames: 0,
        totalBets: 0,
        totalPayouts: 0,
        houseProfit: 0,
        lionCount: 0,
        pandaCount: 0,
        eagleCount: 0,
        monkeyCount: 0,
        rabbitCount: 0,
        peacockCount: 0,
        pigeonCount: 0,
        swallowCount: 0,
        goldSharkCount: 0,
        silverSharkCount: 0
      },

      // 多福多财角子机游戏统计
      slotStats: {
        totalGames: 0,
        totalBets: 0,
        totalPayouts: 0,
        houseProfit: 0,
        jackpotCount: {
          mini: 0,
          minor: 0,
          major: 0,
          grand: 0,
          super: 0
        },
        jackpotPayouts: {
          mini: 0,
          minor: 0,
          major: 0,
          grand: 0,
          super: 0
        },
        totalJackpotPayouts: 0,
        scatterCount: 0,
        freeSpinsCount: 0
      }
    };

    // 遍历游戏记录
    records.forEach(record => {
      const amount = record.amount || record.bet_amount || 0;
      const winAmount = record.win_amount || record.total_win || 0;

      // 总体统计
      stats.totalBets += amount;
      stats.totalPayouts += winAmount;

      // 按游戏类型分类
      if (record.game_type === "animals") {
        // 飞禽走兽游戏
        stats.animalsStats.totalGames++;
        stats.animalsStats.totalBets += amount;
        stats.animalsStats.totalPayouts += winAmount;

        // 统计动物结果
        switch (record.result_animal) {
          case "lion":
            stats.animalsStats.lionCount++;
            break;
          case "panda":
            stats.animalsStats.pandaCount++;
            break;
          case "eagle":
            stats.animalsStats.eagleCount++;
            break;
          case "monkey":
            stats.animalsStats.monkeyCount++;
            break;
          case "rabbit":
            stats.animalsStats.rabbitCount++;
            break;
          case "peacock":
            stats.animalsStats.peacockCount++;
            break;
          case "pigeon":
            stats.animalsStats.pigeonCount++;
            break;
          case "swallow":
            stats.animalsStats.swallowCount++;
            break;
          case "gold_shark":
            stats.animalsStats.goldSharkCount++;
            break;
          case "silver_shark":
            stats.animalsStats.silverSharkCount++;
            break;
        }
      } else if (record.game_type === "slot") {
        // 多福多财角子机游戏
        stats.slotStats.totalGames++;
        stats.slotStats.totalBets += amount;
        stats.slotStats.totalPayouts += winAmount;

        // 统计Jackpot获奖情况
        if (record.jackpot) {
          try {
            const jackpotData =
              typeof record.jackpot === "string"
                ? JSON.parse(record.jackpot)
                : record.jackpot;
            if (jackpotData && jackpotData.level) {
              // 确保等级字段存在，处理不同格式
              let level = jackpotData.level;
              // 标准化等级名称
              if (level === "super_jackpot") level = "super";
              if (level === "regular_jackpot_mini") level = "mini";
              if (level === "regular_jackpot_minor") level = "minor";
              if (level === "regular_jackpot_major") level = "major";
              if (level === "regular_jackpot_grand") level = "grand";

              if (stats.slotStats.jackpotCount.hasOwnProperty(level)) {
                stats.slotStats.jackpotCount[level] =
                  (stats.slotStats.jackpotCount[level] || 0) + 1;

                // 统计Jackpot派彩金额
                if (jackpotData.amount) {
                  stats.slotStats.jackpotPayouts[level] =
                    (stats.slotStats.jackpotPayouts[level] || 0) +
                    jackpotData.amount;
                  stats.slotStats.totalJackpotPayouts += jackpotData.amount;
                }
              }
            }
          } catch (e) {
            console.log("解析Jackpot数据失败:", e.message);
          }
        }

        // 统计Scatter符号数量
        if (record.scatter_count) {
          stats.slotStats.scatterCount += record.scatter_count;
        } else if (record.scatter) {
          // 兼容旧格式
          try {
            const scatterData =
              typeof record.scatter === "string"
                ? JSON.parse(record.scatter)
                : record.scatter;
            if (scatterData && scatterData.count) {
              stats.slotStats.scatterCount += scatterData.count;
            }
          } catch (e) {
            console.log("解析Scatter数据失败:", e.message);
          }
        }

        // 统计免费旋转触发次数
        if (record.free_spins_triggered) {
          stats.slotStats.freeSpinsCount += record.free_spins_triggered;
        } else if (record.free_spins) {
          // 兼容旧格式
          stats.slotStats.freeSpinsCount += 1;
        }
      } else {
        // 喜从天降游戏（默认或旧数据）
        stats.xctjStats.totalGames++;
        stats.xctjStats.totalBets += amount;
        stats.xctjStats.totalPayouts += winAmount;

        // 统计花色结果
        switch (record.result_suit) {
          case "hearts":
            stats.xctjStats.heartsCount++;
            break;
          case "diamonds":
            stats.xctjStats.diamondsCount++;
            break;
          case "clubs":
            stats.xctjStats.clubsCount++;
            break;
          case "spades":
            stats.xctjStats.spadesCount++;
            break;
          case "joker":
            stats.xctjStats.jokerCount++;
            break;
        }
      }
    });

    // 计算盈利
    stats.houseProfit = stats.totalBets - stats.totalPayouts;
    stats.xctjStats.houseProfit =
      stats.xctjStats.totalBets - stats.xctjStats.totalPayouts;
    stats.animalsStats.houseProfit =
      stats.animalsStats.totalBets - stats.animalsStats.totalPayouts;
    stats.slotStats.houseProfit =
      stats.slotStats.totalBets - stats.slotStats.totalPayouts;

    // 计算最赚钱游戏
    const gameComparison = [
      {
        name: "喜从天降",
        key: "xctj",
        profit: stats.xctjStats.houseProfit,
        games: stats.xctjStats.totalGames,
        bets: stats.xctjStats.totalBets,
        avgProfitPerGame:
          stats.xctjStats.totalGames > 0
            ? (stats.xctjStats.houseProfit /
                stats.xctjStats.totalGames).toFixed(2)
            : 0
      },
      {
        name: "飞禽走兽",
        key: "animals",
        profit: stats.animalsStats.houseProfit,
        games: stats.animalsStats.totalGames,
        bets: stats.animalsStats.totalBets,
        avgProfitPerGame:
          stats.animalsStats.totalGames > 0
            ? (stats.animalsStats.houseProfit /
                stats.animalsStats.totalGames).toFixed(2)
            : 0
      },
      {
        name: "多福多财角子机",
        key: "slot",
        profit: stats.slotStats.houseProfit,
        games: stats.slotStats.totalGames,
        bets: stats.slotStats.totalBets,
        avgProfitPerGame:
          stats.slotStats.totalGames > 0
            ? (stats.slotStats.houseProfit /
                stats.slotStats.totalGames).toFixed(2)
            : 0
      }
    ];

    // 按总盈利排序找出最赚钱游戏
    const mostProfitableGame = gameComparison.reduce((prev, current) => {
      return current.profit > prev.profit ? current : prev;
    });

    // 按场均盈利排序找出效率最高游戏
    const mostEfficientGame = gameComparison.reduce((prev, current) => {
      return parseFloat(current.avgProfitPerGame) >
      parseFloat(prev.avgProfitPerGame)
        ? current
        : prev;
    });

    // 添加最赚钱游戏信息到统计中
    stats.mostProfitableGame = mostProfitableGame;
    stats.mostEfficientGame = mostEfficientGame;
    stats.gameComparison = gameComparison;

    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ success: true, stats }));
  } catch (error) {
    console.error("获取统计数据失败:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ error: "获取统计数据失败" }));
  }
}

/**
 * 计算游戏统计数据
 * @param {Array} records 游戏记录数组
 * @returns {Object} 统计数据
 */
function calculateGameStats(records) {
  const stats = {
    totalGames: records.length,
    totalBets: 0,
    totalPayouts: 0,
    houseProfit: 0,

    // 按游戏类型分类
    gameTypeStats: {
      xctj: {
        totalGames: 0,
        totalBets: 0,
        totalPayouts: 0,
        houseProfit: 0,
        results: {}
      },
      animals: {
        totalGames: 0,
        totalBets: 0,
        totalPayouts: 0,
        houseProfit: 0,
        results: {}
      }
    }
  };

  records.forEach(record => {
    const amount = record.amount || record.bet_amount || 0;
    const winAmount = record.win_amount || record.total_win || 0;

    stats.totalBets += amount;
    stats.totalPayouts += winAmount;

    const gameType = record.game_type === "animals" ? "animals" : "xctj";
    const typeStats = stats.gameTypeStats[gameType];

    typeStats.totalGames++;
    typeStats.totalBets += amount;
    typeStats.totalPayouts += winAmount;

    // 统计结果
    const result = record.result_animal || record.result_suit;
    if (result) {
      if (!typeStats.results[result]) {
        typeStats.results[result] = 0;
      }
      typeStats.results[result]++;
    }
  });

  // 计算盈利
  stats.houseProfit = stats.totalBets - stats.totalPayouts;
  stats.gameTypeStats.xctj.houseProfit =
    stats.gameTypeStats.xctj.totalBets - stats.gameTypeStats.xctj.totalPayouts;
  stats.gameTypeStats.animals.houseProfit =
    stats.gameTypeStats.animals.totalBets -
    stats.gameTypeStats.animals.totalPayouts;

  return stats;
}

/**
 * 获取用户统计数据
 * @param {string} username 用户名
 * @returns {Object} 用户统计数据
 */
async function getUserStats(username) {
  try {
    const database = getDB() || (await connectDB());
    const records = await database.game_records.find({ username });

    return calculateGameStats(records);
  } catch (error) {
    console.error("获取用户统计失败:", error);
    return null;
  }
}

/**
 * 获取时间段统计数据
 * @param {Date} startDate 开始时间
 * @param {Date} endDate 结束时间
 * @returns {Object} 时间段统计数据
 */
async function getTimeRangeStats(startDate, endDate) {
  try {
    const database = getDB() || (await connectDB());
    const records = await database.game_records.find({});

    // 过滤时间范围
    const filteredRecords = records.filter(record => {
      const recordDate = new Date(record.created_at);
      return recordDate >= startDate && recordDate <= endDate;
    });

    return calculateGameStats(filteredRecords);
  } catch (error) {
    console.error("获取时间段统计失败:", error);
    return null;
  }
}

/**
 * 获取游戏热度排行
 * @returns {Array} 游戏热度排行
 */
async function getGamePopularity() {
  try {
    const database = getDB() || (await connectDB());
    const records = await database.game_records.find({});

    const gameCount = {
      xctj: 0,
      animals: 0
    };

    records.forEach(record => {
      if (record.game_type === "animals") {
        gameCount.animals++;
      } else {
        gameCount.xctj++;
      }
    });

    return [
      { name: "喜从天降", count: gameCount.xctj },
      { name: "飞禽走兽", count: gameCount.animals }
    ].sort((a, b) => b.count - a.count);
  } catch (error) {
    console.error("获取游戏热度失败:", error);
    return [];
  }
}

/**
 * 获取收益趋势数据（按天）
 * @param {number} days 天数，默认7天
 * @returns {Array} 收益趋势数据
 */
async function getProfitTrend(days = 7) {
  try {
    const database = getDB() || (await connectDB());
    const records = await database.game_records.find({});

    const now = new Date();
    const trendData = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayRecords = records.filter(record => {
        const recordDate = new Date(record.created_at);
        return recordDate >= date && recordDate < nextDate;
      });

      const dayStats = calculateGameStats(dayRecords);

      trendData.push({
        date: date.toISOString().split("T")[0],
        profit: dayStats.houseProfit,
        games: dayStats.totalGames,
        bets: dayStats.totalBets
      });
    }

    return trendData;
  } catch (error) {
    console.error("获取收益趋势失败:", error);
    return [];
  }
}

module.exports = {
  getHouseStats,
  calculateGameStats,
  getUserStats,
  getTimeRangeStats,
  getGamePopularity,
  getProfitTrend
};
