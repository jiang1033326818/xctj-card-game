// 最小化登录API，不使用任何第三方库，只使用原生Node.js功能
// 注意：这是一个演示用的简化版本，实际生产环境应使用更安全的方式

// 硬编码的用户数据（仅用于演示）
const users = [
  {
    id: "1",
    username: "admin",
    password: "068162", // 实际应该是加密后的密码
    role: "admin",
    balance: 1000,
    name: "管理员"
  },
  {
    id: "2",
    username: "user",
    password: "123456",
    role: "user",
    balance: 500,
    name: "普通用户"
  }
];

// 简单的token生成函数
function generateToken(user) {
  // 实际应该使用JWT或其他安全的token生成方式
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role,
    exp: Date.now() + 24 * 60 * 60 * 1000 // 24小时过期
  };

  // 简单的base64编码，实际应该使用更安全的方式
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

// 主处理函数
module.exports = async (req, res) => {
  // 设置CORS头
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // 处理预检请求
  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    res.end();
    return;
  }

  // 只处理POST请求
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: false, message: "方法不允许" }));
    return;
  }

  try {
    // 解析请求体
    let body = "";
    for await (const chunk of req) {
      body += chunk.toString();
    }

    // 如果请求体为空，返回错误
    if (!body) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: false, message: "请求体为空" }));
      return;
    }

    // 解析JSON
    let data;
    try {
      data = JSON.parse(body);
    } catch (e) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: false, message: "无效的JSON格式" }));
      return;
    }

    // 验证必要字段
    const { username, password } = data;
    if (!username || !password) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: false, message: "用户名和密码不能为空" }));
      return;
    }

    // 查找用户
    const user = users.find(u => u.username === username);

    // 如果用户不存在或密码错误
    if (!user || user.password !== password) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: false, message: "用户名或密码错误" }));
      return;
    }

    // 生成token
    const token = generateToken(user);

    // 返回成功响应
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        success: true,
        message: "登录成功",
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          balance: user.balance,
          name: user.name
        }
      })
    );
  } catch (error) {
    console.error("API错误:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        success: false,
        message: "服务器内部错误",
        error: error.message
      })
    );
  }
};
