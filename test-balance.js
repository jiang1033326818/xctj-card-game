// 角子机平衡性测试脚本
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001';
let authToken = null;

// 登录获取token
async function login() {
    try {
        const response = await fetch(`${BASE_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'test', password: 'test' })
        });
        
        const result = await response.json();
        if (result.token) {
            authToken = result.token;
            console.log('✅ 登录成功');
            return true;
        } else {
            console.log('❌ 登录失败:', result.error);
            return false;
        }
    } catch (error) {
        console.log('❌ 登录错误:', error.message);
        return false;
    }
}

// 运行游戏测试
async function runGameTest(betAmount = 50, times = 10) {
    let totalBet = 0;
    let totalWin = 0;
    let totalGames = 0;
    let winCount = 0;
    let balanceChanges = [];
    
    console.log(`\n🎰 开始平衡性测试 - 投注金额: ${betAmount}, 测试次数: ${times}`);
    console.log('================================================');
    
    for (let i = 0; i < times; i++) {
        try {
            const response = await fetch(`${BASE_URL}/api/slot-game`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ bet_amount: betAmount })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                totalGames++;
                totalBet += betAmount;
                totalWin += (result.total_win || 0);
                
                const balanceChange = (result.total_win || 0) - betAmount;
                balanceChanges.push(balanceChange);
                
                if (result.wins && result.wins.length > 0) {
                    winCount++;
                }
                
                console.log(`第${i+1}局: 投注${betAmount} | 中奖${result.total_win || 0} | 连线${result.wins ? result.wins.length : 0}条 | 净收益${balanceChange} | 余额${result.new_balance}`);
                
                // 短暂延迟避免过快请求
                await new Promise(resolve => setTimeout(resolve, 100));
            } else {
                console.log(`第${i+1}局失败:`, result.error);
            }
        } catch (error) {
            console.log(`第${i+1}局错误:`, error.message);
        }
    }
    
    // 计算统计数据
    const rtp = totalBet > 0 ? (totalWin / totalBet * 100).toFixed(2) : 0;
    const houseEdge = (100 - rtp).toFixed(2);
    const winRate = totalGames > 0 ? (winCount / totalGames * 100).toFixed(2) : 0;
    const avgWin = winCount > 0 ? (totalWin / winCount).toFixed(2) : 0;
    const netResult = totalWin - totalBet;
    
    console.log('\n📊 测试结果统计');
    console.log('================================================');
    console.log(`总游戏局数: ${totalGames}`);
    console.log(`总投注金额: ¥${totalBet}`);
    console.log(`总中奖金额: ¥${totalWin}`);
    console.log(`净收益/损失: ¥${netResult} (${netResult > 0 ? '盈利' : '亏损'})`);
    console.log(`中奖局数: ${winCount} / ${totalGames}`);
    console.log(`中奖率: ${winRate}%`);
    console.log(`平均单次中奖: ¥${avgWin}`);
    console.log(`玩家回报率(RTP): ${rtp}%`);
    console.log(`庄家优势: ${houseEdge}%`);
    
    // 判断平衡性
    if (parseFloat(houseEdge) >= 10 && parseFloat(houseEdge) <= 20) {
        console.log('✅ 庄家优势合理 (10-20%)');
    } else if (parseFloat(houseEdge) < 10) {
        console.log('⚠️ 庄家优势偏低 (需要调高)');
    } else {
        console.log('⚠️ 庄家优势偏高 (需要调低)');
    }
    
    if (parseFloat(winRate) >= 30 && parseFloat(winRate) <= 70) {
        console.log('✅ 中奖率合理 (30-70%)');
    } else {
        console.log('⚠️ 中奖率需要调整');
    }
    
    return {
        totalGames,
        totalBet,
        totalWin,
        netResult,
        winCount,
        winRate: parseFloat(winRate),
        rtp: parseFloat(rtp),
        houseEdge: parseFloat(houseEdge),
        avgWin: parseFloat(avgWin)
    };
}

// 主测试函数
async function main() {
    console.log('🔧 角子机平衡性测试工具');
    console.log('测试目标: 庄家优势 10-20%, 中奖率 30-70%');
    
    if (!await login()) {
        return;
    }
    
    // 测试不同投注金额
    const testResults = [];
    
    // 小额投注测试
    console.log('\n💰 小额投注测试 (50元)');
    const result1 = await runGameTest(50, 20);
    testResults.push({label: '50元投注', ...result1});
    
    // 中额投注测试  
    console.log('\n💰 中额投注测试 (100元)');
    const result2 = await runGameTest(100, 15);
    testResults.push({label: '100元投注', ...result2});
    
    // 大额投注测试
    console.log('\n💰 大额投注测试 (200元)');
    const result3 = await runGameTest(200, 10);
    testResults.push({label: '200元投注', ...result3});
    
    // 综合统计
    console.log('\n🎯 综合测试结果');
    console.log('================================================');
    
    let totalAllBet = 0;
    let totalAllWin = 0;
    let totalAllGames = 0;
    let totalAllWinCount = 0;
    
    testResults.forEach(result => {
        totalAllBet += result.totalBet;
        totalAllWin += result.totalWin;
        totalAllGames += result.totalGames;
        totalAllWinCount += result.winCount;
        
        console.log(`${result.label}: RTP=${result.rtp}%, 庄家优势=${result.houseEdge}%, 中奖率=${result.winRate}%`);
    });
    
    const overallRTP = (totalAllWin / totalAllBet * 100).toFixed(2);
    const overallHouseEdge = (100 - overallRTP).toFixed(2);
    const overallWinRate = (totalAllWinCount / totalAllGames * 100).toFixed(2);
    
    console.log('\n📈 整体平均数据:');
    console.log(`总局数: ${totalAllGames}, 总投注: ¥${totalAllBet}, 总中奖: ¥${totalAllWin}`);
    console.log(`整体RTP: ${overallRTP}%, 庄家优势: ${overallHouseEdge}%, 中奖率: ${overallWinRate}%`);
    
    // 最终评估
    console.log('\n🏆 最终评估:');
    if (parseFloat(overallHouseEdge) >= 10 && parseFloat(overallHouseEdge) <= 20) {
        console.log('✅ 游戏平衡性良好！庄家优势在合理范围内');
    } else {
        console.log('❌ 游戏平衡性需要调整！');
        if (parseFloat(overallHouseEdge) < 10) {
            console.log('   建议: 降低中奖倍数或减少连线数量');
        } else {
            console.log('   建议: 提高中奖倍数或增加连线数量');
        }
    }
}

// 运行测试
main().catch(console.error);