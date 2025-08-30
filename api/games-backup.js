// 游戏逻辑模块
const { connectDB, getDB } = require("./database");
const { getUserFromRequest, updateUserBalance, getAllCachedUsers } = require("./auth");

/**
 * 处理喜从天降游戏
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 */
async function handleGame(req, res) {
  try {
    console.log("开始处理喜从天降游戏请求");
    console.log("请求体:", req.body);
    
    const { bets } = req.body;
    if (!bets || typeof bets !== "object") {
      console.log("无效的请求参数:", bets);
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "无效的请求参数" }));
    }

    let totalAmount = 0;
    for (const suit in bets) {
      if (bets[suit] > 0) {
        totalAmount += bets[suit];
      }
    }
    console.log("总押注金额:", totalAmount);

    if (totalAmount <= 0) {
      console.log("押注金额必须大于0");
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "押注金额必须大于0" }));
    }

    console.log("获取用户信息");
    const user = await getUserFromRequest(req).catch(err => {
      console.log("用户认证失败:", err.message);
      return null;
    });
    
    if (!user) {
      console.log("用户未授权");
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "未授权" }));
    }
    console.log("用户信息:", { username: user.username, balance: user.balance });

    if (user.balance < totalAmount) {
      console.log("用户余额不足:", { balance: user.balance, need: totalAmount });
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "余额不足" }));
    }

    console.log("开始游戏逻辑处理");
    // 游戏逻辑 - 喜从天降
    const suits = [
      { name: "hearts", weight: 24.1 },    // 红桃 24.1%
      { name: "diamonds", weight: 24.1 },  // 方块 24.1%
      { name: "clubs", weight: 24.1 },     // 梅花 24.1%
      { name: "spades", weight: 24.1 },    // 黑桃 24.1%
      { name: "joker", weight: 3.6 },      // 小丑 3.6%
    ];

    // 选择结果花色
    const totalWeight = suits.reduce((sum, suit) => sum + suit.weight, 0);
    const random = Math.random() * totalWeight;
    let cumulative = 0;
    let result_suit = suits[0].name;

    for (let i = 0; i < suits.length; i++) {
      cumulative += suits[i].weight;
      if (random < cumulative) {
        result_suit = suits[i].name;
        break;
      }
    }
    console.log("游戏结果:", result_suit);

    // 计算赢取金额
    let win_amount = 0;
    if (bets[result_suit] > 0) {
      if (result_suit === "joker") {
        win_amount = bets[result_suit] * 20;
      } else {
        win_amount = bets[result_suit] * 3.5;
      }
    }
    console.log("赢取金额:", win_amount);

    const new_balance = user.balance - totalAmount + win_amount;
    console.log("新余额:", new_balance);
    
    // 使用新的余额更新函数
    updateUserBalance(user.username, new_balance);
    console.log("余额更新成功:", { username: user.username, new_balance });

    // 记录游戏结果（尝试记录到数据库）
    try {
      const database = getDB() || (await connectDB());
      await database.game_records.insertOne({
        username: user.username,
        bet_suit: JSON.stringify(bets),
        result_suit,
        amount: totalAmount,
        win_amount,
        created_at: new Date(),
      });
      console.log("游戏结果记录成功");
    } catch (recordError) {
      console.log("游戏结果记录失败:", recordError.message);
    }

    const result = {
      result_suit,
      win_amount,
      new_balance,
      total_bet: totalAmount,
    };
    console.log("准备返回结果:", result);

    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(result));
  } catch (error) {
    console.error("游戏错误:", error);
    console.error("错误堆栈:", error.stack);
    console.error("错误类型:", error.name);
    console.error("错误消息:", error.message);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "服务器错误" }));
  }
}

/**
 * 处理飞禽走兽游戏
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 */
async function handleAnimalsGame(req, res) {
  try {
    const { bets } = req.body;
    if (!bets || typeof bets !== "object") {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "无效的请求参数" }));
    }

    let totalAmount = 0;
    for (const animal in bets) {
      if (bets[animal] > 0) {
        totalAmount += bets[animal];
      }
    }

    if (totalAmount <= 0) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "押注金额必须大于0" }));
    }

    const user = await getUserFromRequest(req).catch(err => {
      console.log("用户认证失败:", err.message);
      return null;
    });
    
    if (!user) {
      console.log("用户未授权");
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "未授权" }));
    }
    console.log("用户信息:", { username: user.username, balance: user.balance });

    if (user.balance < totalAmount) {
      console.log("用户余额不足:", { balance: user.balance, need: totalAmount });
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "余额不足" }));
    }

    // 飞禽走兽游戏逻辑 - 重新平衡概率确保庄家优势
    const animals = [
      { name: "lion", multiplier: 12, weight: 7.1 },     // 狮子 7.1% (期望: 0.071×12≈0.85)
      { name: "panda", multiplier: 8, weight: 10.6 },    // 熊猫 10.6% (期望: 0.106×8≈0.85)
      { name: "eagle", multiplier: 15, weight: 5.7 },    // 老鹰 5.7% (期望: 0.057×15≈0.85)
      { name: "monkey", multiplier: 6, weight: 14.2 },   // 猴子 14.2% (期望: 0.142×6≈0.85)
      { name: "rabbit", multiplier: 4, weight: 21.2 },   // 兔子 21.2% (期望: 0.212×4≈0.85)
      { name: "peacock", multiplier: 10, weight: 8.5 },  // 孔雀 8.5% (期望: 0.085×10≈0.85)
      { name: "pigeon", multiplier: 3, weight: 28.3 },   // 鸽子 28.3% (期望: 0.283×3≈0.85)
      { name: "swallow", multiplier: 5, weight: 17.0 },  // 燕子 17.0% (期望: 0.17×5≈0.85)
      { name: "gold_shark", multiplier: 100, weight: 0.8 }, // 金鲨 0.8% (期望: 0.008×100=0.8)
      { name: "silver_shark", multiplier: 24, weight: 3.5 }, // 银鲨 3.5% (期望: 0.035×24≈0.84)
    ];

    // 选择结果动物 - 使用重新平衡的概率
    const totalWeight = animals.reduce((sum, animal) => sum + animal.weight, 0);
    const random = Math.random() * totalWeight;
    let cumulative = 0;
    let result_animal = animals[0].name;

    for (let i = 0; i < animals.length; i++) {
      cumulative += animals[i].weight;
      if (random < cumulative) {
        result_animal = animals[i].name;
        break;
      }
    }

    // 计算赢取金额
    let win_amount = 0;
    let net_win = 0; // 净赢金额

    // 定义飞禽和走兽分类
    const birds = ["eagle", "swallow", "pigeon", "peacock"];
    const beasts = ["lion", "monkey", "panda", "rabbit"];

    console.log("中奖动物:", result_animal);
    console.log("押注数据:", bets);

    // 直接动物压注结算
    if (bets[result_animal] > 0) {
      const animal = animals.find(a => a.name === result_animal);
      win_amount += Math.floor(bets[result_animal] * animal.multiplier);
    }

    // 飞禽走兽大类压注结算（鲨鱼不给赔付）
    if (result_animal !== "gold_shark" && result_animal !== "silver_shark") {
      if (birds.includes(result_animal) && bets["birds"] > 0) {
        const birdWin = Math.floor(bets["birds"] * 2);
        win_amount += birdWin; // 飞禽赔率 1:2
      }
      if (beasts.includes(result_animal) && bets["beasts"] > 0) {
        const beastWin = Math.floor(bets["beasts"] * 2);
        win_amount += beastWin; // 走兽赔率 1:2
      }
    }

    net_win = win_amount - totalAmount; // 赢得金额 - 总投注 = 净赢

    const new_balance = user.balance + net_win;
    
    // 使用新的余额更新函数
    updateUserBalance(user.username, new_balance);
    console.log("余额更新成功:", { username: user.username, new_balance });
    
    // 记录游戏结果（尝试记录到数据库）
    try {
      const database = getDB() || (await connectDB());
      await database.game_records.insertOne({
        username: user.username,
        game_type: "animals",
        bet_data: JSON.stringify(bets),
        result_animal,
        amount: totalAmount,
        win_amount,
        created_at: new Date(),
      });
      console.log("游戏结果记录成功");
    } catch (recordError) {
      console.log("游戏结果记录失败:", recordError.message);
    }

    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        result_animal,
        win_amount,
        net_win,
        new_balance,
        total_bet: totalAmount,
      })
    );
  } catch (error) {
    console.error("飞禽走兽游戏错误:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "服务器错误" }));
  }
}

/**
 * 获取游戏记录
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 */
async function getGameRecords(req, res) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "未授权" }));
    }

    let records;
    // 确保db已初始化
    const database = getDB() || (await connectDB());
    if (user.is_admin) {
      records = await database.game_records.find({});
    } else {
      records = await database.game_records.find({ username: user.username });
    }

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
  handleGame,
  handleAnimalsGame,
  getGameRecords,
  getTopPlayers
};