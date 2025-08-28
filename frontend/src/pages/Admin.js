import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { adminApi } from "../services/api";
import "../styles/Admin.css";

const Admin = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  // 状态管理
  const [users, setUsers] = useState([]);
  const [gameRecords, setGameRecords] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("users");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(10);
  
  // 余额修改状态
  const [selectedUser, setSelectedUser] = useState(null);
  const [newBalance, setNewBalance] = useState("");
  const [updateSuccess, setUpdateSuccess] = useState(false);
  
  // 初始化加载数据
  useEffect(() => {
    // 检查是否是管理员
    if (!isAdmin) {
      navigate("/home");
      return;
    }
    
    loadData();
  }, [isAdmin, navigate, activeTab, currentPage]);
  
  // 加载数据
  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      
      // 加载统计数据
      const statsResponse = await adminApi.getStats();
      setStats(statsResponse.data);
      
      // 根据当前标签加载数据
      if (activeTab === "users") {
        const usersResponse = await adminApi.getUsers();
        setUsers(usersResponse.data.users || []);
      } else if (activeTab === "records") {
        const recordsResponse = await adminApi.getAllGameRecords();
        const records = recordsResponse.data.records || [];
        
        // 计算总页数
        setTotalPages(Math.ceil(records.length / pageSize));
        
        // 获取当前页的记录
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        setGameRecords(records.slice(startIndex, endIndex));
      }
      
      setLoading(false);
    } catch (err) {
      console.error("Failed to load admin data:", err);
      setError("加载数据失败");
      setLoading(false);
    }
  };
  
  // 处理标签切换
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };
  
  // 处理余额修改
  const handleBalanceUpdate = async (e) => {
    e.preventDefault();
    
    if (!selectedUser) {
      setError("请先选择用户");
      return;
    }
    
    if (!newBalance || isNaN(Number(newBalance))) {
      setError("请输入有效的余额数值");
      return;
    }
    
    try {
      setLoading(true);
      setError("");
      setUpdateSuccess(false);
      
      await adminApi.updateUserBalance(selectedUser.username, Number(newBalance));
      
      // 重新加载用户数据
      const usersResponse = await adminApi.getUsers();
      setUsers(usersResponse.data.users || []);
      
      setUpdateSuccess(true);
      setSelectedUser(null);
      setNewBalance("");
      
      setLoading(false);
    } catch (err) {
      console.error("Failed to update balance:", err);
      setError("更新余额失败");
      setUpdateSuccess(false);
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
  
  // 渲染统计信息
  const renderStats = () => {
    return (
      <div className="stats-container">
        <div className="stat-card">
          <h3>总用户数</h3>
          <div className="stat-value">{stats.totalUsers || 0}</div>
        </div>
        <div className="stat-card">
          <h3>总游戏次数</h3>
          <div className="stat-value">{stats.totalGames || 0}</div>
        </div>
        <div className="stat-card">
          <h3>总下注金额</h3>
          <div className="stat-value">{stats.totalBets || 0}</div>
        </div>
        <div className="stat-card">
          <h3>总派彩金额</h3>
          <div className="stat-value">{stats.totalPayouts || 0}</div>
        </div>
        <div className="stat-card">
          <h3>系统盈利</h3>
          <div className="stat-value">{(stats.totalBets || 0) - (stats.totalPayouts || 0)}</div>
        </div>
      </div>
    );
  };
  
  // 渲染用户列表
  const renderUsers = () => {
    if (users.length === 0) {
      return <div className="no-data">暂无用户数据</div>;
    }
    
    return (
      <div className="users-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>用户名</th>
              <th>角色</th>
              <th>余额</th>
              <th>注册时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.username}>
                <td>{user.username}</td>
                <td>{user.role === "admin" ? "管理员" : "普通用户"}</td>
                <td>{user.balance}</td>
                <td>{new Date(user.createdAt).toLocaleString()}</td>
                <td>
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      setSelectedUser(user);
                      setNewBalance(user.balance.toString());
                    }}
                  >
                    修改余额
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* 余额修改表单 */}
        {selectedUser && (
          <div className="balance-update-form">
            <h3>修改用户余额</h3>
            <form onSubmit={handleBalanceUpdate}>
              <div className="form-group">
                <label>用户名</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={selectedUser.username} 
                  disabled 
                />
              </div>
              <div className="form-group">
                <label>当前余额</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={selectedUser.balance} 
                  disabled 
                />
              </div>
              <div className="form-group">
                <label>新余额</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={newBalance} 
                  onChange={(e) => setNewBalance(e.target.value)}
                  required 
                />
              </div>
              <div className="form-buttons">
                <button type="submit" className="btn btn-success">
                  确认修改
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => {
                    setSelectedUser(null);
                    setNewBalance("");
                  }}
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  };
  
  // 渲染游戏记录
  const renderGameRecords = () => {
    if (gameRecords.length === 0) {
      return <div className="no-data">暂无游戏记录</div>;
    }
    
    return (
      <div className="records-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>用户名</th>
              <th>时间</th>
              <th>下注</th>
              <th>结果</th>
              <th>赢得金额</th>
            </tr>
          </thead>
          <tbody>
            {gameRecords.map((record, index) => (
              <tr key={index}>
                <td>{record.username}</td>
                <td>{new Date(record.timestamp).toLocaleString()}</td>
                <td>
                  {Object.entries(record.bets).map(([suit, amount]) => (
                    <div key={suit}>{suit}: {amount}</div>
                  ))}
                </td>
                <td>{record.card.name} {record.card.symbol}</td>
                <td className={record.winAmount > 0 ? "win-amount" : ""}>{record.winAmount}</td>
              </tr>
            ))}
          </tbody>
        </table>
        
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
      </div>
    );
  };
  
  return (
    <div className="admin-container">
      {/* 头部 */}
      <div className="admin-header">
        <h1>管理后台</h1>
        <div className="admin-actions">
          <button className="btn btn-secondary" onClick={goToHome}>
            返回首页
          </button>
          <button className="btn btn-secondary" onClick={handleLogout}>
            退出登录
          </button>
        </div>
      </div>
      
      {/* 统计信息 */}
      {renderStats()}
      
      {/* 错误和成功消息 */}
      {error && <div className="error-message">{error}</div>}
      {updateSuccess && <div className="success-message">余额更新成功</div>}
      
      {/* 标签切换 */}
      <div className="admin-tabs">
        <button 
          className={`tab-btn ${activeTab === "users" ? "active" : ""}`}
          onClick={() => handleTabChange("users")}
        >
          用户管理
        </button>
        <button 
          className={`tab-btn ${activeTab === "records" ? "active" : ""}`}
          onClick={() => handleTabChange("records")}
        >
          游戏记录
        </button>
      </div>
      
      {/* 内容区域 */}
      <div className="admin-content">
        {loading ? (
          <div className="loading">加载中...</div>
        ) : (
          <>
            {activeTab === "users" && renderUsers()}
            {activeTab === "records" && renderGameRecords()}
          </>
        )}
      </div>
    </div>
  );
};

export default Admin;