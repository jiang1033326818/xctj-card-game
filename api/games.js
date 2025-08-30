// 游戏逻辑模块 - 重构版本
// 此文件为兼容性接口，实际功能已拆分到games目录下的单独模块

// 导入拆分后的游戏模块
const {
  handleGame,
  handleAnimalsGame,
  handleSlotGame,
  getGameRecords,
  getTopPlayers
} = require("./games/index");

// 直接导出拆分后的模块函数，保持API兼容性
module.exports = {
  handleGame,
  handleAnimalsGame,
  handleSlotGame,
  getGameRecords,
  getTopPlayers
};

// 模块重构说明：
// 
// 原始的games.js文件已被拆分为以下模块：
// 
// 1. games/base.js - 游戏基础处理器
//    - BaseGameHandler类提供通用功能
//    - 用户验证、余额检查、押注验证
//    - 余额更新、游戏记录、响应处理
//    - 加权随机选择等通用方法
//
// 2. games/xctj.js - 喜从天降游戏模块
//    - XCTJGameHandler类继承自BaseGameHandler
//    - 实现喜从天降游戏逻辑
//    - 花色配置和赔率设置
//
// 3. games/animals.js - 飞禽走兽游戏模块
//    - AnimalsGameHandler类继承自BaseGameHandler
//    - 实现飞禽走兽游戏逻辑
//    - 动物配置、飞禽走兽分类、复杂赔付计算
//
// 4. games/slot.js - 多福多财角子机游戏模块
//    - SlotGameHandler类继承自BaseGameHandler
//    - 实现角子机游戏逻辑
//    - 5轴×3行，243种连线方式
//    - 免费旋转、Jackpot累积奖池、Wild符号
//
// 5. games/records.js - 游戏记录和排行榜模块
//    - 游戏记录查询和排行榜数据获取
//    - 权限控制（管理员可查看所有记录）
//
// 6. games/index.js - 统一入口文件
//    - 导出所有游戏处理函数
//    - 提供模块说明和使用指南
//
// 优势：
// - 代码结构更清晰，每个游戏独立维护
// - 新增游戏时只需创建新文件，不影响现有游戏
// - 公共功能复用，减少代码重复
// - 更好的单元测试和调试支持
// - 符合模块化架构设计原则