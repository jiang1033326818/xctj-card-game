// 导入所需模块
const { MongoClient } = require("mongodb");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// 数据库配置
const uri = process.env.MONGODB_URI;
const dbName = "card_game";
const usersCollection = "users";
const gameRecordsCollection = "game_records";

// JWT密钥
const JWT_SECRET = process.env.JWT_SECRET || "xctj-card-game-secret-key-2024";

// 内存数据库模拟（本地开发用）
let memoryDatabase = {
  users: [
    {
      username: "admin",
      password: "$2a$10$N9qo8uLOickgx2ZMRZoMye/aZ.9Q4b.zfZa.FzIqZcgtxgp8P1nOa", // 密码: 068162
      is_admin: true,
      balance: 10000,
      created_at: new Date(),
    },
    {
      username: "test",
      password: "$2a$10$H3A3TsRpO7qQ5MgPHZ.XBuV1QPbGfW9b7yZ8Xo4.Q3MkGQ1Vxz.xa", // 密码: test123
      is_admin: false,
      balance: 1000,
      created_at: new Date(),
    },
  ],
  game_records: [],
};

// 连接到数据库
async function connectToDatabase() {
  if (!uri) {
    // 本地开发模式，使用内存数据库
    console.log("使用内存数据库模式（本地开发）");
    return {
      collection: name => {
        const collectionName =
          name === usersCollection ? "users" : "game_records";
        return {
          findOne: async query => {
            return (
              memoryDatabase[collectionName].find(item => {
                return Object.keys(query).every(
                  key => item[key] === query[key]
                );
              }) || null
            );
          },
          find: query => ({
            sort: () => ({
              limit: n => ({
                toArray: async () => {
                  let filtered = memoryDatabase[collectionName];
                  if (query && Object.keys(query).length > 0) {
                    filtered = filtered.filter(item => {
                      return Object.keys(query).every(
                        key => item[key] === query[key]
                      );
                    });
                  }
                  return filtered.slice(0, n);
                },
              }),
              toArray: async () => {
                let filtered = memoryDatabase[collectionName];
                if (query && Object.keys(query).length > 0) {
                  filtered = filtered.filter(item => {
                    return Object.keys(query).every(
                      key => item[key] === query[key]
                    );
                  });
                }
                return filtered.sort(
                  (a, b) => new Date(b.created_at) - new Date(a.created_at)
                );
              },
            }),
            toArray: async () => {
              let filtered = memoryDatabase[collectionName];
              if (query && Object.keys(query).length > 0) {
                filtered = filtered.filter(item => {
                  return Object.keys(query).every(
                    key => item[key] === query[key]
                  );
                });
              }
              return filtered;
            },
          }),
          insertOne: async doc => {
            memoryDatabase[collectionName].push({
              ...doc,
              _id: Date.now().toString(),
            });
            return { insertedId: Date.now().toString() };
          },
          updateOne: async (query, update) => {
            const index = memoryDatabase[collectionName].findIndex(item => {
              return Object.keys(query).every(key => item[key] === query[key]);
            });
            if (index !== -1) {
              memoryDatabase[collectionName][index] = {
                ...memoryDatabase[collectionName][index],
                ...update.$set,
              };
            }
          },
        };
      },
    };
  }

  // 生产环境，使用MongoDB
  try {
    const client = new MongoClient(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    await client.connect();
    return client.db(dbName);
  } catch (error) {
    console.error("数据库连接失败:", error.message);
    throw error;
  }
}

// 从请求中获取用户信息
async function getUserFromRequest(req) {
  try {
    // 从请求头中获取token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return null;
    }

    // 验证token
    const decoded = jwt.verify(token, JWT_SECRET);
    const username = decoded.username;

    // 从数据库获取用户信息
    const db = await connectToDatabase();
    const user = await db.collection(usersCollection).findOne({ username });
    return user;
  } catch (error) {
    console.error("获取用户信息错误:", error);
    return null;
  }
}

// 初始化数据库
async function initializeDatabase() {
  try {
    const db = await connectToDatabase();

    // 检查管理员用户是否存在
    const adminExists = await db
      .collection(usersCollection)
      .findOne({ username: "admin" });
    if (!adminExists) {
      // 创建管理员用户
      const hashedPassword = await bcrypt.hash("068162", 10);
      await db.collection(usersCollection).insertOne({
        username: "admin",
        password: hashedPassword,
        is_admin: true,
        balance: 10000,
        created_at: new Date(),
      });
      console.log("管理员用户已创建");
    }

    // 检查测试用户是否存在
    const testUserExists = await db
      .collection(usersCollection)
      .findOne({ username: "test" });
    if (!testUserExists) {
      // 创建测试用户
      const hashedPassword = await bcrypt.hash("test123", 10);
      await db.collection(usersCollection).insertOne({
        username: "test",
        password: hashedPassword,
        is_admin: false,
        balance: 1000,
        created_at: new Date(),
      });
      console.log("测试用户已创建");
    }

    return { success: true, message: "数据库初始化成功" };
  } catch (error) {
    console.error("数据库初始化错误:", error);
    return { success: false, error: error.message };
  }
}

// 注册用户
async function registerUser(username, password) {
  try {
    const db = await connectToDatabase();

    // 检查用户名是否已存在
    const existingUser = await db
      .collection(usersCollection)
      .findOne({ username });
    if (existingUser) {
      return { success: false, error: "用户名已存在" };
    }

    // 创建新用户
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.collection(usersCollection).insertOne({
      username,
      password: hashedPassword,
      is_admin: false,
      balance: 1000, // 初始余额
      created_at: new Date(),
    });

    return { success: true };
  } catch (error) {
    console.error("注册用户错误:", error);
    return { success: false, error: error.message };
  }
}

// 用户登录
async function loginUser(username, password) {
  try {
    const db = await connectToDatabase();

    // 查找用户
    const user = await db.collection(usersCollection).findOne({ username });
    if (!user) {
      return { success: false, error: "用户名或密码错误" };
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return { success: false, error: "用户名或密码错误" };
    }

    // 生成JWT token
    const token = jwt.sign({ username: user.username }, JWT_SECRET, {
      expiresIn: "24h",
    });

    return {
      success: true,
      token,
      is_admin: user.is_admin,
    };
  } catch (error) {
    console.error("登录错误:", error);
    return { success: false, error: error.message };
  }
}

// 更新用户余额
async function updateUserBalance(username, balance) {
  try {
    const db = await connectToDatabase();
    await db
      .collection(usersCollection)
      .updateOne({ username }, { $set: { balance } });
    return true;
  } catch (error) {
    console.error("更新余额错误:", error);
    return false;
  }
}

// 记录游戏结果
async function recordGame(username, bet_suit, result_suit, amount, win_amount) {
  try {
    const db = await connectToDatabase();
    const record = {
      username,
      bet_suit,
      result_suit,
      amount,
      win_amount,
      created_at: new Date(),
    };
    await db.collection(gameRecordsCollection).insertOne(record);
    return true;
  } catch (error) {
    console.error("记录游戏结果错误:", error);
    return false;
  }
}

// 获取用户游戏记录
async function getUserGameRecords(username) {
  try {
    const db = await connectToDatabase();
    const records = await db
      .collection(gameRecordsCollection)
      .find({ username })
      .sort({ created_at: -1 })
      .toArray();
    return { success: true, records };
  } catch (error) {
    console.error("获取游戏记录错误:", error);
    return { success: false, error: error.message };
  }
}

// 获取所有游戏记录（管理员用）
async function getAllGameRecords() {
  try {
    const db = await connectToDatabase();
    const records = await db
      .collection(gameRecordsCollection)
      .find({})
      .sort({ created_at: -1 })
      .toArray();
    return { success: true, records };
  } catch (error) {
    console.error("获取所有游戏记录错误:", error);
    return { success: false, error: error.message };
  }
}

// 获取系统统计数据
async function getHouseStats() {
  try {
    const db = await connectToDatabase();

    // 获取所有游戏记录
    const records = await db
      .collection(gameRecordsCollection)
      .find({})
      .toArray();

    if (records.length === 0) {
      return {
        success: true,
        stats: {
          totalGames: 0,
          totalBets: 0,
          totalPayouts: 0,
          houseProfit: 0,
          heartsCount: 0,
          diamondsCount: 0,
          clubsCount: 0,
          spadesCount: 0,
          jokerCount: 0,
        },
      };
    }

    // 计算统计数据
    let totalGames = records.length;
    let totalBets = 0;
    let totalPayouts = 0;
    let heartsCount = 0;
    let diamondsCount = 0;
    let clubsCount = 0;
    let spadesCount = 0;
    let jokerCount = 0;

    records.forEach(record => {
      totalBets += record.amount || 0;
      totalPayouts += record.win_amount || 0;

      // 统计各花色出现次数
      switch (record.result_suit) {
        case "hearts":
          heartsCount++;
          break;
        case "diamonds":
          diamondsCount++;
          break;
        case "clubs":
          clubsCount++;
          break;
        case "spades":
          spadesCount++;
          break;
        case "joker":
          jokerCount++;
          break;
      }
    });

    const houseProfit = totalBets - totalPayouts;

    return {
      success: true,
      stats: {
        totalGames,
        totalBets,
        totalPayouts,
        houseProfit,
        heartsCount,
        diamondsCount,
        clubsCount,
        spadesCount,
        jokerCount,
      },
    };
  } catch (error) {
    console.error("获取系统统计错误:", error);
    return { success: false, error: error.message };
  }
}

// 获取所有用户
async function getAllUsers() {
  try {
    const db = await connectToDatabase();
    const users = await db
      .collection(usersCollection)
      .find({}, { projection: { password: 0 } })
      .toArray();
    return { success: true, users };
  } catch (error) {
    console.error("获取用户列表错误:", error);
    return { success: false, error: error.message };
  }
}

// 更新用户信息
async function updateUser(username, updates) {
  try {
    const db = await connectToDatabase();
    await db
      .collection(usersCollection)
      .updateOne({ username }, { $set: updates });
    return { success: true };
  } catch (error) {
    console.error("更新用户信息错误:", error);
    return { success: false, error: error.message };
  }
}

// 加权随机函数
function weightedRandom(items, weights) {
  const cumulativeWeights = [];
  let sum = 0;

  for (let i = 0; i < weights.length; i++) {
    sum += weights[i];
    cumulativeWeights[i] = sum;
  }

  const random = Math.random() * sum;

  for (let i = 0; i < cumulativeWeights.length; i++) {
    if (random < cumulativeWeights[i]) {
      return items[i];
    }
  }

  return items[0]; // 默认返回第一个
}

// 处理游戏请求
async function handleGame(req, res) {
  try {
    // 验证请求体
    const { bets } = req.body;
    if (!bets || typeof bets !== "object") {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "无效的请求参数" }));
    }

    // 计算总押注金额
    let totalAmount = 0;
    for (const suit in bets) {
      if (bets[suit] > 0) {
        totalAmount += bets[suit];
      }
    }

    if (totalAmount <= 0) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "押注金额必须大于0" }));
    }

    // 获取用户信息
    const user = await getUserFromRequest(req);
    if (!user) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "未授权" }));
    }

    // 检查余额
    if (user.balance < totalAmount) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "余额不足" }));
    }

    // 随机生成结果，调整概率以增加庄家优势
    const suits = ["hearts", "diamonds", "clubs", "spades", "joker"];
    // 调整权重，降低玩家押注较多花色的出现概率
    let weights = [0.2, 0.2, 0.2, 0.2, 0.2]; // 基础权重

    // 根据押注情况调整权重，押注越多的花色出现概率越低
    const totalBetAmount = totalAmount;
    suits.forEach((suit, index) => {
      if (bets[suit] > 0) {
        const betRatio = bets[suit] / totalBetAmount;
        weights[index] = weights[index] * (1 - betRatio * 0.3); // 降低押注花色的权重
      }
    });

    // 小丑特殊处理，保持较低概率
    // 小丑特殊处理，保持极低概率（100倍赔率）
    weights[4] = 0.01; // 小丑固定1%概率

    const result_suit = weightedRandom(suits, weights);

    // 计算赢取金额 - 只计算中奖花色的赔付
    let win_amount = 0;
    if (bets[result_suit] > 0) {
      if (result_suit === "joker") {
        win_amount = bets[result_suit] * 100; // 小丑100倍赔率
      } else {
        win_amount = bets[result_suit] * 3.5; // 其他花色3.5倍赔率
      }
    }

    // 更新余额：扣除所有押注，加上赢取金额
    const new_balance = user.balance - totalAmount + win_amount;
    await updateUserBalance(user.username, new_balance);

    // 记录游戏结果
    await recordGame(
      user.username,
      JSON.stringify(bets),
      result_suit,
      totalAmount,
      win_amount
    );

    // 返回结果
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        result_suit,
        win_amount,
        new_balance,
        total_bet: totalAmount,
      })
    );
  } catch (error) {
    console.error("游戏错误:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "服务器错误" }));
  }
}

// 处理更新用户余额请求
async function handleUpdateBalance(req, res) {
  try {
    // 验证请求体
    const { username, balance } = req.body;
    if (!username || balance === undefined || isNaN(balance)) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "无效的请求参数" }));
    }

    // 获取管理员信息
    const admin = await getUserFromRequest(req);
    if (!admin || !admin.is_admin) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "未授权" }));
    }

    // 更新用户余额
    const result = await updateUser(username, { balance: Number(balance) });
    if (!result.success) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: result.error }));
    }

    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: true }));
  } catch (error) {
    console.error("更新余额错误:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "服务器错误" }));
  }
}

// 统一API处理函数
module.exports = async (req, res) => {
  // 设置CORS头
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // 处理OPTIONS请求
  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    return res.end();
  }

  // 获取路径
  const path = req.url.split("?")[0];

  // 根据路径和方法处理请求
  try {
    // 初始化数据库
    if (path === "/api/init_db" && req.method === "POST") {
      const result = await initializeDatabase();
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify(result));
    }

    // 注册
    if (path === "/api/register" && req.method === "POST") {
      const { username, password } = req.body;
      if (!username || !password) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        return res.end(JSON.stringify({ error: "用户名和密码不能为空" }));
      }
      const result = await registerUser(username, password);
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify(result));
    }

    // 登录
    if (path === "/api/login" && req.method === "POST") {
      const { username, password } = req.body;
      if (!username || !password) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        return res.end(JSON.stringify({ error: "用户名和密码不能为空" }));
      }
      const result = await loginUser(username, password);
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify(result));
    }

    // 获取当前用户信息
    if (path === "/api/user" && req.method === "GET") {
      const user = await getUserFromRequest(req);
      if (!user) {
        res.statusCode = 401;
        res.setHeader("Content-Type", "application/json");
        return res.end(JSON.stringify({ error: "未授权" }));
      }
      res.setHeader("Content-Type", "application/json");
      return res.end(
        JSON.stringify({
          username: user.username,
          is_admin: user.is_admin,
          balance: user.balance,
        })
      );
    }

    // 游戏
    if (path === "/api/game" && req.method === "POST") {
      return handleGame(req, res);
    }

    // 获取游戏记录
    if (path === "/api/game_records" && req.method === "GET") {
      const user = await getUserFromRequest(req);
      if (!user) {
        res.statusCode = 401;
        res.setHeader("Content-Type", "application/json");
        return res.end(JSON.stringify({ error: "未授权" }));
      }

      // 如果是管理员，返回所有记录；否则只返回用户自己的记录
      let result;
      if (user.is_admin) {
        result = await getAllGameRecords();
      } else {
        result = await getUserGameRecords(user.username);
      }
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify(result));
    }

    // 管理员：获取系统统计
    if (path === "/api/house_stats" && req.method === "GET") {
      const user = await getUserFromRequest(req);
      if (!user || !user.is_admin) {
        res.statusCode = 401;
        res.setHeader("Content-Type", "application/json");
        return res.end(JSON.stringify({ error: "未授权" }));
      }
      const result = await getHouseStats();
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify(result));
    }

    // 管理员：获取所有用户
    if (path === "/api/admin/users" && req.method === "GET") {
      const user = await getUserFromRequest(req);
      if (!user || !user.is_admin) {
        res.statusCode = 401;
        res.setHeader("Content-Type", "application/json");
        return res.end(JSON.stringify({ error: "未授权" }));
      }
      const result = await getAllUsers();
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify(result));
    }

    // 公共API：获取赌王排行榜（前三名）
    if (path === "/api/top_players" && req.method === "GET") {
      const user = await getUserFromRequest(req);
      if (!user) {
        res.statusCode = 401;
        res.setHeader("Content-Type", "application/json");
        return res.end(JSON.stringify({ error: "未授权" }));
      }

      try {
        const db = await connectToDatabase();
        const users = await db
          .collection(usersCollection)
          .find({ is_admin: false }, { projection: { password: 0 } })
          .sort({ balance: -1 })
          .limit(3)
          .toArray();

        res.setHeader("Content-Type", "application/json");
        return res.end(JSON.stringify({ success: true, users }));
      } catch (error) {
        console.error("获取赌王排行榜错误:", error);
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        return res.end(JSON.stringify({ error: "服务器错误" }));
      }
    }

    // 管理员：更新用户余额
    if (path === "/api/update_balance" && req.method === "POST") {
      return handleUpdateBalance(req, res);
    }

    // 404 - 路径不存在
    res.statusCode = 404;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ error: "路径不存在" }));
  } catch (error) {
    console.error("API错误:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ error: "服务器错误" }));
  }
};
