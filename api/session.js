const { connectToDatabase } = require("./db");
const cookie = require("cookie");

async function getSession(sessionId) {
  if (!sessionId) {
    console.log("没有提供sessionId");
    return null;
  }

  try {
    console.log(`尝试获取会话: ${sessionId}`);
    const { db } = await connectToDatabase();

    // 查找会话
    const session = await db.collection("sessions").findOne({
      sessionId,
      expiresAt: { $gt: new Date() } // 确保会话未过期
    });

    if (!session) {
      console.log("会话不存在或已过期");
      return null;
    }

    console.log("会话获取成功");
    return session;
  } catch (error) {
    console.error("获取会话错误:", error);
    return null;
  }
}

async function destroySession(sessionId) {
  if (!sessionId) {
    console.log("没有提供sessionId");
    return;
  }

  try {
    console.log(`尝试删除会话: ${sessionId}`);
    const { db } = await connectToDatabase();
    await db.collection("sessions").deleteOne({ sessionId });
    console.log("会话删除成功");
  } catch (error) {
    console.error("删除会话错误:", error);
  }
}

async function getSessionFromRequest(req) {
  try {
    // 检查请求头
    if (!req.headers || !req.headers.cookie) {
      console.log("请求中没有cookie");
      return null;
    }

    // 解析cookie
    console.log("解析cookie...");
    const cookies = cookie.parse(req.headers.cookie);
    const sessionId = cookies.sessionId;

    if (!sessionId) {
      console.log("cookie中没有sessionId");
      return null;
    }

    console.log(`从cookie中获取到sessionId: ${sessionId}`);
    return await getSession(sessionId);
  } catch (error) {
    console.error("从请求中获取会话错误:", error);
    return null;
  }
}

module.exports = {
  getSession,
  destroySession,
  getSessionFromRequest
};
