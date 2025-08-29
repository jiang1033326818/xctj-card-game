// 本地测试服务器
// 用于绕过Vercel的限制，在本地测试API

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");

// 创建Express应用
const app = express();
const port = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

// 最小化API端点
app.get("/api/minimal", (req, res) => {
  res.json({
    success: true,
    message: "最小化API响应成功",
    timestamp: new Date().toISOString()
  });
});

// 最小化登录API端点
app.post("/api/minimal-login", (req, res) => {
  const { username, password } = req.body;

  // 简单的用户验证
  if (username === "admin" && password === "068162") {
    res.json({
      success: true,
      token: "test-token-123",
      user: {
        username: "admin",
        role: "admin",
        balance: 10000
      }
    });
  } else {
    res.status(401).json({
      success: false,
      error: "用户名或密码错误"
    });
  }
});

// 简化Ping API端点
app.get("/api/simple-ping", (req, res) => {
  res.json({
    status: "success",
    message: "API连接正常",
    timestamp: new Date().toISOString()
  });
});

// 启动服务器
app.listen(port, () => {
  console.log(`本地测试服务器运行在 http://localhost:${port}`);
  console.log(`访问 http://localhost:${port}/minimal-test.html 进行测试`);
});
