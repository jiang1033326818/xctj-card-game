const { connectToDatabase } = require("./db");

module.exports = async (req, res) => {
  try {
    console.log("API根路径被访问");

    // 检查请求路径
    const path = req.url || "/";
    console.log(`请求路径: ${path}`);

    if (path === "/test-db" || path === "/api/test-db") {
      console.log("测试数据库连接...");
      const { db } = await connectToDatabase();

      // 获取所有集合名称
      const collections = await db.listCollections().toArray();
      const collectionNames = collections.map(c => c.name);

      // 获取用户数量
      const userCount = await db.collection("users").countDocuments();

      return res.status(200).json({
        success: true,
        message: "数据库连接成功",
        collections: collectionNames,
        userCount: userCount,
        mongodbUri: process.env.MONGODB_URI ? "已设置" : "未设置"
      });
    }

    // 默认响应
    return res.status(200).json({
      message: "API服务器正在运行",
      endpoints: [
        "/api/login - 用户登录",
        "/api/logout - 用户登出",
        "/api/user - 获取用户信息",
        "/api/game/play - 进行游戏",
        "/api/game/history - 获取游戏历史",
        "/api/test-db - 测试数据库连接"
      ]
    });
  } catch (error) {
    console.error("API错误:", error);
    return res.status(500).json({
      success: false,
      error: "服务器错误",
      message: error.message,
      stack: error.stack
    });
  }
};
