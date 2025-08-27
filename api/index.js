module.exports = async (req, res) => {
  try {
    // 返回简单的成功响应
    res.status(200).json({
      message: "API服务器正在运行",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("API错误:", error);
    res.status(500).json({
      error: "服务器错误",
      message: error.message
    });
  }
};
