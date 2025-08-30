const { connectDB } = require("./database");
const { handleRoutes, setCORSHeaders, handleOptions, handle404 } = require("./routes");

/**
 * 统一API处理函数 - 重构版本
 * 职责：
 * 1. 初始化数据库连接
 * 2. 处理CORS
 * 3. 路由分发
 * 4. 错误处理
 */
module.exports = async (req, res) => {
  try {
    console.log(`API请求: ${req.method} ${req.url}`);
    
    // 设置CORS头
    setCORSHeaders(res);

    // 处理OPTIONS请求
    if (req.method === "OPTIONS") {
      console.log("处理OPTIONS请求");
      return handleOptions(req, res);
    }

    // 添加全局错误边界 - 确保任何错误都不会导致进程崩溃
    try {
      // 连接数据库（使用try-catch保护）
      await connectDB().catch(err => {
        console.log("数据库连接失败，使用默认配置:", err.message);
      });

      // 路由处理（使用try-catch保护）
      const handled = await handleRoutes(req, res).catch(err => {
        console.error("路由处理错误:", err.message);
        return false;
      });
      
      // 如果没有匹配的路由，返回404
      if (!handled) {
        handle404(req, res);
      }
    } catch (routeError) {
      console.error("路由层错误:", routeError.message);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "服务暂时不可用" }));
    }
    
  } catch (error) {
    console.error("API顶层错误:", error.message);
    // 确保响应总是被发送
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "服务器内部错误" }));
    }
  }
};