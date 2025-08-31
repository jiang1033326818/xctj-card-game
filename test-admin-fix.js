// 测试管理员面板修复脚本
const { connectDB, getDB } = require("./api/database");
const bcrypt = require("bcryptjs");

async function testAdminPanelFixes() {
  console.log("开始测试管理员面板修复...");
  
  try {
    // 1. 测试数据库连接和用户初始化
    console.log("1. 测试数据库连接和用户初始化...");
    const db = await connectDB();
    console.log("数据库连接成功");
    
    // 2. 检查用户数据
    console.log("2. 检查用户数据...");
    const usersResult = await db.users.find({});
    let users = [];
    if (Array.isArray(usersResult)) {
      users = usersResult;
    } else if (typeof usersResult.toArray === 'function') {
      users = await usersResult.toArray();
    }
    
    console.log(`找到 ${users.length} 个用户:`);
    users.forEach(user => {
      console.log(`  - ${user.username} (管理员: ${user.is_admin}, 余额: ${user.balance})`);
    });
    
    // 3. 如果没有用户，创建默认用户
    if (users.length === 0) {
      console.log("3. 创建默认用户...");
      const adminPassword = await bcrypt.hash("068162", 10);
      await db.users.insertOne({
        username: "admin",
        password: adminPassword,
        is_admin: true,
        balance: 10000,
        created_at: new Date(),
      });
      
      const testPassword = await bcrypt.hash("test123", 10);
      await db.users.insertOne({
        username: "test",
        password: testPassword,
        is_admin: false,
        balance: 1000,
        created_at: new Date(),
      });
      
      console.log("默认用户创建完成");
    }
    
    // 4. 测试统计数据
    console.log("4. 测试统计数据...");
    const records = await db.game_records.find({});
    console.log(`找到 ${records.length} 条游戏记录`);
    
    // 按游戏类型统计
    const gameTypeStats = {};
    records.forEach(record => {
      const type = record.game_type || 'unknown';
      gameTypeStats[type] = (gameTypeStats[type] || 0) + 1;
    });
    
    console.log("游戏记录按类型统计:");
    Object.entries(gameTypeStats).forEach(([type, count]) => {
      console.log(`  - ${type}: ${count} 条记录`);
    });
    
    console.log("管理员面板修复测试完成!");
    
  } catch (error) {
    console.error("测试过程中出现错误:", error);
  }
}

// 运行测试
testAdminPanelFixes();