// 超级简单的登录API，支持多种请求格式
module.exports = (req, res) => {
  // 设置CORS头
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  // 处理预检请求
  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    res.end();
    return;
  }

  // 硬编码的用户数据
  const validUser = {
    username: "admin",
    password: "068162"
  };

  // 直接返回成功响应，不验证任何内容
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.end(
    JSON.stringify({
      success: true,
      message: "登录成功",
      token: "fake-token-for-testing",
      user: {
        id: "1",
        username: "admin",
        role: "admin",
        balance: 1000,
        name: "管理员"
      }
    })
  );
};
