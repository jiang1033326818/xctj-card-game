// 简化版API处理器 - 使用内存数据库
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { MongoClient } = require("mongodb");

// JWT密钥
const JWT_SECRET = process.env.JWT_SECRET || "xctj-card-game-secret-key-2024";

// 数据库连接
let db;
let client;

// 连接数据库
async function connectDB() {
  if (db) {
    return db;
  }

  try {
    // 如果有MongoDB URI环境变量，使用MongoDB
    if (process.env.MONGODB_URI) {
      console.log("连接MongoDB数据库...");
      client = new MongoClient(process.env.MONGODB_URI);
      await client.connect();
      db = client.db();
      console.log("MongoDB连接成功");
      return db;
    } else {
      // 本地开发使用内存数据库
      console.log("使用内存数据库模式（本地开发）");
      db = createMemoryDB();
      return db;
    }
  } catch (error) {
    console.error("数据库连接错误:", error);
    // 如果MongoDB连接失败，回退到内存数据库
    console.log("回退到内存数据库模式");
    db = createMemoryDB();
    return db;
  }
}

// 创建内存数据库模拟
function createMemoryDB() {
  let memoryDatabase = {
    users: [
      {
        username: "admin",
        password:
          "$2a$10$b.L8Ny3JLByTCDgdtlc53O5uA8.vyjY9QYCpirGzHZ2oVGoLRWKjm", // 密码: 068162
        is_admin: true,
        balance: 10000,
        created_at: new Date(),
      },
      {
        username: "test",
        password:
          "$2a$10$IS/22uJqZYLHBZ9oXZW1F.axJ5KgXgzCI4opLPax.YtXrEg6rLzq2", // 密码: test123
        is_admin: false,
        balance: 1000,
        created_at: new Date(),
      },
    ],
    game_records: [],
  };

  return {
    users: {
      findOne: async query => {
        return (
          memoryDatabase.users.find(user => {
            return Object.keys(query).every(key => user[key] === query[key]);
          }) || null
        );
      },
      find: async (query = {}, options = {}) => {
        let users = [...memoryDatabase.users];

        // 应用过滤
        if (Object.keys(query).length > 0) {
          users = users.filter(user => {
            return Object.keys(query).every(key => user[key] === query[key]);
          });
        }

        // 应用projection
        if (options.projection) {
          users = users.map(user => {
            const newUser = { ...user };
            Object.keys(options.projection).forEach(key => {
              if (options.projection[key] === 0) {
                delete newUser[key];
              }
            });
            return newUser;
          });
        }

        return users;
      },
      insertOne: async doc => {
        const newUser = { ...doc, _id: Date.now().toString() };
        memoryDatabase.users.push(newUser);
        return { insertedId: newUser._id };
      },
      updateOne: async (query, update) => {
        const index = memoryDatabase.users.findIndex(user => {
          return Object.keys(query).every(key => user[key] === query[key]);
        });
        if (index !== -1 && update.$set) {
          memoryDatabase.users[index] = {
            ...memoryDatabase.users[index],
            ...update.$set,
          };
        }
      },
    },
    game_records: {
      find: async (query = {}) => {
        let records = [...memoryDatabase.game_records];
        if (Object.keys(query).length > 0) {
          records = records.filter(record => {
            return Object.keys(query).every(key => record[key] === query[key]);
          });
        }
        return records.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
      },
      insertOne: async doc => {
        const newRecord = { ...doc, _id: Date.now().toString() };
        memoryDatabase.game_records.push(newRecord);
        return { insertedId: newRecord._id };
      },
    },
  };
}

// 从请求中获取用户信息
async function getUserFromRequest(req) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return null;
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const username = decoded.username;

    const user = await db.users.findOne({ username });
    return user;
  } catch (error) {
    console.error("获取用户信息错误:", error);
    return null;
  }
}

// 用户登录
async function loginUser(username, password) {
  try {
    const user = await db.users.findOne({ username });
    if (!user) {
      return { success: false, error: "用户名或密码错误" };
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return { success: false, error: "用户名或密码错误" };
    }

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

// 注册用户
async function registerUser(username, password) {
  try {
    const existingUser = await db.users.findOne({ username });
    if (existingUser) {
      return { success: false, error: "用户名已存在" };
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.users.insertOne({
      username,
      password: hashedPassword,
      is_admin: false,
      balance: 1000,
      created_at: new Date(),
    });

    return { success: true };
  } catch (error) {
    console.error("注册用户错误:", error);
    return { success: false, error: error.message };
  }
}

// 处理游戏逻辑
async function handleGame(req, res) {
  try {
    const { bets } = req.body;
    if (!bets || typeof bets !== "object") {
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

    if (totalAmount <= 0) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "押注金额必须大于0" }));
    }

    const user = await getUserFromRequest(req);
    if (!user) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "未授权" }));
    }

    if (user.balance < totalAmount) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "余额不足" }));
    }

    // 游戏逻辑
    const suits = ["hearts", "diamonds", "clubs", "spades", "joker"];
    const weights = [0.2, 0.2, 0.2, 0.2, 0.2];

    // 小丑特殊处理
    weights[4] = 0.01;

    const random = Math.random();
    let cumulative = 0;
    let result_suit = suits[0];

    for (let i = 0; i < weights.length; i++) {
      cumulative += weights[i];
      if (random < cumulative) {
        result_suit = suits[i];
        break;
      }
    }

    // 计算赢取金额
    let win_amount = 0;
    if (bets[result_suit] > 0) {
      if (result_suit === "joker") {
        win_amount = bets[result_suit] * 100;
      } else {
        win_amount = bets[result_suit] * 3.5;
      }
    }

    const new_balance = user.balance - totalAmount + win_amount;
    await db.users.updateOne(
      { username: user.username },
      { $set: { balance: new_balance } }
    );

    // 记录游戏结果
    await db.game_records.insertOne({
      username: user.username,
      bet_suit: JSON.stringify(bets),
      result_suit,
      amount: totalAmount,
      win_amount,
      created_at: new Date(),
    });

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

// 处理飞禽走兽游戏逻辑
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

    const user = await getUserFromRequest(req);
    if (!user) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "未授权" }));
    }

    if (user.balance < totalAmount) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "余额不足" }));
    }

    // 飞禽走兽游戏逻辑
    const animals = [
      { name: "lion", multiplier: 12, weight: 12.0 }, // 狮子 12% (3个块)
      { name: "panda", multiplier: 8, weight: 12.0 }, // 熊猫 12% (3个块)
      { name: "eagle", multiplier: 15, weight: 12.0 }, // 老鹰 12% (3个块)
      { name: "monkey", multiplier: 6, weight: 12.0 }, // 猴子 12% (3个块)
      { name: "rabbit", multiplier: 4, weight: 12.0 }, // 兔子 12% (3个块)
      { name: "peacock", multiplier: 10, weight: 12.0 }, // 孔雀 12% (3个块)
      { name: "pigeon", multiplier: 3, weight: 12.0 }, // 鸽子 12% (3个块)
      { name: "swallow", multiplier: 5, weight: 12.0 }, // 燕子 12% (3个块)
      { name: "gold_shark", multiplier: 100, weight: 2.0 }, // 金鲨 2% (1个块)
      { name: "silver_shark", multiplier: 24, weight: 2.0 }, // 银鲨 2% (1个块)
    ];

    // 选择结果动物
    const random = Math.random() * 100;
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
    await db.users.updateOne(
      { username: user.username },
      { $set: { balance: new_balance } }
    );

    // 记录游戏结果
    await db.game_records.insertOne({
      username: user.username,
      game_type: "animals",
      bet_data: JSON.stringify(bets),
      result_animal,
      amount: totalAmount,
      win_amount,
      created_at: new Date(),
    });

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

// 统一API处理函数
module.exports = async (req, res) => {
  // 连接数据库
  db = await connectDB();

  // 设置CORS头
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // 处理OPTIONS请求
  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    return res.end();
  }

  const path = req.url.split("?")[0];

  try {
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

      let records;
      if (user.is_admin) {
        records = await db.game_records.find({});
      } else {
        records = await db.game_records.find({ username: user.username });
      }

      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ success: true, records }));
    }

    // 飞禽走兽游戏
    if (path === "/api/animals-game" && req.method === "POST") {
      return handleAnimalsGame(req, res);
    }

    // 获取排行榜
    if (path === "/api/top_players" && req.method === "GET") {
      const user = await getUserFromRequest(req);
      if (!user) {
        res.statusCode = 401;
        res.setHeader("Content-Type", "application/json");
        return res.end(JSON.stringify({ error: "未授权" }));
      }

      const users = await db.users.find(
        { is_admin: false },
        { projection: { password: 0 } }
      );
      const topUsers = users.sort((a, b) => b.balance - a.balance).slice(0, 3);

      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ success: true, users: topUsers }));
    }

    // 管理员：获取所有用户
    if (path === "/api/admin/users" && req.method === "GET") {
      const user = await getUserFromRequest(req);
      if (!user || !user.is_admin) {
        res.statusCode = 401;
        res.setHeader("Content-Type", "application/json");
        return res.end(JSON.stringify({ error: "未授权" }));
      }

      const users = await db.users.find({}, { projection: { password: 0 } });
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ success: true, users }));
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
