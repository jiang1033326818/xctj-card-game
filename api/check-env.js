module.exports = async (req, res) => {
  try {
    // 获取MongoDB URI
    const uri = process.env.MONGODB_URI || "";

    // 安全地处理URI，隐藏密码部分
    let safeUri = "未设置";
    if (uri) {
      // 尝试解析URI
      try {
        // 格式: mongodb+srv://username:password@host/params
        const parts = uri.split("@");
        if (parts.length > 1) {
          const authPart = parts[0].split("://");
          const protocol = authPart[0];
          const userPass = authPart[1].split(":");
          const username = userPass[0];
          // 隐藏密码
          const host = parts[1];

          safeUri = `${protocol}://${username}:******@${host}`;
        } else {
          safeUri = "格式无效";
        }
      } catch (e) {
        safeUri = "无法解析 (格式可能不正确)";
      }
    }

    // 返回环境信息
    res.status(200).json({
      success: true,
      environment: process.env.NODE_ENV || "未设置",
      mongodbUri: safeUri,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    });
  } catch (error) {
    console.error("检查环境变量错误:", error);
    res.status(500).json({
      success: false,
      error: "检查环境变量失败",
      message: error.message
    });
  }
};
