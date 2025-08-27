const { connectToDatabase } = require("./simple-db");

module.exports = async (req, res) => {
  try {
    console.log("开始测试简单数据库连接");

    // 连接数据库
    const { db } = await connectToDatabase();
    console.log("数据库连接成功");

    // 创建测试集合（如果不存在）
    if (!await collectionExists(db, "test_collection")) {
      await db.createCollection("test_collection");
      console.log("创建测试集合成功");
    }

    // 插入测试文档
    const result = await db.collection("test_collection").insertOne({
      test: true,
      createdAt: new Date()
    });
    console.log("插入测试文档成功");

    // 查询测试文档
    const count = await db.collection("test_collection").countDocuments();
    console.log(`测试集合中有 ${count} 个文档`);

    // 返回成功响应
    res.status(200).json({
      success: true,
      message: "简单数据库测试成功",
      insertedId: result.insertedId,
      documentCount: count
    });
  } catch (error) {
    console.error("简单数据库测试错误:", error);
    res.status(500).json({
      success: false,
      error: "数据库操作失败",
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined
    });
  }
};

// 辅助函数：检查集合是否存在
async function collectionExists(db, collectionName) {
  const collections = await db.listCollections().toArray();
  return collections.some(c => c.name === collectionName);
}
