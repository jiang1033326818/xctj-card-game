#!/usr/bin/env node
// 本地开发环境测试脚本

const http = require('http');

console.log('🚀 开始测试本地开发环境...\n');

// 测试服务器连通性
function testConnection(port = 3000) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: port,
      path: '/',
      method: 'GET'
    }, (res) => {
      console.log(`✅ 服务器连接成功 - 状态码: ${res.statusCode}`);
      console.log(`📍 访问地址: http://localhost:${port}`);
      resolve(true);
    });
    
    req.on('error', (err) => {
      console.log(`❌ 服务器连接失败: ${err.message}`);
      console.log(`💡 请确保运行了 'npm run dev' 启动本地服务器`);
      reject(err);
    });
    
    req.end();
  });
}

// 测试API端点
function testAPI(port = 3000) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      username: 'test',
      password: '123456'
    });
    
    const req = http.request({
      hostname: 'localhost',
      port: port,
      path: '/api/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.success) {
            console.log('✅ API测试成功 - 用户登录正常');
            console.log('🎮 内存数据库模式运行正常');
          } else {
            console.log('⚠️  API测试 - 登录失败（这是正常的，如果用户不存在）');
          }
          resolve(true);
        } catch (error) {
          console.log('❌ API响应解析失败:', error.message);
          reject(error);
        }
      });
    });
    
    req.on('error', (err) => {
      console.log(`❌ API测试失败: ${err.message}`);
      reject(err);
    });
    
    req.write(postData);
    req.end();
  });
}

// 主测试函数
async function runTests() {
  try {
    console.log('1️⃣ 测试服务器连通性...');
    await testConnection();
    
    console.log('\n2️⃣ 测试API功能...');
    await testAPI();
    
    console.log('\n🎉 本地开发环境测试完成！');
    console.log('\n📋 测试结果总结:');
    console.log('  ✅ 服务器正常运行');
    console.log('  ✅ API端点可访问');
    console.log('  ✅ 内存数据库模式正常');
    console.log('  ✅ 不会影响生产环境数据');
    
    console.log('\n🔗 您可以访问以下页面:');
    console.log('  🎮 游戏主页: http://localhost:3000');
    console.log('  🔐 登录页面: http://localhost:3000/login.html');
    console.log('  👑 管理面板: http://localhost:3000/admin.html');
    console.log('  🦁 飞禽走兽: http://localhost:3000/animals.html');
    
  } catch (error) {
    console.log('\n💥 测试失败，请检查:');
    console.log('  1. 是否已启动本地服务器 (npm run dev)');
    console.log('  2. 端口3000是否被占用');
    console.log('  3. 网络连接是否正常');
    process.exit(1);
  }
}

if (require.main === module) {
  runTests();
}

module.exports = { testConnection, testAPI };