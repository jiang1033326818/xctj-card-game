// 路由处理模块
const { loginUser, registerUser, getUserFromRequest } = require("./auth");
const { handleGame, handleAnimalsGame, handleSlotGame, getGameRecords, getTopPlayers } = require("./games");
const { getHouseStats } = require("./stats");
const { setAdminUser, getAllUsers, handleUpdateBalance, resetAdminPassword: resetAdminPasswordHandler, deleteDuplicateAdmins: deleteDuplicateAdminsHandler } = require("./admin");

/**
 * 处理API路由
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 * @returns {boolean} 是否处理了路由
 */
async function handleRoutes(req, res) {
  const path = req.url.split("?")[0];
  const method = req.method;

  // 用户认证相关路由
  if (path === "/api/login" && method === "POST") {
    return await handleLogin(req, res);
  }

  if (path === "/api/register" && method === "POST") {
    return await handleRegister(req, res);
  }

  if (path === "/api/user" && method === "GET") {
    return await handleGetUser(req, res);
  }

  // 游戏相关路由
  if (path === "/api/game" && method === "POST") {
    return await handleGame(req, res);
  }

  if (path === "/api/animals-game" && method === "POST") {
    return await handleAnimalsGame(req, res);
  }

  if (path === "/api/slot-game" && method === "POST") {
    return await handleSlotGame(req, res);
  }

  if (path === "/api/game_records" && method === "GET") {
    return await getGameRecords(req, res);
  }

  if (path === "/api/top_players" && method === "GET") {
    return await getTopPlayers(req, res);
  }

  // 统计相关路由
  if (path === "/api/house_stats" && method === "GET") {
    return await getHouseStats(req, res);
  }

  // 管理员相关路由
  if (path === "/api/set-admin" && method === "POST") {
    return await setAdminUser(req, res);
  }

  if (path === "/api/reset-admin-password" && method === "POST") {
    return await resetAdminPassword(req, res);
  }

  if (path === "/api/delete-duplicate-admins" && method === "POST") {
    return await deleteDuplicateAdmins(req, res);
  }

  if (path === "/api/admin/users" && method === "GET") {
    return await getAllUsers(req, res);
  }

  if (path === "/api/update_balance" && method === "POST") {
    return await handleUpdateBalance(req, res);
  }

  // 路由未匹配
  return false;
}

/**
 * 处理登录请求
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 */
async function handleLogin(req, res) {
  try {
    console.log("登录请求开始");
    const { username, password } = req.body;
    console.log("请求参数:", { username, password: password ? "***" : "empty" });

    if (!username || !password) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "用户名和密码不能为空" }));
    }

    console.log("准备调用loginUser函数");
    const result = await loginUser(username, password);
    console.log("登录结果:", result);

    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(result));
    return true;
  } catch (error) {
    console.error("登录处理错误:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "服务器错误" }));
    return true;
  }
}

/**
 * 处理注册请求
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 */
async function handleRegister(req, res) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "用户名和密码不能为空" }));
    }

    const result = await registerUser(username, password);
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(result));
    return true;
  } catch (error) {
    console.error("注册处理错误:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "服务器错误" }));
    return true;
  }
}

/**
 * 处理获取用户信息请求
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 */
async function handleGetUser(req, res) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "未授权" }));
    }

    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({
      username: user.username,
      is_admin: user.is_admin,
      balance: user.balance,
    }));
    return true;
  } catch (error) {
    console.error("获取用户信息错误:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "服务器错误" }));
    return true;
  }
}

/**
 * 处理404错误
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 */
function handle404(req, res) {
  res.statusCode = 404;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ error: "路径不存在" }));
}

/**
 * 设置CORS头
 * @param {Object} res 响应对象
 */
function setCORSHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

/**
 * 处理OPTIONS请求
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 */
function handleOptions(req, res) {
  setCORSHeaders(res);
  res.statusCode = 200;
  res.end();
}

/**
 * 处理重置Admin密码请求
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 */
async function resetAdminPassword(req, res) {
  try {
    const { username, password } = req.body;
    
    // 验证参数
    if (username !== "admin") {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "只能重置admin用户的密码" }));
    }

    if (!password || password !== "068162") {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "密码必须为068162" }));
    }

    // 调用处理函数
    await resetAdminPasswordHandler(req, res);
    return true;
  } catch (error) {
    console.error("重置Admin密码处理错误:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "服务器错误" }));
    return true;
  }
}

/**
 * 处理删除重复Admin账户请求
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 */
async function deleteDuplicateAdmins(req, res) {
  try {
    const { username } = req.body;
    
    // 验证参数
    if (username !== "admin") {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "只能清理admin用户的重复账户" }));
    }

    // 导入admin模块中的删除重复账户函数
    const { deleteDuplicateAdmins: deleteDuplicateAdminsHandler } = require("./admin");
    
    // 调用处理函数
    await deleteDuplicateAdminsHandler(req, res);
    return true;
  } catch (error) {
    console.error("删除重复Admin账户处理错误:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "服务器错误" }));
    return true;
  }
}

/**
 * 路由映射表
 */
const routeMap = {
  "/api/login": { method: "POST", handler: handleLogin },
  "/api/register": { method: "POST", handler: handleRegister },
  "/api/user": { method: "GET", handler: handleGetUser },
  "/api/game": { method: "POST", handler: handleGame },
  "/api/animals-game": { method: "POST", handler: handleAnimalsGame },
  "/api/game_records": { method: "GET", handler: getGameRecords },
  "/api/top_players": { method: "GET", handler: getTopPlayers },
  "/api/house_stats": { method: "GET", handler: getHouseStats },
  "/api/set-admin": { method: "POST", handler: setAdminUser },
  "/api/reset-admin-password": { method: "POST", handler: resetAdminPassword },
  "/api/delete-duplicate-admins": { method: "POST", handler: deleteDuplicateAdmins },
  "/api/admin/users": { method: "GET", handler: getAllUsers },
  "/api/update_balance": { method: "POST", handler: handleUpdateBalance },
};

/**
 * 获取路由信息
 * @returns {Array} 路由信息数组
 */
function getRouteInfo() {
  return Object.entries(routeMap).map(([path, config]) => ({
    path,
    method: config.method,
    description: getRouteDescription(path)
  }));
}

/**
 * 获取路由描述
 * @param {string} path 路由路径
 * @returns {string} 路由描述
 */
function getRouteDescription(path) {
  const descriptions = {
    "/api/login": "用户登录",
    "/api/register": "用户注册", 
    "/api/user": "获取用户信息",
    "/api/game": "喜从天降游戏",
    "/api/animals-game": "飞禽走兽游戏",
    "/api/game_records": "获取游戏记录",
    "/api/top_players": "获取排行榜",
    "/api/house_stats": "获取统计数据",
    "/api/set-admin": "设置管理员",
    "/api/reset-admin-password": "重置Admin密码",
    "/api/delete-duplicate-admins": "删除重复Admin账户",
    "/api/admin/users": "获取用户列表",
    "/api/update_balance": "更新用户余额"
  };
  
  return descriptions[path] || "未知路由";
}

/**
 * 验证路由参数
 * @param {Object} req 请求对象
 * @param {Array} requiredFields 必需字段
 * @returns {Object|null} 验证结果
 */
function validateRequest(req, requiredFields = []) {
  const errors = [];
  
  for (const field of requiredFields) {
    if (!req.body || req.body[field] === undefined || req.body[field] === null) {
      errors.push(`缺少必需参数: ${field}`);
    }
  }
  
  if (errors.length > 0) {
    return { 
      isValid: false, 
      errors 
    };
  }
  
  return { isValid: true };
}

module.exports = {
  handleRoutes,
  handleLogin,
  handleRegister,
  handleGetUser,
  handle404,
  setCORSHeaders,
  handleOptions,
  getRouteInfo,
  validateRequest
};