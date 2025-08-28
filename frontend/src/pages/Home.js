import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "../styles/Home.css";

const Home = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  // 处理登出
  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // 跳转到游戏页面
  const goToGame = () => {
    navigate("/game");
  };

  // 跳转到管理页面（仅管理员可见）
  const goToAdmin = () => {
    navigate("/admin");
  };

  return (
    <div className="home-container">
      <div className="home-header">
        <h1>欢迎来到卡牌游戏</h1>
        <div className="user-info">
          <span>
            欢迎, {user?.username} | 余额: {user?.balance || 0}
          </span>
          <button className="btn btn-secondary" onClick={handleLogout}>
            退出登录
          </button>
        </div>
      </div>

      <div className="home-content">
        <div className="card game-card">
          <div className="card-content">
            <h2>开始游戏</h2>
            <p>准备好挑战了吗？点击下方按钮开始游戏！</p>
            <button className="btn btn-primary" onClick={goToGame}>
              进入游戏
            </button>
          </div>
        </div>

        {isAdmin && (
          <div className="card admin-card">
            <div className="card-content">
              <h2>管理后台</h2>
              <p>管理用户和查看游戏数据</p>
              <button className="btn btn-success" onClick={goToAdmin}>
                进入管理后台
              </button>
            </div>
          </div>
        )}

        <div className="card rules-card">
          <div className="card-content">
            <h2>游戏规则</h2>
            <div className="rules-content">
              <h3>基本规则</h3>
              <p>
                这是一个简单的卡牌游戏，玩家可以在不同的花色上下注，根据抽到的卡牌获得相应的奖励。
              </p>

              <h3>赔率说明</h3>
              <ul>
                <li>♠️ 黑桃：赔率 3.8</li>
                <li>♥️ 红心：赔率 3.7</li>
                <li>♣️ 梅花：赔率 3.6</li>
                <li>♦️ 方块：赔率 3.5</li>
                <li>🃏 王牌：赔率 100</li>
              </ul>

              <h3>如何玩</h3>
              <ol>
                <li>选择您想要下注的筹码金额</li>
                <li>在您想要下注的花色上点击</li>
                <li>点击"开始游戏"按钮</li>
                <li>等待结果并查看您是否赢得奖励</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;