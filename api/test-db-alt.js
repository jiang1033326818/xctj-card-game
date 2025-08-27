const { MongoClient } = require("mongodb");

module.exports = async (req, res) => {
  let client = null;

  try {
    // 获取MongoDB URI（优先使用请求中的URI，用于测试）
    let uri = process.env.MONGODB_URI;

    // 如果是POST请求，检查是否提供了自定义URI
    if (req.method === "POST" && req.body && req.body.uri) {
      uri = req.body.uri;
      console.log("使用自定义URI进行测试");
    }

    // 检查URI是否设置
    if (!uri) {
      return res.status(500).json({
        error: "配置错误",
        message: "MONGODB_URI环境变量未设置"
      });
    }

    // 打印URI的一部分用于调试（不显示密码）
    const uriParts = uri.split("@");
    const hostPart = uriParts.length > 1 ? uriParts[1] : "(无法解析)";
    console.log(`MongoDB URI主机部分: ${hostPart}`);

    // 尝试连接，使用最简单的选项
    console.log("尝试连接到MongoDB...");
    client = new MongoClient(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
      // 不使用SSL选项
    });

    await client.connect();
    console.log("MongoDB连接成功");

    // 测试连接
    const db = client.db("game_db");
    await db.command({ ping: 1 });

    // 返回成功响应
    res.status(200).json({
      success: true,
      message: "数据库连接成功",
      host: hostPart,
      mongodbUri: "已设置"
    });
  } catch (error) {
    console.error("数据库连接错误:", error);

    // 返回错误响应
    res.status(500).json({
      success: false,
      error: "数据库连接失败",
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined
    });
  } finally {
    // 关闭连接
    if (client) {
      try {
        await client.close();
        console.log("MongoDB连接已关闭");
      } catch (e) {
        console.error("关闭MongoDB连接时出错:", e);
      }
    }
  }
};
