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

async function testSlotGame() {
  try {
    console.log('=== 测试多福多财角子机游戏 ===\n');
    
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
      
      console.log('\n3. 测试角子机游戏（投注50）...');
      const gameResult = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/slot-game',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }, {
        bet_amount: 50
      });
      
      console.log('游戏结果:', JSON.stringify(gameResult, null, 2));
      
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
      
      console.log('\n=== 余额验证结果 ===');
      console.log('游戏前余额:', userInfo.balance);
      console.log('游戏后余额:', userInfo2.balance);
      console.log('投注金额:', 50);
      console.log('赢取金额:', gameResult.total_win || 0);
      console.log('理论余额:', userInfo.balance - 50 + (gameResult.total_win || 0));
      
      if (userInfo.balance !== userInfo2.balance) {
        console.log('✅ 余额已更新！');
      } else {
        console.log('❌ 余额未更新！');
      }
      
      // 如果有免费旋转，测试免费旋转
      if (gameResult.free_spins_remaining > 0) {
        console.log('\n5. 测试免费旋转...');
        const freeSpinResult = await makeRequest({
          hostname: 'localhost',
          port: 3000,
          path: '/api/slot-game',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }, {
          bet_amount: 50,
          free_spins_remaining: gameResult.free_spins_remaining
        });
        
        console.log('免费旋转结果:', JSON.stringify(freeSpinResult, null, 2));
      }
      
    } else {
      console.log('❌ 登录失败');
    }
    
  } catch (error) {
    console.error('测试失败:', error.message);
  }
}

testSlotGame();