const { connectToDatabase } = require("./db");

module.exports = async (req, res) => {
  try {
    console.log("测试数据库连接...");
    const { db } = await connectToDatabase();

    // 获取所有集合名称
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    // 获取用户数量
    const userCount = await db.collection("users").countDocuments();

    res.status(200).json({
      success: true,
      message: "数据库连接成功",
      collections: collectionNames,
      userCount: userCount,
      mongodbUri: process.env.MONGODB_URI ? "已设置" : "未设置"
    });
  } catch (error) {
    console.error("测试数据库连接错误:", error);
    res.status(500).json({
      success: false,
      error: "数据库连接失败",
      message: error.message,
      stack: error.stack
    });
  }
};
