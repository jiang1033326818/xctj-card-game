import React, { createContext, useState, useEffect, useContext } from "react";
import { userApi } from "../services/api";

// 创建认证上下文
const AuthContext = createContext(null);

// 认证提供者组件
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 检查用户是否已登录
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await userApi.getCurrentUser();
        setUser(response.data);
        setError(null);
      } catch (err) {
        console.error("Authentication error:", err);
        setError("认证失败，请重新登录");
        localStorage.removeItem("token");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // 登录方法
  const login = async (username, password) => {
    setLoading(true);
    try {
      const response = await userApi.login(username, password);
      localStorage.setItem("token", response.data.token);
      setUser(response.data.user);
      setError(null);
      return response.data;
    } catch (err) {
      console.error("Login error:", err);
      setError(err.response?.data?.message || "登录失败，请检查用户名和密码");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 注册方法
  const register = async (username, password) => {
    setLoading(true);
    try {
      const response = await userApi.register(username, password);
      localStorage.setItem("token", response.data.token);
      setUser(response.data.user);
      setError(null);
      return response.data;
    } catch (err) {
      console.error("Registration error:", err);
      setError(err.response?.data?.message || "注册失败，请稍后再试");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 登出方法
  const logout = async () => {
    await userApi.logout();
    setUser(null);
  };

  // 提供的上下文值
  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    isAdmin: user?.role === "admin",
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// 自定义钩子，用于访问认证上下文
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;