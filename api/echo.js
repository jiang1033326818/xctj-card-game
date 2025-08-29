// 简单的echo API，返回请求信息
module.exports = async (req, res) => {
  // 设置CORS头
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // 处理预检请求
  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    res.end();
    return;
  }

  // 收集请求信息
  const requestInfo = {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: null
  };

  // 如果是POST请求，读取请求体
  if (req.method === "POST") {
    let body = "";
    for await (const chunk of req) {
      body += chunk.toString();
    }

    // 尝试解析JSON
    try {
      requestInfo.body = JSON.parse(body);
    } catch (e) {
      // 如果不是JSON，保留原始字符串
      requestInfo.body = body;
    }
  }

  // 返回请求信息
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.end(
    JSON.stringify({
      success: true,
      message: "Echo API",
      request: requestInfo
    })
  );
};
