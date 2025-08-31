// Jackpot功能专门测试脚本
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

async function testJackpot() {
    console.log('🎰 Jackpot功能测试');
    
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
        
        // 2. 持续测试寻找Jackpot
        let totalGames = 0;
        let totalBet = 0;
        let totalWin = 0;
        let jackpotFound = [];
        let superJackpotPool = 0;
        
        console.log('\n🎲 开始Jackpot测试（最多50局）...');
        
        for (let i = 1; i <= 50; i++) {
            const gameResult = await makeRequest({
                hostname: 'localhost',
                port: 3000,
                path: '/api/slot-game',
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${loginResult.token}`
                }
            }, { bet_amount: 100 }); // 使用较高投注金额增加Jackpot概率
            
            if (gameResult.error) {
                console.log(`第${i}局失败:`, gameResult.error);
                continue;
            }
            
            totalGames++;
            totalBet += 100;
            totalWin += (gameResult.total_win || 0);
            superJackpotPool = gameResult.super_jackpot_pool || 0;
            
            // 检查是否触发Jackpot
            if (gameResult.jackpot) {
                jackpotFound.push({
                    game: i,
                    level: gameResult.jackpot.level,
                    amount: gameResult.jackpot.amount,
                    type: gameResult.jackpot.type
                });
                
                console.log(`🎉 第${i}局触发Jackpot！`);
                console.log(`   级别: ${gameResult.jackpot.level}`);
                console.log(`   金额: ¥${gameResult.jackpot.amount}`);
                console.log(`   类型: ${gameResult.jackpot.type}`);
            } else {
                // 显示进度
                if (i % 10 === 0) {
                    console.log(`   已测试${i}局，超级大奖池: ¥${superJackpotPool}`);
                }
            }
            
            // 短暂延迟
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        // 统计结果
        console.log('\n📊 Jackpot测试结果:');
        console.log(`总游戏局数: ${totalGames}`);
        console.log(`总投注金额: ¥${totalBet}`);
        console.log(`总中奖金额: ¥${totalWin}`);
        console.log(`超级大奖池: ¥${superJackpotPool}`);
        console.log(`触发Jackpot次数: ${jackpotFound.length}`);
        
        if (jackpotFound.length > 0) {
            console.log('\n🏆 触发的Jackpot详情:');
            jackpotFound.forEach((jackpot, index) => {
                console.log(`${index + 1}. 第${jackpot.game}局: ${jackpot.level} - ¥${jackpot.amount} (${jackpot.type})`);
            });
            
            // 分析各等级Jackpot触发情况
            const levels = ['mini', 'minor', 'major', 'grand', 'super'];
            console.log('\n📈 各等级Jackpot触发统计:');
            levels.forEach(level => {
                const count = jackpotFound.filter(j => j.level === level).length;
                const percentage = ((count / totalGames) * 100).toFixed(2);
                console.log(`${level}: ${count}次 (${percentage}%)`);
            });
        } else {
            console.log('\n😞 本次测试未触发任何Jackpot');
            console.log('建议: 继续测试或检查概率设置');
        }
        
        // Jackpot概率分析
        console.log('\n🎯 理论Jackpot概率:');
        console.log('Mini: 5% (1/20局)');
        console.log('Minor: 3% (1/33局)'); 
        console.log('Major: 1% (1/100局)');
        console.log('Grand: 0.5% (1/200局)');
        console.log('Super: 0.1% (1/1000局)');
        
        const actualMiniRate = (jackpotFound.filter(j => j.level === 'mini').length / totalGames * 100).toFixed(2);
        const actualMinorRate = (jackpotFound.filter(j => j.level === 'minor').length / totalGames * 100).toFixed(2);
        
        console.log('\n📊 实际触发率 vs 理论概率:');
        console.log(`Mini: ${actualMiniRate}% (理论5%)`);
        console.log(`Minor: ${actualMinorRate}% (理论3%)`);
        
    } catch (error) {
        console.log('❌ 测试失败:', error.message);
    }
}

testJackpot();