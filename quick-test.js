// 快速游戏测试脚本
const http = require('http');

function makeRequest(options, data) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    resolve({ error: 'Invalid JSON', body });
                }
            });
        });
        
        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function testGame() {
    console.log('🔧 快速游戏测试');
    
    try {
        // 1. 登录
        console.log('正在登录...');
        const loginResult = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/login',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { username: 'test', password: 'test' });
        
        if (!loginResult.token) {
            console.log('❌ 登录失败:', loginResult);
            return;
        }
        
        console.log('✅ 登录成功');
        
        // 2. 测试几局游戏
        let totalBet = 0;
        let totalWin = 0;
        let winCount = 0;
        
        for (let i = 1; i <= 5; i++) {
            const gameResult = await makeRequest({
                hostname: 'localhost',
                port: 3000,
                path: '/api/slot-game',
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${loginResult.token}`
                }
            }, { bet_amount: 50 });
            
            if (gameResult.error) {
                console.log(`第${i}局失败:`, gameResult.error);
                continue;
            }
            
            const win = gameResult.total_win || 0;
            const lines = gameResult.wins ? gameResult.wins.length : 0;
            const profit = win - 50;
            
            totalBet += 50;
            totalWin += win;
            if (win > 0) winCount++;
            
            console.log(`第${i}局: 投注50 | 中奖${win} | 连线${lines}条 | 净收益${profit} | 余额${gameResult.new_balance}`);
        }
        
        // 统计
        const rtp = totalBet > 0 ? (totalWin / totalBet * 100).toFixed(1) : 0;
        const houseEdge = (100 - rtp).toFixed(1);
        const winRate = (winCount / 5 * 100).toFixed(1);
        
        console.log('\n📊 测试结果:');
        console.log(`总投注: ¥${totalBet} | 总中奖: ¥${totalWin} | 净收益: ¥${totalWin - totalBet}`);
        console.log(`中奖率: ${winRate}% | RTP: ${rtp}% | 庄家优势: ${houseEdge}%`);
        
        if (parseFloat(houseEdge) >= 10 && parseFloat(houseEdge) <= 25) {
            console.log('✅ 庄家优势合理');
        } else {
            console.log('⚠️ 庄家优势需要调整');
        }
        
    } catch (error) {
        console.log('❌ 测试失败:', error.message);
    }
}

testGame();