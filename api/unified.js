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
      const mongoDb = client.db();
      console.log("MongoDB连接成功");

      // 包装MongoDB为统一接口
      db = createMongoWrapper(mongoDb);
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

// 包装MongoDB为统一接口
function createMongoWrapper(mongoDb) {
  return {
    users: {
      findOne: async query => {
        return await mongoDb.collection("users").findOne(query);
      },
      find: async (query = {}, options = {}) => {
        return await mongoDb.collection("users").find(query, options).toArray();
      },
      insertOne: async doc => {
        return await mongoDb.collection("users").insertOne(doc);
      },
      updateOne: async (query, update) => {
        return await mongoDb.collection("users").updateOne(query, update);
      },
    },
    game_records: {
      find: async (query = {}) => {
        const records = await mongoDb
          .collection("game_records")
          .find(query)
          .sort({ created_at: -1 })
          .toArray();
        return records;
      },
      insertOne: async doc => {
        return await mongoDb.collection("game_records").insertOne(doc);
      },
    },
  };
}

// 初始化数据库（如果是空的MongoDB）
async function initializeDatabase(database) {
  try {
    // 检查是否已有用户
    const existingUsers = await database.users.find({});
    if (existingUsers.length === 0) {
      console.log("数据库为空，初始化默认用户...");

      // 创建admin用户
      const adminPassword = await bcrypt.hash("068162", 10);
      await database.users.insertOne({
        username: "admin",
        password: adminPassword,
        is_admin: true,
        balance: 10000,
        created_at: new Date(),
      });

      // 创建test用户
      const testPassword = await bcrypt.hash("test123", 10);
      await database.users.insertOne({
        username: "test",
        password: testPassword,
        is_admin: false,
        balance: 1000,
        created_at: new Date(),
      });

      console.log("默认用户创建完成：admin (密码: 068162), test (密码: test123)");
    }
  } catch (error) {
    console.error("初始化数据库失败:", error);
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

    // 确保db已初始化
    const database = db || (await connectDB());
    const user = await database.users.findOne({ username });
    return user;
  } catch (error) {
    console.error("获取用户信息错误:", error);
    return null;
  }
}

// 用户登录
async function loginUser(username, password) {
  try {
    console.log("loginUser函数开始执行", { username });

    // 确保db已初始化
    console.log("检查数据库连接:", { db: db ? "exists" : "null" });
    const database = db || (await connectDB());
    console.log("数据库连接已准备好");

    console.log("查找用户:", username);
    const user = await database.users.findOne({ username });
    console.log("用户查找结果:", user ? "找到用户" : "未找到用户");

    if (!user) {
      return { success: false, error: "用户名或密码错误" };
    }

    console.log("验证密码");
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log("密码验证结果:", isPasswordValid);

    if (!isPasswordValid) {
      return { success: false, error: "用户名或密码错误" };
    }

    console.log("生成JWT token");
    const token = jwt.sign({ username: user.username }, JWT_SECRET, {
      expiresIn: "24h",
    });

    console.log("登录成功");
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
    // 确保db已初始化
    const database = db || (await connectDB());
    const existingUser = await database.users.findOne({ username });
    if (existingUser) {
      return { success: false, error: "用户名已存在" };
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await database.users.insertOne({
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
    const database = db || (await connectDB());
    await database.users.updateOne(
      { username },
      { $set: { balance: Number(balance) } }
    );

    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: true }));
  } catch (error) {
    console.error("更新余额错误:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "服务器错误" }));
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
    // 确保db已初始化
    const database = db || (await connectDB());
    await database.users.updateOne(
      { username: user.username },
      { $set: { balance: new_balance } }
    );

    // 记录游戏结果
    await database.game_records.insertOne({
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
    // 确保db已初始化
    const database = db || (await connectDB());
    await database.users.updateOne(
      { username: user.username },
      { $set: { balance: new_balance } }
    );

    // 记录游戏结果
    await database.game_records.insertOne({
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
      console.log("登录请求开始");
      const { username, password } = req.body;
      console.log("请求参数:", { username, password: password ? "***" : "empty" });

      if (!username || !password) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        return res.end(JSON.stringify({ error: "用户名和密码不能为空" }));
      }

      console.log("准备调用loginUser函数");
      const result = await loginUser(username, password);
      console.log("登录结果:", result);

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
      // 确保db已初始化
      const database = db || (await connectDB());
      if (user.is_admin) {
        records = await database.game_records.find({});
      } else {
        records = await database.game_records.find({ username: user.username });
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

      // 确保db已初始化
      const database = db || (await connectDB());
      const users = await database.users.find(
        { is_admin: false },
        { projection: { password: 0 } }
      );
      const topUsers = users.sort((a, b) => b.balance - a.balance).slice(0, 3);

      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ success: true, users: topUsers }));
    }

    // 设置用户为管理员（仅限admin用户首次设置）
    if (path === "/api/set-admin" && req.method === "POST") {
      const { username } = req.body;
      if (username !== "admin") {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        return res.end(JSON.stringify({ error: "只能设置admin用户为管理员" }));
      }

      try {
        // 确保db已初始化
        const database = db || (await connectDB());
        await database.users.updateOne(
          { username: "admin" },
          { $set: { is_admin: true } }
        );
        
        res.setHeader("Content-Type", "application/json");
        return res.end(JSON.stringify({ success: true, message: "admin用户已设置为管理员" }));
      } catch (error) {
        console.error("设置管理员失败:", error);
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        return res.end(JSON.stringify({ error: "设置管理员失败" }));
      }
    }

    // 管理员：获取所有用户
    if (path === "/api/admin/users" && req.method === "GET") {
      const user = await getUserFromRequest(req);
      if (!user || !user.is_admin) {
        res.statusCode = 401;
        res.setHeader("Content-Type", "application/json");
        return res.end(JSON.stringify({ error: "未授权" }));
      }

      // 确保db已初始化
      const database = db || (await connectDB());
      const users = await database.users.find(
        {},
        { projection: { password: 0 } }
      );
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ success: true, users }));
    }

    // 管理员：更新用户余额
    if (path === "/api/update_balance" && req.method === "POST") {
      return handleUpdateBalance(req, res);
    }

    // 获取统计数据（按游戏类型分类）
    if (path === "/api/house_stats" && req.method === "GET") {
      const user = await getUserFromRequest(req);
      if (!user || !user.is_admin) {
        res.statusCode = 401;
        res.setHeader("Content-Type", "application/json");
        return res.end(JSON.stringify({ error: "未授权" }));
      }

      try {
        // 确保db已初始化
        const database = db || (await connectDB());
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
          }
        };

        // 遍历游戏记录
        records.forEach(record => {
          const amount = record.amount || 0;
          const winAmount = record.win_amount || 0;
          
          // 总体统计
          stats.totalBets += amount;
          stats.totalPayouts += winAmount;
          
          // 按游戏类型分类
          if (record.game_type === 'animals') {
            // 飞禽走兽游戏
            stats.animalsStats.totalGames++;
            stats.animalsStats.totalBets += amount;
            stats.animalsStats.totalPayouts += winAmount;
            
            // 统计动物结果
            switch (record.result_animal) {
              case 'lion': stats.animalsStats.lionCount++; break;
              case 'panda': stats.animalsStats.pandaCount++; break;
              case 'eagle': stats.animalsStats.eagleCount++; break;
              case 'monkey': stats.animalsStats.monkeyCount++; break;
              case 'rabbit': stats.animalsStats.rabbitCount++; break;
              case 'peacock': stats.animalsStats.peacockCount++; break;
              case 'pigeon': stats.animalsStats.pigeonCount++; break;
              case 'swallow': stats.animalsStats.swallowCount++; break;
              case 'gold_shark': stats.animalsStats.goldSharkCount++; break;
              case 'silver_shark': stats.animalsStats.silverSharkCount++; break;
            }
          } else {
            // 喜从天降游戏（默认或旧数据）
            stats.xctjStats.totalGames++;
            stats.xctjStats.totalBets += amount;
            stats.xctjStats.totalPayouts += winAmount;
            
            // 统计花色结果
            switch (record.result_suit) {
              case 'hearts': stats.xctjStats.heartsCount++; break;
              case 'diamonds': stats.xctjStats.diamondsCount++; break;
              case 'clubs': stats.xctjStats.clubsCount++; break;
              case 'spades': stats.xctjStats.spadesCount++; break;
              case 'joker': stats.xctjStats.jokerCount++; break;
            }
          }
        });

        // 计算盈利
        stats.houseProfit = stats.totalBets - stats.totalPayouts;
        stats.xctjStats.houseProfit = stats.xctjStats.totalBets - stats.xctjStats.totalPayouts;
        stats.animalsStats.houseProfit = stats.animalsStats.totalBets - stats.animalsStats.totalPayouts;

        // 计算最赚钱游戏
        const gameComparison = [
          {
            name: "喜从天降",
            key: "xctj",
            profit: stats.xctjStats.houseProfit,
            games: stats.xctjStats.totalGames,
            bets: stats.xctjStats.totalBets,
            avgProfitPerGame: stats.xctjStats.totalGames > 0 ? (stats.xctjStats.houseProfit / stats.xctjStats.totalGames).toFixed(2) : 0
          },
          {
            name: "飞禽走兽", 
            key: "animals",
            profit: stats.animalsStats.houseProfit,
            games: stats.animalsStats.totalGames,
            bets: stats.animalsStats.totalBets,
            avgProfitPerGame: stats.animalsStats.totalGames > 0 ? (stats.animalsStats.houseProfit / stats.animalsStats.totalGames).toFixed(2) : 0
          }
        ];
        
        // 按总盈利排序找出最赚钱游戏
        const mostProfitableGame = gameComparison.reduce((prev, current) => {
          return (current.profit > prev.profit) ? current : prev;
        });
        
        // 按场均盈利排序找出效率最高游戏
        const mostEfficientGame = gameComparison.reduce((prev, current) => {
          return (parseFloat(current.avgProfitPerGame) > parseFloat(prev.avgProfitPerGame)) ? current : prev;
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
