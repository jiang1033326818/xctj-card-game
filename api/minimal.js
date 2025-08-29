// 最小化API端点
// 不处理任何请求头，只返回简单的成功响应

module.exports = (req, res) => {
  // 设置响应头
  res.setHeader("Content-Type", "application/json");

  // 返回简单的成功响应
  res.status(200).json({
    success: true,
    message: "最小化API响应成功",
    timestamp: new Date().toISOString()
  });
};
