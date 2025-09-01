// 游戏模块统一入口
// 将所有游戏模块统一导出，便于路由调用

const { handleGame } = require("./xctj");
const { handleAnimalsGame } = require("./animals");
const { handleSlotGame, getSlotJackpot } = require("./slot");
const { getGameRecords, getTopPlayers } = require("./records");
const { createRoom, joinRoom, getRoomInfo, startGame, playerAction } = require("./zhajinhua");

module.exports = {
  // 喜从天降游戏
  handleGame,

  // 飞禽走兽游戏
  handleAnimalsGame,

  // 多福多财角子机游戏
  handleSlotGame,
  getSlotJackpot,

  // 炸金花游戏
  createRoom,
  joinRoom,
  getRoomInfo,
  startGame,
  playerAction,

  // 游戏记录和排行榜
  getGameRecords,
  getTopPlayers
};

// 游戏模块说明：
//
// 1. base.js - 游戏基础处理器，提供所有游戏的通用功能
//    - 用户验证和余额检查
//    - 押注参数验证
//    - 余额更新
//    - 游戏记录保存
//    - 响应处理
//    - 加权随机选择
//
// 2. xctj.js - 喜从天降游戏模块
//    - 继承自BaseGameHandler
//    - 花色配置和赔率设置
//    - 游戏逻辑处理
//
// 3. animals.js - 飞禽走兽游戏模块
//    - 继承自BaseGameHandler
//    - 动物配置和赔率设置
//    - 飞禽走兽分类处理
//    - 复杂赔付计算
//
// 4. slot.js - 多福多财角子机游戏模块
//    - 继承自BaseGameHandler
//    - 5轴×3行，243种连线方式
//    - 免费旋转、Jackpot累积奖池、Wild符号
//
// 5. zhajinhua.js - 炸金花游戏模块
//    - 继承自BaseGameHandler
//    - 房间管理、实时对战
//    - 牌型比较、筹码管理
//
// 6. records.js - 游戏记录和排行榜模块
//    - 游戏记录查询
//    - 排行榜数据获取
//    - 权限控制（管理员可查看所有记录）
//
// 7. index.js - 统一入口文件
//    - 导出所有游戏处理函数
//    - 提供模块说明和使用指南
//
// 添加新游戏的步骤：
// 1. 在games目录下创建新游戏文件（如poker.js）
// 2. 继承BaseGameHandler类实现游戏逻辑
// 3. 在index.js中导入并导出新游戏的处理函数
// 4. 在routes.js中添加新游戏的路由