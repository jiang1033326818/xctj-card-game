// 身份验证模块
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { connectDB, getDB } = require("./database");

// JWT密钥
const JWT_SECRET = process.env.JWT_SECRET || "xctj-card-game-secret-key-2024";
console.log("JWT_SECRET:", JWT_SECRET);

// 全局用户缓存，解决内存数据库重启问题
const userCache = new Map();

// 初始化默认用户
function initializeUserCache() {
  if (userCache.size === 0) {
    // 为默认用户设置哈希密码
    const adminHash =
      "$2a$10$ZworHLC.G8fXn2O6wdi4v.OnFM2NJVshnARuKzvyoanpqoRDLm3/y"; // 068162
    const testHash =
      "$2a$10$krcdNZRRFvL4.H1/KY/Yb.HL6OGvaDfZKx/h4M1injDEj1O0UZ6nW"; // test123

    userCache.set("admin", {
      username: "admin",
      password: adminHash,
      balance: 10000,
      is_admin: true
    });
    userCache.set("test", {
      username: "test",
      password: testHash,
      balance: 1000,
      is_admin: false
    });
    console.log("用户缓存已初始化");
  }
}

/**
 * 用户登录
 * @param {string} username 用户名
 * @param {string} password 密码
 * @returns {Object} 登录结果
 */
async function loginUser(username, password) {
  try {
    console.log("loginUser函数开始执行", { username });

    // 初始化缓存
    initializeUserCache();

    // 优先从缓存获取用户
    let user = userCache.get(username);

    if (!user) {
      // 缓存中没有，尝试从数据库获取
      try {
        console.log("从数据库查找用户");
        const database = getDB() || (await connectDB());
        const dbUser = await database.users.findOne({ username });
        if (dbUser) {
          userCache.set(username, dbUser);
          user = dbUser;
          console.log("从数据库加载用户到缓存:", username);
        }
      } catch (dbError) {
        console.log("数据库查询失败:", dbError.message);
      }
    }

    if (!user) {
      console.log("用户不存在:", username);
      return { success: false, error: "用户名或密码错误" };
    }

    console.log("验证密码");
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log("密码验证结果:", isPasswordValid);

    if (!isPasswordValid) {
      return { success: false, error: "用户名或密码错误" };
    }

    console.log("生成JWT token");
    const token = jwt.sign({ username: user.username }, JWT_SECRET, {
      expiresIn: "24h"
    });

    console.log("登录成功");
    return {
      success: true,
      token,
      is_admin: user.is_admin
    };
  } catch (error) {
    console.error("登录错误:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 注册用户
 * @param {string} username 用户名
 * @param {string} password 密码
 * @returns {Object} 注册结果
 */
async function registerUser(username, password) {
  try {
    console.log("开始注册用户:", username);

    // 初始化缓存
    initializeUserCache();

    // 检查用户是否已存在（缓存中检查）
    if (userCache.has(username)) {
      console.log("用户名已存在（缓存中）:", username);
      return { success: false, error: "用户名已存在" };
    }

    // 检查数据库中是否已存在该用户名
    try {
      const database = getDB() || (await connectDB());
      const existingUser = await database.users.findOne({ username });
      if (existingUser) {
        console.log("用户名已存在（数据库中）:", username);
        return { success: false, error: "用户名已存在" };
      }
    } catch (dbError) {
      console.log("数据库查询失败，但仍继续注册流程:", dbError.message);
    }

    console.log("开始加密密码");
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("密码加密完成");

    // 添加到缓存和数据库
    const newUser = {
      username,
      password: hashedPassword,
      is_admin: false,
      balance: 1000,
      created_at: new Date()
    };

    userCache.set(username, newUser);
    console.log("用户添加到缓存:", username);

    // 尝试添加到数据库（非关键）
    try {
      const database = getDB() || (await connectDB());
      await database.users.insertOne(newUser);
      console.log("用户添加到数据库:", username);
    } catch (dbError) {
      console.log("数据库操作失败，但缓存成功:", dbError.message);
    }

    return { success: true };
  } catch (error) {
    console.error("注册用户错误:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 从请求中获取用户信息
 * @param {Object} req 请求对象
 * @returns {Object|null} 用户信息或null
 */
async function getUserFromRequest(req) {
  try {
    console.log("开始从请求中获取用户信息");

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("缺少或无效的 Authorization 头");
      return null;
    }

    const token = authHeader.substring(7);
    console.log("Token 获取成功");

    const decoded = jwt.verify(token, JWT_SECRET);
    console.log("解码的 token:", decoded.username);

    // 初始化缓存
    initializeUserCache();

    // 优先从缓存获取用户
    let user = userCache.get(decoded.username);

    if (user) {
      console.log("从缓存获取用户:", {
        username: user.username,
        balance: user.balance
      });
      return user;
    }

    // 缓存中没有，尝试从数据库获取
    try {
      console.log("从数据库查找用户:", decoded.username);
      const database = getDB() || (await connectDB());
      const dbUser = await database.users.findOne({
        username: decoded.username
      });

      if (dbUser) {
        userCache.set(decoded.username, dbUser);
        console.log("从数据库加载用户到缓存:", {
          username: dbUser.username,
          balance: dbUser.balance
        });
        return dbUser;
      }
    } catch (dbError) {
      console.error("数据库查询失败:", dbError.message);
    }

    console.log("未找到用户，创建默认用户");
    // 如果都没有找到，创建默认用户
    const defaultUser = {
      username: decoded.username,
      is_admin: decoded.username === "admin",
      balance: 1000,
      created_at: new Date()
    };
    userCache.set(decoded.username, defaultUser);
    return defaultUser;
  } catch (error) {
    console.error("获取用户信息错误:", error.message);
    return null;
  }
}

/**
 * 验证JWT token
 * @param {string} token JWT token
 * @returns {Object|null} 解码后的token信息或null
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error("Token验证失败:", error);
    return null;
  }
}

/**
 * 生成JWT token
 * @param {Object} payload 载荷数据
 * @param {string} expiresIn 过期时间，默认24小时
 * @returns {string} JWT token
 */
function generateToken(payload, expiresIn = "24h") {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

/**
 * 检查用户是否为管理员
 * @param {Object} user 用户对象
 * @returns {boolean} 是否为管理员
 */
function isAdmin(user) {
  return user && user.is_admin === true;
}

/**
 * 中间件：验证用户身份
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 * @returns {Object|null} 用户信息或null（如果验证失败会直接响应错误）
 */
async function authenticateUser(req, res) {
  const user = await getUserFromRequest(req);
  if (!user) {
    res.statusCode = 401;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "未授权" }));
    return null;
  }
  return user;
}

/**
 * 中间件：验证管理员权限
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 * @returns {Object|null} 管理员用户信息或null（如果验证失败会直接响应错误）
 */
async function authenticateAdmin(req, res) {
  const user = await authenticateUser(req, res);
  if (!user) return null; // authenticateUser已经处理了响应

  if (!isAdmin(user)) {
    res.statusCode = 403;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "需要管理员权限" }));
    return null;
  }

  return user;
}

/**
 * 更新用户余额
 * @param {string} username 用户名
 * @param {number} newBalance 新余额
 * @returns {boolean} 是否成功
 */
function updateUserBalance(username, newBalance) {
  try {
    initializeUserCache();

    const user = userCache.get(username);
    if (user) {
      const oldBalance = user.balance;
      user.balance = newBalance;
      userCache.set(username, user);
      console.log("更新用户余额成功:", {
        username,
        oldBalance,
        newBalance,
        diff: newBalance - oldBalance
      });

      // 尝试同步到数据库（非关键）
      try {
        const database = getDB();
        if (database) {
          database.users
            .updateOne({ username }, { $set: { balance: newBalance } })
            .catch(err => console.log("数据库更新失败:", err.message));
        }
      } catch (dbError) {
        console.log("数据库同步失败:", dbError.message);
      }

      return true;
    }
    console.error("用户不存在，无法更新余额:", username);
    return false;
  } catch (error) {
    console.error("更新用户余额错误:", error);
    return false;
  }
}

/**
 * 原子化更新用户余额
 * @param {string} username 用户名
 * @param {number} amount 变化金额（正数表示增加，负数表示减少）
 * @returns {Object|null} 更新后的用户信息或null（如果失败）
 */
async function atomicUpdateUserBalance(username, amount) {
  try {
    initializeUserCache();

    // 获取数据库实例
    const database = getDB();
    if (!database) {
      console.error("数据库未初始化，无法原子化更新余额");
      return null;
    }

    // 检查是否是内存数据库（通过检查是否有toArray方法来判断）
    const isMemoryDB =
      typeof database.users.find === "function" &&
      typeof database.users.toArray === "undefined";

    if (isMemoryDB) {
      // 内存数据库模式 - 直接操作缓存
      const user = userCache.get(username);
      if (user) {
        const newBalance = user.balance + amount;
        user.balance = newBalance;
        userCache.set(username, user);
        console.log("内存数据库更新用户余额成功:", {
          username,
          amount,
          newBalance
        });
        return user;
      }
      console.error("内存数据库更新用户余额失败，用户未找到:", username);
      return null;
    } else {
      // MongoDB模式 - 使用原子操作
      const result = await database.users.updateOne(
        { username: username },
        { $inc: { balance: amount } }
      );

      if (result.modifiedCount > 0) {
        // 更新成功，从数据库重新获取用户信息
        const updatedUser = await database.users.findOne({
          username: username
        });
        if (updatedUser) {
          // 同步到缓存
          userCache.set(username, updatedUser);
          console.log("原子化更新用户余额成功:", {
            username,
            amount,
            newBalance: updatedUser.balance
          });
          return updatedUser;
        }
      }

      console.error("原子化更新用户余额失败，用户未找到或未更新:", username);
      return null;
    }
  } catch (error) {
    console.error("原子化更新用户余额错误:", error);
    return null;
  }
}

/**
 * 验证用户余额是否足够
 * @param {string} username 用户名
 * @param {number} requiredAmount 所需金额
 * @returns {Object|null} 用户信息或null（如果余额不足或用户不存在）
 */
async function validateUserBalance(username, requiredAmount) {
  try {
    initializeUserCache();

    // 优先从缓存获取用户
    let user = userCache.get(username);
    if (user) {
      // 检查余额是否足够
      if (user.balance >= requiredAmount) {
        return user;
      } else {
        console.log("用户余额不足:", {
          username,
          balance: user.balance,
          required: requiredAmount
        });
        return null;
      }
    }

    // 获取数据库实例
    const database = getDB();
    if (!database) {
      console.error("数据库未初始化，无法验证用户余额");
      return null;
    }

    // 从数据库获取最新的用户信息
    user = await database.users.findOne({ username: username });
    if (!user) {
      console.error("用户不存在:", username);
      return null;
    }

    // 同步到缓存
    userCache.set(username, user);

    if (user.balance < requiredAmount) {
      console.log("用户余额不足:", {
        username,
        balance: user.balance,
        required: requiredAmount
      });
      return null;
    }

    return user;
  } catch (error) {
    console.error("验证用户余额错误:", error);
    return null;
  }
}

/**
 * 获取所有用户（排行榜用）
 * @returns {Array} 用户列表
 */
function getAllCachedUsers() {
  initializeUserCache();
  return Array.from(userCache.values())
    .filter(user => !user.is_admin)
    .map(user => ({ username: user.username, balance: user.balance }))
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 3);
}

module.exports = {
  loginUser,
  registerUser,
  getUserFromRequest,
  verifyToken,
  generateToken,
  isAdmin,
  authenticateUser,
  authenticateAdmin,
  updateUserBalance,
  atomicUpdateUserBalance,
  validateUserBalance,
  getAllCachedUsers
};
