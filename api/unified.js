// 处理历史记录请求
async function handleHistory(req, res) {
  try {
    // 连接数据库
    const { db } = await connectToDatabase();

    // 获取当前用户
    const user = await getCurrentUser(req, db);

    if (!user) {
      return res.status(401).json({ error: "未登录" });
    }

    // 获取历史记录
    let query = {};

    // 如果不是管理员，只能查看自己的记录
    if (!user.is_admin) {
      query.userId = user._id;
    }

    const records = await db
      .collection("game_records")
      .find(query)
      .sort({ created_at: -1 })
      .limit(50)
      .toArray();

    // 返回历史记录
    res.status(200).json({
      success: true,
      records: records.map(r => ({
        id: r._id.toString(),
        username: r.username,
        bet_suit: r.bet_suit,
        result_suit: r.result_suit,
        amount: r.amount,
        win: r.win,
        win_amount: r.win_amount,
        created_at: r.created_at
      }))
    });
  } catch (error) {
    console.error("获取历史记录失败:", error);
    res.status(500).json({
      success: false,
      error: "获取历史记录失败",
      message: error.message
    });
  }
}

// 处理统计数据请求
async function handleStats(req, res) {
  try {
    // 连接数据库
    const { db } = await connectToDatabase();

    // 获取当前用户
    const user = await getCurrentUser(req, db);

    if (!user || !user.is_admin) {
      return res.status(403).json({ error: "权限不足" });
    }

    // 获取统计数据
    const stats = await db.collection("house_stats").findOne({ _id: 1 });

    if (!stats) {
      return res.status(404).json({ error: "统计数据不存在" });
    }

    // 返回统计数据
    res.status(200).json({
      success: true,
      totalGames: stats.totalGames,
      totalBets: stats.totalBets,
      totalPayouts: stats.totalPayouts,
      houseProfit: stats.houseProfit,
      heartsCount: stats.heartsCount,
      diamondsCount: stats.diamondsCount,
      clubsCount: stats.clubsCount,
      spadesCount: stats.spadesCount,
      jokerCount: stats.jokerCount,
      updatedAt: stats.updatedAt
    });
  } catch (error) {
    console.error("获取统计数据失败:", error);
    res.status(500).json({
      success: false,
      error: "获取统计数据失败",
      message: error.message
    });
  }
}

// 检查环境变量
async function handleCheckEnv(req, res) {
  const uri = process.env.MONGODB_URI || "未设置";
  const maskedUri =
    uri === "未设置" ? "未设置" : uri.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@");

  res.status(200).json({
    success: true,
    environment: {
      nodeVersion: process.version,
      mongodbUri: maskedUri,
      hasMongodbUri: !!process.env.MONGODB_URI
    }
  });
}

// 创建新用户
async function handleCreateUser(req, res) {
  console.log("开始处理创建用户请求");

  // 检查请求方法
  if (req.method !== "POST") {
    return res.status(405).json({ error: "方法不允许" });
  }

  try {
    // 解析请求体
    let body;
    if (typeof req.body === "object") {
      body = req.body;
    } else if (req.body) {
      try {
        body = JSON.parse(req.body);
      } catch (e) {
        console.error("解析请求体失败:", e);
        return res.status(400).json({ error: "无效的JSON格式" });
      }
    } else {
      // 尝试从请求流中读取
      const buffers = [];
      for await (const chunk of req) {
        buffers.push(chunk);
      }
      const data = Buffer.concat(buffers).toString();
      try {
        body = data ? JSON.parse(data) : {};
      } catch (e) {
        console.error("从请求流解析JSON失败:", e);
        return res.status(400).json({ error: "无效的JSON格式" });
      }
    }

    console.log("解析的请求体:", body);

    // 检查请求体
    if (!body || !body.username || !body.password) {
      return res.status(400).json({ error: "请求缺少必要字段" });
    }

    const { username, password } = body;
    const balance = body.balance || 1000;
    console.log(`尝试创建用户: ${username}`);

    // 连接数据库
    const { db } = await connectToDatabase();
    console.log("数据库连接成功");

    // 检查用户是否已存在
    const existingUser = await db.collection("users").findOne({ username });
    if (existingUser) {
      return res.status(409).json({ error: "用户名已存在" });
    }

    // 哈希密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户
    const result = await db.collection("users").insertOne({
      username,
      password: hashedPassword,
      balance,
      is_admin: false,
      created_at: new Date()
    });

    console.log("创建用户成功");

    // 返回成功响应
    res.status(201).json({
      success: true,
      message: "用户创建成功",
      userId: result.insertedId.toString()
    });
  } catch (error) {
    console.error("创建用户失败:", error);
    res.status(500).json({
      success: false,
      error: "创建用户失败",
      message: error.message
    });
  }
}
