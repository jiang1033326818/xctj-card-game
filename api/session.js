const { connectToDatabase } = require("./db");
const cookie = require("cookie");

async function getSession(sessionId) {
  if (!sessionId) return null;

  try {
    const { db } = await connectToDatabase();

    // 查找会话
    const session = await db.collection("sessions").findOne({
      sessionId,
      expiresAt: { $gt: new Date() } // 确保会话未过期
    });

    return session;
  } catch (error) {
    console.error("获取会话错误:", error);
    return null;
  }
}

async function destroySession(sessionId) {
  if (!sessionId) return;

  try {
    const { db } = await connectToDatabase();
    await db.collection("sessions").deleteOne({ sessionId });
  } catch (error) {
    console.error("删除会话错误:", error);
  }
}

async function getSessionFromRequest(req) {
  // 解析cookie
  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
  const sessionId = cookies.sessionId;

  if (!sessionId) return null;

  return await getSession(sessionId);
}

module.exports = {
  getSession,
  destroySession,
  getSessionFromRequest
};
