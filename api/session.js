// 简单的内存会话存储（生产环境建议使用Redis）
const sessions = new Map();

function createSession(userId, username, isAdmin) {
  const sessionId = Math.random().toString(36).substring(2, 15) + 
                   Math.random().toString(36).substring(2, 15);
  
  sessions.set(sessionId, {
    userId,
    username,
    isAdmin,
    createdAt: Date.now()
  });
  
  return sessionId;
}

function getSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return null;
  
  // 检查会话是否过期（24小时）
  if (Date.now() - session.createdAt > 24 * 60 * 60 * 1000) {
    sessions.delete(sessionId);
    return null;
  }
  
  return session;
}

function destroySession(sessionId) {
  sessions.delete(sessionId);
}

function getSessionFromRequest(req) {
  const sessionId = req.cookies?.sessionId;
  return sessionId ? getSession(sessionId) : null;
}

module.exports = {
  createSession,
  getSession,
  destroySession,
  getSessionFromRequest
};