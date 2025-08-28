import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { gameApi } from "../services/api";
import "../styles/Game.css";

// 筹码选项
const CHIP_OPTIONS = [1, 5, 10, 50, 100];

// 花色选项
const SUIT_OPTIONS = [
  { id: "spade", name: "黑桃", symbol: "♠️", odds: 3.8 },
  { id: "heart", name: "红心", symbol: "♥️", odds: 3.7 },
  { id: "club", name: "梅花", symbol: "♣️", odds: 3.6 },
  { id: "diamond", name: "方块", symbol: "♦️", odds: 3.5 },
  { id: "joker", name: "王牌", symbol: "🃏", odds: 100 }
];

const Game = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // 状态管理
  const [selectedChip, setSelectedChip] = useState(10);
  const [bets, setBets] = useState({});
  const [gameResult, setGameResult] = useState(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [gameHistory, setGameHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(5);
  const [balance, setBalance] = useState(user?.balance || 0);
  
  // 初始化 - 从localStorage加载上次选择的筹码
  useEffect(() => {
    const savedChip = localStorage.getItem("selectedChip");
    if (savedChip) {
      setSelectedChip(parseInt(savedChip));
    }
    
    // 加载游戏历史
    loadGameHistory();
  }, [currentPage]);
  
  // 加载游戏历史记录
  const loadGameHistory = async () => {
    try {
      setLoading(true);
      const response = await gameApi.getGameHistory();
      const history = response.data.records || [];
      
      // 计算总页数
      setTotalPages(Math.ceil(history.length / pageSize));
      
      // 获取当前页的记录
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      setGameHistory(history.slice(startIndex, endIndex));
      
      setLoading(false);
    } catch (err) {
      console.error("Failed to load game history:", err);
      setError("加载游戏历史失败");
      setLoading(false);
    }
  };
  
  // 处理筹码选择
  const handleChipSelect = (chip) => {
    setSelectedChip(chip);
    localStorage.setItem("selectedChip", chip.toString());
  };
  
  // 处理下注
  const handlePlaceBet = (suitId) => {
    // 检查余额是否足够
    const totalBet = Object.values(bets).reduce((sum, bet) => sum + bet, 0) + selectedChip;
    if (totalBet > balance) {
      setError("余额不足");
      return;
    }
    
    setBets((prevBets) => ({
      ...prevBets,
      [suitId]: (prevBets[suitId] || 0) + selectedChip
    }));
    
    setError("");
  };
  
  // 清除所有下注
  const clearAllBets = () => {
    setBets({});
  };
  
  // 开始游戏
  const startGame = async () => {
    // 检查是否有下注
    if (Object.keys(bets).length === 0) {
      setError("请先下注");
      return;
    }
    
    try {
      setLoading(true);
      setError("");
      
      // 发送下注请求
      const response = await gameApi.playGame(bets);
      
      // 开始翻牌动画
      setIsFlipping(true);
      
      // 3秒后显示结果
      setTimeout(() => {
        setGameResult(response.data);
        setIsFlipping(false);
        
        // 更新余额
        setBalance(response.data.newBalance);
        
        // 重新加载游戏历史
        loadGameHistory();
        
        // 清除下注
        setBets({});
      }, 3000);
      
    } catch (err) {
      console.error("Game error:", err);
      setError(err.response?.data?.message || "游戏出错，请重试");
      setIsFlipping(false);
    } finally {
      setLoading(false);
    }
  };
  
  // 处理登出
  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };
  
  // 返回主页
  const goToHome = () => {
    navigate("/home");
  };
  
  // 渲染花色卡片
  const renderSuitCard = (suit) => {
    const betAmount = bets[suit.id] || 0;
    
    return (
      <div 
        key={suit.id} 
        className={`suit-card ${betAmount > 0 ? 'has-bet' : ''}`}
        onClick={() => handlePlaceBet(suit.id)}
      >
        <div className="suit-symbol">{suit.symbol}</div>
        <div className="suit-name">{suit.name}</div>
        <div className="suit-odds">赔率: {suit.odds}x</div>
        {betAmount > 0 && (
          <div className="bet-amount">{betAmount}</div>
        )}
      </div>
    );
  };
  
  // 渲染游戏结果
  const renderGameResult = () => {
    if (!gameResult) return null;
    
    const { card, winAmount } = gameResult;
    const isWin = winAmount > 0;
    
    return (
      <div className={`game-result ${isWin ? 'win' : 'lose'}`}>
        <h3>{isWin ? '恭喜，您赢了！' : '很遗憾，您输了！'}</h3>
        <div className="result-card">
          <div className="card-symbol">{card.symbol}</div>
          <div className="card-name">{card.name}</div>
        </div>
        {isWin && <p className="win-amount">赢得: {winAmount}</p>}
      </div>
    );
  };
  
  // 渲染游戏历史
  const renderGameHistory = () => {
    if (loading) {
      return <div className="loading-history">加载历史记录中...</div>;
    }
    
    if (gameHistory.length === 0) {
      return <div className="no-history">暂无游戏记录</div>;
    }
    
    return (
      <>
        <div className="history-list">
          {gameHistory.map((record, index) => (
            <div key={index} className="history-item">
              <div className="history-card-symbol">{record.card.symbol}</div>
              <div className="history-details">
                <div>时间: {new Date(record.timestamp).toLocaleString()}</div>
                <div>下注: {Object.entries(record.bets).map(([suit, amount]) => 
                  `${SUIT_OPTIONS.find(s => s.id === suit)?.symbol || suit}:${amount}`
                ).join(', ')}</div>
                <div className={record.winAmount > 0 ? 'win-text' : 'lose-text'}>
                  {record.winAmount > 0 ? `赢得: ${record.winAmount}` : '输了'}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* 分页控件 */}
        <div className="pagination">
          <button 
            disabled={currentPage === 1} 
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          >
            上一页
          </button>
          <span>{currentPage} / {totalPages}</span>
          <button 
            disabled={currentPage === totalPages} 
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          >
            下一页
          </button>
        </div>
      </>
    );
  };
  
  return (
    <div className="game-container">
      {/* 头部 */}
      <div className="game-header">
        <button className="btn btn-secondary" onClick={goToHome}>
          返回首页
        </button>
        <div className="user-balance">
          余额: {balance}
        </div>
        <button className="btn btn-secondary" onClick={handleLogout}>
          退出登录
        </button>
      </div>
      
      {/* 游戏区域 */}
      <div className="game-content">
        {/* 控制区 */}
        <div className="game-area">
          <h2>卡牌游戏</h2>
          
          {error && <div className="error-message">{error}</div>}
          
          <div className="card-display">
            {isFlipping ? (
              <div className="flipping-card">
                <div className="card-inner">
                  <div className="card-front"></div>
                  <div className="card-back"></div>
                </div>
              </div>
            ) : (
              renderGameResult()
            )}
          </div>
          
          <div className="game-controls">
            <button 
              className="btn btn-primary start-btn" 
              onClick={startGame}
              disabled={loading || isFlipping || Object.keys(bets).length === 0}
            >
              {loading ? '处理中...' : '开始游戏'}
            </button>
            <button 
              className="btn btn-secondary clear-btn"
              onClick={clearAllBets}
              disabled={loading || isFlipping || Object.keys(bets).length === 0}
            >
              清除下注
            </button>
          </div>
        </div>
        
        {/* 下注区 */}
        <div className="bet-area">
          <h3>选择下注</h3>
          
          <div className="suits-container">
            {SUIT_OPTIONS.map(suit => renderSuitCard(suit))}
          </div>
          
          <h3>选择筹码</h3>
          <div className="chips-container">
            {CHIP_OPTIONS.map(chip => (
              <div 
                key={chip}
                className={`chip ${selectedChip === chip ? 'selected' : ''}`}
                onClick={() => handleChipSelect(chip)}
              >
                {chip}
              </div>
            ))}
          </div>
        </div>
        
        {/* 历史记录区 */}
        <div className="history-area">
          <h3>游戏历史</h3>
          {renderGameHistory()}
        </div>
      </div>
    </div>
  );
};

export default Game;