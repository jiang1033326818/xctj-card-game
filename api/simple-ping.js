// 简化版 API Ping 端点
// 用于测试 API 连接，不处理请求头

module.exports = (req, res) => {
  // 设置 CORS 头
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // 处理 OPTIONS 请求
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // 返回简单的成功响应
  res.status(200).json({
    status: "success",
    message: "API 连接正常",
    timestamp: new Date().toISOString()
  });
};
