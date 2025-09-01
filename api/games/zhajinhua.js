// 炸金花游戏模块
const BaseGameHandler = require("./base");
const { connectDB, getDB } = require("../database");

/**
 * 炸金花游戏处理器
 */
class ZhajinhuaGameHandler extends BaseGameHandler {
  constructor() {
    super();
  }

  /**
   * 处理炸金花游戏房间创建
   * @param {Object} req 请求对象
   * @param {Object} res 响应对象
   */
  async createRoom(req, res) {
    try {
      const user = await this.validateUserAndBalance(req, 0);
      if (!user) {
        return this.sendError(res, 401, "未授权");
      }

      const { roomName, chipAmount, maxBet, maxMengBet, baseBet } = req.body;

      // 验证参数
      if (!roomName || chipAmount <= 0 || maxBet <= 0 || baseBet <= 0) {
        return this.sendError(res, 400, "房间参数不正确");
      }

      if (maxMengBet <= 0 || maxMengBet > maxBet) {
        return this.sendError(res, 400, "焖牌下注量设置不正确");
      }

      // 连接数据库
      const database = getDB() || (await connectDB());

      // 创建房间
      const roomData = {
        room_id: this.generateRoomId(),
        room_name: roomName,
        creator: user.username,
        players: [{
          username: user.username,
          chips: chipAmount,
          status: 'waiting', // waiting, playing, folded, lost
          cards: [],
          is_creator: true
        }],
        max_players: 5,
        chip_amount: chipAmount,
        max_bet: maxBet,
        max_meng_bet: maxMengBet,
        base_bet: baseBet,
        current_round: 1,
        current_player_index: 0,
        current_bet: baseBet,
        pot: 0,
        game_status: 'waiting', // waiting, playing, finished
        created_at: new Date(),
        updated_at: new Date()
      };

      // 保存房间到数据库
      const result = await database.game_records.insertOne({
        game_type: "zhajinhua_room",
        room_data: roomData,
        created_at: new Date()
      });

      return this.sendSuccess(res, {
        success: true,
        room_id: roomData.room_id,
        message: "房间创建成功"
      });
    } catch (error) {
      console.error("创建房间错误:", error);
      return this.sendError(res, 500, "服务器错误");
    }
  }

  /**
   * 处理加入房间
   * @param {Object} req 请求对象
   * @param {Object} res 响应对象
   */
  async joinRoom(req, res) {
    try {
      const user = await this.validateUserAndBalance(req, 0);
      if (!user) {
        return this.sendError(res, 401, "未授权");
      }

      const { roomId } = req.body;

      if (!roomId) {
        return this.sendError(res, 400, "房间ID不能为空");
      }

      // 连接数据库
      const database = getDB() || (await connectDB());

      // 查找房间
      const roomRecord = await database.game_records.findOne({
        "room_data.room_id": roomId,
        game_type: "zhajinhua_room"
      });

      if (!roomRecord) {
        return this.sendError(res, 404, "房间不存在");
      }

      const roomData = roomRecord.room_data;

      // 检查房间状态
      if (roomData.game_status !== 'waiting') {
        return this.sendError(res, 400, "游戏已经开始，无法加入");
      }

      // 检查房间是否已满
      if (roomData.players.length >= roomData.max_players) {
        return this.sendError(res, 400, "房间已满");
      }

      // 检查玩家是否已在房间中
      const existingPlayer = roomData.players.find(p => p.username === user.username);
      if (existingPlayer) {
        return this.sendError(res, 400, "您已在房间中");
      }

      // 检查玩家余额是否足够
      if (user.balance < roomData.chip_amount) {
        return this.sendError(res, 400, "余额不足，无法加入房间");
      }

      // 添加玩家到房间
      roomData.players.push({
        username: user.username,
        chips: roomData.chip_amount,
        status: 'waiting',
        cards: [],
        is_creator: false
      });

      // 更新房间数据
      await database.game_records.updateOne(
        { _id: roomRecord._id },
        { 
          $set: { 
            "room_data": roomData,
            "room_data.updated_at": new Date()
          } 
        }
      );

      return this.sendSuccess(res, {
        success: true,
        message: "加入房间成功"
      });
    } catch (error) {
      console.error("加入房间错误:", error);
      return this.sendError(res, 500, "服务器错误");
    }
  }

  /**
   * 获取房间信息
   * @param {Object} req 请求对象
   * @param {Object} res 响应对象
   */
  async getRoomInfo(req, res) {
    try {
      const user = await this.validateUserAndBalance(req, 0);
      if (!user) {
        return this.sendError(res, 401, "未授权");
      }

      const { roomId } = req.query;

      if (!roomId) {
        return this.sendError(res, 400, "房间ID不能为空");
      }

      // 连接数据库
      const database = getDB() || (await connectDB());

      // 查找房间
      const roomRecord = await database.game_records.findOne({
        "room_data.room_id": roomId,
        game_type: "zhajinhua_room"
      });

      if (!roomRecord) {
        return this.sendError(res, 404, "房间不存在");
      }

      const roomData = roomRecord.room_data;

      // 隐藏其他玩家的底牌信息
      const sanitizedPlayers = roomData.players.map(player => {
        // 只有自己能看到自己的牌
        const showCards = player.username === user.username;
        return {
          ...player,
          cards: showCards ? player.cards : []
        };
      });

      const sanitizedRoomData = {
        ...roomData,
        players: sanitizedPlayers
      };

      return this.sendSuccess(res, {
        success: true,
        room: sanitizedRoomData
      });
    } catch (error) {
      console.error("获取房间信息错误:", error);
      return this.sendError(res, 500, "服务器错误");
    }
  }

  /**
   * 开始游戏
   * @param {Object} req 请求对象
   * @param {Object} res 响应对象
   */
  async startGame(req, res) {
    try {
      const user = await this.validateUserAndBalance(req, 0);
      if (!user) {
        return this.sendError(res, 401, "未授权");
      }

      const { roomId } = req.body;

      if (!roomId) {
        return this.sendError(res, 400, "房间ID不能为空");
      }

      // 连接数据库
      const database = getDB() || (await connectDB());

      // 查找房间
      const roomRecord = await database.game_records.findOne({
        "room_data.room_id": roomId,
        game_type: "zhajinhua_room"
      });

      if (!roomRecord) {
        return this.sendError(res, 404, "房间不存在");
      }

      const roomData = roomRecord.room_data;

      // 检查是否是房主
      if (roomData.creator !== user.username) {
        return this.sendError(res, 403, "只有房主可以开始游戏");
      }

      // 检查玩家数量
      if (roomData.players.length < 2) {
        return this.sendError(res, 400, "至少需要2名玩家才能开始游戏");
      }

      // 发牌
      const deck = this.createDeck();
      const shuffledDeck = this.shuffleDeck(deck);

      // 为每个玩家发3张牌
      let cardIndex = 0;
      roomData.players = roomData.players.map(player => {
        const cards = shuffledDeck.slice(cardIndex, cardIndex + 3);
        cardIndex += 3;
        return {
          ...player,
          cards: cards,
          status: 'playing'
        };
      });

      // 初始化游戏状态
      roomData.game_status = 'playing';
      roomData.current_round = 1;
      roomData.current_player_index = 0;
      roomData.current_bet = roomData.base_bet;
      roomData.pot = roomData.players.length * roomData.base_bet; // 所有玩家先下底注
      
      // 扣除底注
      for (let i = 0; i < roomData.players.length; i++) {
        roomData.players[i].chips -= roomData.base_bet;
      }

      // 更新房间数据
      await database.game_records.updateOne(
        { _id: roomRecord._id },
        { 
          $set: { 
            "room_data": roomData,
            "room_data.updated_at": new Date()
          } 
        }
      );

      // 记录游戏开始
      await this.recordGame({
        username: user.username,
        game_type: "zhajinhua",
        action: "start",
        room_id: roomId,
        amount: 0,
        win_amount: 0,
        old_balance: user.balance,
        new_balance: user.balance,
        balance_change: 0
      });

      return this.sendSuccess(res, {
        success: true,
        message: "游戏开始",
        room: roomData
      });
    } catch (error) {
      console.error("开始游戏错误:", error);
      return this.sendError(res, 500, "服务器错误");
    }
  }

  /**
   * 玩家操作（跟注、加注、焖牌、比牌、弃牌）
   * @param {Object} req 请求对象
   * @param {Object} res 响应对象
   */
  async playerAction(req, res) {
    try {
      const user = await this.validateUserAndBalance(req, 0);
      if (!user) {
        return this.sendError(res, 401, "未授权");
      }

      const { roomId, action, betAmount } = req.body;

      if (!roomId || !action) {
        return this.sendError(res, 400, "参数不完整");
      }

      // 连接数据库
      const database = getDB() || (await connectDB());

      // 查找房间
      const roomRecord = await database.game_records.findOne({
        "room_data.room_id": roomId,
        game_type: "zhajinhua_room"
      });

      if (!roomRecord) {
        return this.sendError(res, 404, "房间不存在");
      }

      const roomData = roomRecord.room_data;

      // 检查游戏状态
      if (roomData.game_status !== 'playing') {
        return this.sendError(res, 400, "游戏未开始或已结束");
      }

      // 找到当前玩家
      const currentPlayerIndex = roomData.players.findIndex(p => p.username === user.username);
      if (currentPlayerIndex === -1) {
        return this.sendError(res, 400, "您不在游戏中");
      }

      const player = roomData.players[currentPlayerIndex];

      // 检查是否轮到该玩家
      if (currentPlayerIndex !== roomData.current_player_index) {
        return this.sendError(res, 400, "还未轮到您操作");
      }

      // 执行操作
      switch (action) {
        case 'call': // 跟注
          return await this.handleCall(roomRecord, roomData, player, currentPlayerIndex, database, res);
        case 'raise': // 加注
          if (!betAmount || betAmount <= 0) {
            return this.sendError(res, 400, "加注金额不正确");
          }
          return await this.handleRaise(roomRecord, roomData, player, currentPlayerIndex, betAmount, database, res);
        case 'meng': // 焖牌
          return await this.handleMeng(roomRecord, roomData, player, currentPlayerIndex, database, res);
        case 'compare': // 比牌
          const { targetPlayer } = req.body;
          if (!targetPlayer) {
            return this.sendError(res, 400, "请选择要比牌的玩家");
          }
          return await this.handleCompare(roomRecord, roomData, player, currentPlayerIndex, targetPlayer, database, res);
        case 'fold': // 弃牌
          return await this.handleFold(roomRecord, roomData, player, currentPlayerIndex, database, res);
        default:
          return this.sendError(res, 400, "无效的操作");
      }
    } catch (error) {
      console.error("玩家操作错误:", error);
      return this.sendError(res, 500, "服务器错误");
    }
  }

  /**
   * 处理跟注
   */
  async handleCall(roomRecord, roomData, player, playerIndex, database, res) {
    // 检查玩家筹码是否足够跟注
    if (player.chips < roomData.current_bet) {
      return this.sendError(res, 400, "筹码不足，无法跟注");
    }

    // 扣除筹码
    player.chips -= roomData.current_bet;
    roomData.pot += roomData.current_bet;

    // 更新玩家状态
    roomData.players[playerIndex] = player;

    // 移动到下一个玩家
    roomData.current_player_index = (roomData.current_player_index + 1) % roomData.players.length;

    // 跳过已弃牌或已输的玩家
    let attempts = 0;
    while (attempts < roomData.players.length && 
           (roomData.players[roomData.current_player_index].status === 'folded' || 
            roomData.players[roomData.current_player_index].status === 'lost')) {
      roomData.current_player_index = (roomData.current_player_index + 1) % roomData.players.length;
      attempts++;
    }

    // 更新房间数据
    await database.game_records.updateOne(
      { _id: roomRecord._id },
      { 
        $set: { 
          "room_data": roomData,
          "room_data.updated_at": new Date()
        } 
      }
    );

    // 检查游戏是否结束
    const activePlayers = roomData.players.filter(p => p.status === 'playing');
    if (activePlayers.length === 1) {
      return await this.endGame(roomRecord, roomData, activePlayers[0], database, res);
    }

    return this.sendSuccess(res, {
      success: true,
      message: "跟注成功",
      room: roomData
    });
  }

  /**
   * 处理加注
   */
  async handleRaise(roomRecord, roomData, player, playerIndex, betAmount, database, res) {
    // 检查加注金额是否符合规则
    if (betAmount > roomData.max_bet) {
      return this.sendError(res, 400, `加注金额不能超过${roomData.max_bet}`);
    }

    if (betAmount < roomData.current_bet) {
      return this.sendError(res, 400, `加注金额不能低于当前注额${roomData.current_bet}`);
    }

    // 检查玩家筹码是否足够
    if (player.chips < betAmount) {
      return this.sendError(res, 400, "筹码不足，无法加注");
    }

    // 扣除筹码
    player.chips -= betAmount;
    roomData.pot += betAmount;
    roomData.current_bet = betAmount;

    // 更新玩家状态
    roomData.players[playerIndex] = player;

    // 移动到下一个玩家
    roomData.current_player_index = (roomData.current_player_index + 1) % roomData.players.length;

    // 跳过已弃牌或已输的玩家
    let attempts = 0;
    while (attempts < roomData.players.length && 
           (roomData.players[roomData.current_player_index].status === 'folded' || 
            roomData.players[roomData.current_player_index].status === 'lost')) {
      roomData.current_player_index = (roomData.current_player_index + 1) % roomData.players.length;
      attempts++;
    }

    // 更新房间数据
    await database.game_records.updateOne(
      { _id: roomRecord._id },
      { 
        $set: { 
          "room_data": roomData,
          "room_data.updated_at": new Date()
        } 
      }
    );

    // 检查游戏是否结束
    const activePlayers = roomData.players.filter(p => p.status === 'playing');
    if (activePlayers.length === 1) {
      return await this.endGame(roomRecord, roomData, activePlayers[0], database, res);
    }

    return this.sendSuccess(res, {
      success: true,
      message: "加注成功",
      room: roomData
    });
  }

  /**
   * 处理焖牌
   */
  async handleMeng(roomRecord, roomData, player, playerIndex, database, res) {
    // 检查玩家是否可以焖牌（第一轮且当前注额未超过焖牌上限）
    if (roomData.current_round > 1 || roomData.current_bet > roomData.max_meng_bet) {
      return this.sendError(res, 400, "当前无法焖牌");
    }

    // 检查玩家筹码是否足够跟注
    if (player.chips < roomData.current_bet) {
      return this.sendError(res, 400, "筹码不足，无法焖牌");
    }

    // 扣除筹码
    player.chips -= roomData.current_bet;
    roomData.pot += roomData.current_bet;

    // 更新玩家状态
    roomData.players[playerIndex] = player;

    // 移动到下一个玩家
    roomData.current_player_index = (roomData.current_player_index + 1) % roomData.players.length;

    // 跳过已弃牌或已输的玩家
    let attempts = 0;
    while (attempts < roomData.players.length && 
           (roomData.players[roomData.current_player_index].status === 'folded' || 
            roomData.players[roomData.current_player_index].status === 'lost')) {
      roomData.current_player_index = (roomData.current_player_index + 1) % roomData.players.length;
      attempts++;
    }

    // 更新房间数据
    await database.game_records.updateOne(
      { _id: roomRecord._id },
      { 
        $set: { 
          "room_data": roomData,
          "room_data.updated_at": new Date()
        } 
      }
    );

    // 检查游戏是否结束
    const activePlayers = roomData.players.filter(p => p.status === 'playing');
    if (activePlayers.length === 1) {
      return await this.endGame(roomRecord, roomData, activePlayers[0], database, res);
    }

    return this.sendSuccess(res, {
      success: true,
      message: "焖牌成功",
      room: roomData
    });
  }

  /**
   * 处理比牌
   */
  async handleCompare(roomRecord, roomData, player, playerIndex, targetPlayerUsername, database, res) {
    // 检查玩家筹码是否足够跟注
    if (player.chips < roomData.current_bet) {
      return this.sendError(res, 400, "筹码不足，无法比牌");
    }

    // 找到目标玩家
    const targetPlayerIndex = roomData.players.findIndex(p => p.username === targetPlayerUsername);
    if (targetPlayerIndex === -1) {
      return this.sendError(res, 400, "目标玩家不存在");
    }

    const targetPlayer = roomData.players[targetPlayerIndex];

    // 检查目标玩家状态
    if (targetPlayer.status !== 'playing') {
      return this.sendError(res, 400, "目标玩家已弃牌或已输");
    }

    // 扣除筹码
    player.chips -= roomData.current_bet;
    roomData.pot += roomData.current_bet;

    // 比牌
    const result = this.compareCards(player.cards, targetPlayer.cards);
    let loserIndex = -1;

    if (result > 0) {
      // 当前玩家获胜
      targetPlayer.status = 'lost';
      targetPlayer.chips = 0;
      loserIndex = targetPlayerIndex;
    } else if (result < 0) {
      // 目标玩家获胜
      player.status = 'lost';
      player.chips = 0;
      loserIndex = playerIndex;
    } else {
      // 平局，通常不可能，但以防万一
      return this.sendError(res, 500, "比牌出现平局");
    }

    // 更新玩家状态
    roomData.players[playerIndex] = player;
    roomData.players[targetPlayerIndex] = targetPlayer;

    // 移动到下一个玩家
    roomData.current_player_index = (roomData.current_player_index + 1) % roomData.players.length;

    // 跳过已弃牌或已输的玩家
    let attempts = 0;
    while (attempts < roomData.players.length && 
           (roomData.players[roomData.current_player_index].status === 'folded' || 
            roomData.players[roomData.current_player_index].status === 'lost')) {
      roomData.current_player_index = (roomData.current_player_index + 1) % roomData.players.length;
      attempts++;
    }

    // 更新房间数据
    await database.game_records.updateOne(
      { _id: roomRecord._id },
      { 
        $set: { 
          "room_data": roomData,
          "room_data.updated_at": new Date()
        } 
      }
    );

    // 检查游戏是否结束
    const activePlayers = roomData.players.filter(p => p.status === 'playing');
    if (activePlayers.length === 1) {
      return await this.endGame(roomRecord, roomData, activePlayers[0], database, res);
    }

    return this.sendSuccess(res, {
      success: true,
      message: result > 0 ? "比牌获胜" : "比牌失败",
      loser: roomData.players[loserIndex].username,
      room: roomData
    });
  }

  /**
   * 处理弃牌
   */
  async handleFold(roomRecord, roomData, player, playerIndex, database, res) {
    // 更新玩家状态
    player.status = 'folded';
    roomData.players[playerIndex] = player;

    // 移动到下一个玩家
    roomData.current_player_index = (roomData.current_player_index + 1) % roomData.players.length;

    // 跳过已弃牌或已输的玩家
    let attempts = 0;
    while (attempts < roomData.players.length && 
           (roomData.players[roomData.current_player_index].status === 'folded' || 
            roomData.players[roomData.current_player_index].status === 'lost')) {
      roomData.current_player_index = (roomData.current_player_index + 1) % roomData.players.length;
      attempts++;
    }

    // 更新房间数据
    await database.game_records.updateOne(
      { _id: roomRecord._id },
      { 
        $set: { 
          "room_data": roomData,
          "room_data.updated_at": new Date()
        } 
      }
    );

    // 检查游戏是否结束
    const activePlayers = roomData.players.filter(p => p.status === 'playing');
    if (activePlayers.length === 1) {
      return await this.endGame(roomRecord, roomData, activePlayers[0], database, res);
    }

    return this.sendSuccess(res, {
      success: true,
      message: "弃牌成功",
      room: roomData
    });
  }

  /**
   * 结束游戏
   */
  async endGame(roomRecord, roomData, winner, database, res) {
    // 更新游戏状态
    roomData.game_status = 'finished';
    roomData.winner = winner.username;
    roomData.finished_at = new Date();

    // 更新房间数据
    await database.game_records.updateOne(
      { _id: roomRecord._id },
      { 
        $set: { 
          "room_data": roomData,
          "room_data.updated_at": new Date()
        } 
      }
    );

    // 更新赢家余额
    const { atomicUpdateUserBalance } = require("../auth");
    const updatedUser = await atomicUpdateUserBalance(winner.username, roomData.pot);
    
    // 记录游戏结果
    await this.recordGame({
      username: winner.username,
      game_type: "zhajinhua",
      action: "win",
      room_id: roomData.room_id,
      amount: 0,
      win_amount: roomData.pot,
      old_balance: updatedUser.balance - roomData.pot,
      new_balance: updatedUser.balance,
      balance_change: roomData.pot
    });

    return this.sendSuccess(res, {
      success: true,
      message: `${winner.username} 获胜`,
      winner: winner.username,
      prize: roomData.pot,
      room: roomData
    });
  }

  /**
   * 生成房间ID
   */
  generateRoomId() {
    return 'room_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 创建一副牌
   */
  createDeck() {
    const suits = ['♠', '♥', '♣', '♦'];
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const deck = [];
    
    for (let suit of suits) {
      for (let rank of ranks) {
        deck.push({ suit, rank });
      }
    }
    
    return deck;
  }

  /**
   * 洗牌
   */
  shuffleDeck(deck) {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * 比较牌型
   * 返回值: 1 表示第一手牌获胜, -1 表示第二手牌获胜, 0 表示平局
   */
  compareCards(cards1, cards2) {
    const rank1 = this.evaluateHand(cards1);
    const rank2 = this.evaluateHand(cards2);
    
    if (rank1.type > rank2.type) return 1;
    if (rank1.type < rank2.type) return -1;
    
    // 牌型相同，比较牌面大小
    for (let i = 0; i < rank1.values.length; i++) {
      if (rank1.values[i] > rank2.values[i]) return 1;
      if (rank1.values[i] < rank2.values[i]) return -1;
    }
    
    return 0; // 平局
  }

  /**
   * 评估牌型
   */
  evaluateHand(cards) {
    // 按牌面大小排序
    const sortedCards = [...cards].sort((a, b) => this.getCardValue(b) - this.getCardValue(a));
    const values = sortedCards.map(card => this.getCardValue(card));
    const suits = sortedCards.map(card => card.suit);
    
    // 判断是否同花
    const isFlush = suits.every(suit => suit === suits[0]);
    
    // 判断是否顺子
    const isStraight = this.isStraight(values);
    
    // 统计相同牌面的数量
    const valueCounts = {};
    values.forEach(value => {
      valueCounts[value] = (valueCounts[value] || 0) + 1;
    });
    
    const counts = Object.values(valueCounts).sort((a, b) => b - a);
    
    // 同花顺
    if (isFlush && isStraight) {
      return { type: 5, values }; // 同花顺
    }
    
    // 三条
    if (counts[0] === 3) {
      return { type: 4, values: [values[0]] }; // 三条
    }
    
    // 同花
    if (isFlush) {
      return { type: 3, values }; // 同花
    }
    
    // 顺子
    if (isStraight) {
      return { type: 2, values }; // 顺子
    }
    
    // 对子
    if (counts[0] === 2) {
      const pairValue = parseInt(Object.keys(valueCounts).find(key => valueCounts[key] === 2));
      const kicker = values.find(value => value !== pairValue);
      return { type: 1, values: [pairValue, kicker] }; // 对子
    }
    
    // 高牌
    return { type: 0, values }; // 高牌
  }

  /**
   * 获取牌面值
   */
  getCardValue(card) {
    const rankValues = {
      '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, 
      '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
    };
    return rankValues[card.rank];
  }

  /**
   * 判断是否为顺子
   */
  isStraight(values) {
    // 特殊情况：A,2,3
    if (values.includes(14) && values.includes(2) && values.includes(3)) {
      return true;
    }
    
    // 一般情况
    for (let i = 1; i < values.length; i++) {
      if (values[i] !== values[i-1] - 1) {
        return false;
      }
    }
    return true;
  }
}

// 创建实例并导出处理函数
const zhajinhuaHandler = new ZhajinhuaGameHandler();

module.exports = {
  createRoom: (req, res) => zhajinhuaHandler.createRoom(req, res),
  joinRoom: (req, res) => zhajinhuaHandler.joinRoom(req, res),
  getRoomInfo: (req, res) => zhajinhuaHandler.getRoomInfo(req, res),
  startGame: (req, res) => zhajinhuaHandler.startGame(req, res),
  playerAction: (req, res) => zhajinhuaHandler.playerAction(req, res)
};