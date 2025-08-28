import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "../styles/Login.css";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const { login, user, isAdmin, loading, error } = useAuth();
  const navigate = useNavigate();

  // 如果用户已登录，根据角色重定向
  useEffect(() => {
    if (user) {
      if (isAdmin) {
        navigate("/admin");
      } else {
        navigate("/game");
      }
    }
  }, [user, isAdmin, navigate]);

  // 处理登录表单提交
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!username || !password) {
      setErrorMessage("请输入用户名和密码");
      return;
    }

    try {
      const response = await login(username, password);
      // 登录成功后根据用户角色重定向
      if (response.user.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/game");
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "登录失败，请检查用户名和密码");
    }
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title">欢迎登录</h2>
        <form className="login-form" onSubmit={handleSubmit}>
          {(errorMessage || error) && (
            <div className="error-message">{errorMessage || error}</div>
          )}
          <div className="form-group">
            <label htmlFor="username">用户名</label>
            <input
              type="text"
              id="username"
              className="form-control"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">密码</label>
            <input
              type="password"
              id="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary login-btn">
            登录
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;