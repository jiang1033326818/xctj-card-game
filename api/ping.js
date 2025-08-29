// API Ping端点
// 用于测试API连接

module.exports = (req, res) => {
  // 获取请求头信息
  const headers = req.headers;

  // 计算请求头大小
  const headersSize = JSON.stringify(headers).length;

  // 返回成功响应
  res.status(200).json({
    status: "success",
    message: "API连接正常",
    timestamp: new Date().toISOString(),
    headers: {
      count: Object.keys(headers).length,
      size: headersSize
    }
  });
};
