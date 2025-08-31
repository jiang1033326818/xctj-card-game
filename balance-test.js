// 完整测试角子机平衡性
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

async function balanceTest() {
  try {
    console.log('=== 角子机平衡性测试 ===\n');
    
    // 1. 登录
    const loginResult = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      username: 'test',
      password: 'test'
    });
    
    if (!loginResult.token) {
      console.log('❌ 登录失败');
      return;
    }
    
    console.log('✅ 登录成功');
    const token = loginResult.token;
    
    // 2. 测试20次游戏统计
    console.log('\n📊 进行20次游戏统计...\n');
    
    let totalBets = 0;
    let totalWins = 0;
    let winCount = 0;
    let totalLines = 0;
    let initialBalance = 0;
    let finalBalance = 0;
    
    // 获取初始余额
    const userInfo = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/user',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    initialBalance = userInfo.balance;
    console.log(`初始余额: ${initialBalance}`);
    
    for (let i = 1; i <= 20; i++) {
      const betAmount = 50;
      
      const gameResult = await makeRequest({
        hostname: 'localhost',
        port: 3001,
        path: '/api/slot-game',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }, {
        bet_amount: betAmount
      });
      
      totalBets += betAmount;
      const winAmount = gameResult.total_win || 0;
      totalWins += winAmount;
      const lineCount = gameResult.wins ? gameResult.wins.length : 0;
      totalLines += lineCount;
      
      if (lineCount > 0) {
        winCount++;
      }
      
      console.log(`第${i.toString().padStart(2, ' ')}次: 投注${betAmount}, 中奖${winAmount}, 中奖线${lineCount}, 净${winAmount - betAmount >= 0 ? '+' : ''}${winAmount - betAmount}`);
    }
    
    // 获取最终余额
    const finalUserInfo = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/user',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    finalBalance = finalUserInfo.balance;
    
    console.log('\n=== 统计结果 ===');
    console.log(`总投注: ${totalBets}`);
    console.log(`总赢奖: ${totalWins}`);
    console.log(`净盈亏: ${totalWins - totalBets}`);
    console.log(`中奖次数: ${winCount}/20 (${(winCount/20*100).toFixed(1)}%)`);
    console.log(`平均中奖线: ${(totalLines/20).toFixed(1)}条/次`);
    console.log(`初始余额: ${initialBalance}`);
    console.log(`最终余额: ${finalBalance}`);
    console.log(`理论余额: ${initialBalance - totalBets + totalWins}`);
    console.log(`RTP (玩家回报率): ${(totalWins/totalBets*100).toFixed(2)}%`);
    console.log(`庄家优势: ${((totalBets-totalWins)/totalBets*100).toFixed(2)}%`);
    
    // 评估平衡性
    const rtp = totalWins / totalBets;
    console.log('\n=== 平衡性评估 ===');
    if (rtp > 0.95) {
      console.log('⚠️  RTP过高，对庄家不利');
    } else if (rtp < 0.80) {
      console.log('⚠️  RTP过低，玩家体验差');
    } else {
      console.log('✅ RTP合理，庄家有微弱优势');
    }
    
    if (winCount > 15) {
      console.log('⚠️  中奖频率过高');
    } else if (winCount < 5) {
      console.log('⚠️  中奖频率过低');
    } else {
      console.log('✅ 中奖频率合理');
    }
    
    // 检查余额一致性
    if (finalBalance === initialBalance - totalBets + totalWins) {
      console.log('✅ 余额结算正确');
    } else {
      console.log('❌ 余额结算有误');
      console.log(`  预期: ${initialBalance - totalBets + totalWins}`);
      console.log(`  实际: ${finalBalance}`);
    }
    
  } catch (error) {
    console.error('测试失败:', error.message);
  }
}

balanceTest();