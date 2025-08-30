const http = require('http');

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(body);
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testAuth() {
  try {
    console.log('1. 测试登录...');
    
    const loginResult = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      username: 'test',
      password: 'test'
    });
    
    console.log('登录结果:', loginResult);
    
    if (loginResult.token) {
      const token = loginResult.token;
      
      console.log('\n2. 获取用户信息...');
      const userInfo = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/user',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('用户信息:', userInfo);
      
      console.log('\n3. 测试飞禽走兽游戏（下注50燕子）...');
      const gameResult = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/animals-game',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }, {
        bets: {
          swallow: 50
        }
      });
      
      console.log('游戏结果:', gameResult);
      
      console.log('\n4. 再次获取用户信息验证余额更新...');
      const userInfo2 = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/user',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('更新后用户信息:', userInfo2);
      
      console.log('\n5. 获取排行榜验证余额同步...');
      const topPlayers = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/top_players',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('排行榜数据:', topPlayers);
      
      // 比较余额
      console.log('\n=== 余额验证结果 ===');
      console.log('游戏前余额:', userInfo.balance);
      console.log('游戏后API余额:', userInfo2.balance);
      console.log('排行榜显示余额:', topPlayers.find ? topPlayers.find(p => p.username === 'test')?.balance : '未找到');
      
      if (userInfo.balance !== userInfo2.balance) {
        console.log('✅ 余额已更新！');
      } else {
        console.log('❌ 余额未更新！');
      }
      
    } else {
      console.log('❌ 登录失败');
    }
    
  } catch (error) {
    console.error('测试失败:', error.message);
  }
}

testAuth();