const { MongoClient } = require("mongodb");

module.exports = async (req, res) => {
  let client = null;
  
  try {
    // 获取MongoDB URI
    const uri = process.env.MONGODB_URI;
    
    // 检查URI是否设置
    if (!uri) {
      return res.status(500).json({
        error: "配置错误",
        message: "MONGODB_URI环境变量未设置"
      });
    }
    
    // 尝试连接
    console.log("尝试连接到MongoDB...");
    client = new MongoClient(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000 // 5秒超时
    });
    
    await client.connect();
    console.log("MongoDB连接成功");
    
    // 测试连接
    const db = client.db("game_db");
    await db.command({ ping: 1 });
    
    // 获取服务器信息
    const serverInfo = await db.command({ serverStatus: 1 });
    
    // 返回成功响应
    res.status(200).json({
      success: true,
      message: "数据库连接成功",
      version: serverInfo.version,
      uptime: serverInfo.uptime,
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