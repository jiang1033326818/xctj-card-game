const http = require("http");
const fs = require("fs");
const path = require("path");
// 加载环境变量
require('dotenv').config({ path: '.env.local' });
const unifiedHandler = require("./api/unified");

const server = http.createServer((req, res) => {
  console.log(`收到请求: ${req.method} ${req.url}`);
  
  // 处理API请求
  if (req.url.startsWith("/api/")) {
    // 解析请求体
    let body = "";
    req.on("data", chunk => {
      body += chunk.toString();
    });

    req.on("end", () => {
      try {
        if (
          body &&
          (req.headers["content-type"] || "").includes("application/json")
        ) {
          req.body = JSON.parse(body);
        } else {
          req.body = {};
        }

        // 调用统一处理函数
        unifiedHandler(req, res);
      } catch (error) {
        console.error("处理请求错误:", error);
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "服务器错误" }));
      }
    });

    return;
  }

  // 处理静态文件
  let filePath = "." + req.url;
  if (filePath === "./") {
    filePath = "./public/index.html"; // 修改为游戏选择主页
  } else if (!filePath.includes(".")) {
    filePath = `./public${req.url}.html`;
  } else {
    filePath = `./public${req.url}`;
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType =
    {
      ".html": "text/html",
      ".js": "text/javascript",
      ".css": "text/css",
      ".json": "application/json",
      ".png": "image/png",
      ".jpg": "image/jpg",
      ".gif": "image/gif",
      ".svg": "image/svg+xml",
      ".wav": "audio/wav",
      ".mp3": "audio/mpeg",
      ".mp4": "video/mp4",
      ".woff": "application/font-woff",
      ".ttf": "application/font-ttf",
      ".eot": "application/vnd.ms-fontobject",
      ".otf": "application/font-otf",
      ".wasm": "application/wasm"
    }[extname] || "application/octet-stream";

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === "ENOENT") {
        // 文件不存在
        fs.readFile("./public/404.html", (error, content) => {
          res.writeHead(404, { "Content-Type": "text/html" });
          res.end(content, "utf-8");
        });
      } else {
        // 服务器错误
        res.writeHead(500);
        res.end(`服务器错误: ${error.code}`);
      }
    } else {
      // 成功
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content, "utf-8");
    }
  });
});

const PORT = process.env.PORT || 3001; // 使用3001端口

server.listen(PORT, () => {
  console.log(`服务器2运行在 http://localhost:${PORT}`);
});