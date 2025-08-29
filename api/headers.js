// 请求头检查API
// 用于检查请求头大小和内容

module.exports = (req, res) => {
  // 设置CORS头
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // 处理OPTIONS请求
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // 获取请求头
  const headers = req.headers;

  // 计算请求头大小
  const headersString = JSON.stringify(headers);
  const headersSize = headersString.length;

  // 返回请求头信息
  res.status(200).json({
    size: headersSize,
    headers: headers,
    headersString:
      headersSize > 1000
        ? headersString.substring(0, 1000) + "..."
        : headersString
  });
};
