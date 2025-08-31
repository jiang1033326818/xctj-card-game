// 测试角子机改进功能
const http = require('http');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });
    
    req.on('error', reject);
    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

async function testSlotImprovements() {
  try {
    console.log('=== 测试角子机改进功能 ===\n');
    
    // 1. 登录
    console.log('1. 登录测试用户...');
    const loginResult = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      username: 'test',
      password: 'test'
    });
    
    if (loginResult.token) {
      console.log('✅ 登录成功');
      const token = loginResult.token;
      
      // 2. 获取用户信息
      console.log('\n2. 获取用户信息...');
      const userInfo = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/user',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('用户余额:', userInfo.balance);
      
      // 3. 测试多次游戏以验证中奖概率和余额更新
      console.log('\n3. 测试10次游戏验证中奖概率和余额更新...');
      let totalWins = 0;
      let winCount = 0;
      
      for (let i = 1; i <= 10; i++) {
        console.log(`\n--- 第${i}次游戏 ---`);
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
        
        console.log('转轴结果:', gameResult.reels ? '已生成' : '生成失败');
        console.log('中奖线数:', gameResult.wins ? gameResult.wins.length : 0);
        console.log('本次赢奖:', gameResult.total_win || 0);
        console.log('更新后余额:', gameResult.new_balance);
        console.log('超级大奖池:', gameResult.super_jackpot_pool || 0);
        
        if (gameResult.wins && gameResult.wins.length > 0) {
          winCount++;
          totalWins += gameResult.total_win || 0;
          console.log('🎉 本次中奖！中奖线类型:');
          gameResult.wins.forEach(win => {
            console.log(`  - ${win.line}: ${win.count}个${win.symbol} (${win.multiplier}x)`);
          });
        }
        
        if (gameResult.jackpot) {
          console.log('🎊 触发Jackpot:', gameResult.jackpot.level, '奖金:', gameResult.jackpot.amount);
        }
        
        // 验证余额更新
        const updatedUserInfo = await makeRequest({
          hostname: 'localhost',
          port: 3000,
          path: '/api/user',
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (updatedUserInfo.balance === gameResult.new_balance) {
          console.log('✅ 余额更新正确');
        } else {
          console.log('❌ 余额更新有误! 返回值:', gameResult.new_balance, '实际值:', updatedUserInfo.balance);
        }
      }
      
      console.log('\n=== 测试总结 ===');
      console.log(`总游戏次数: 10`);
      console.log(`中奖次数: ${winCount}`);
      console.log(`中奖率: ${(winCount/10*100).toFixed(1)}%`);
      console.log(`总赢奖: ${totalWins}`);
      console.log(`平均每次赢奖: ${(totalWins/10).toFixed(2)}`);
      
      if (winCount >= 3) {
        console.log('✅ 中奖概率提升成功！（应该比之前更容易中奖）');
      } else {
        console.log('⚠️  中奖概率较低，可能需要进一步调整');
      }
      
    } else {
      console.log('❌ 登录失败');
    }
    
  } catch (error) {
    console.error('测试失败:', error.message);
  }
}

testSlotImprovements();