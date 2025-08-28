import axios from "axios";

// 创建axios实例
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "",
  headers: {
    "Content-Type": "application/json"
  }
});

// 请求拦截器，添加token
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// 响应拦截器，处理错误
api.interceptors.response.use(
  response => {
    return response;
  },
  error => {
    // 如果是401错误，清除token并重定向到登录页
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// 用户相关API
export const userApi = {
  // 获取当前用户信息
  getCurrentUser: () => api.get("/api/user"),

  // 登录
  login: (username, password) => api.post("/api/login", { username, password }),

  // 注册
  register: (username, password) =>
    api.post("/api/register", { username, password }),

  // 登出
  logout: () => {
    localStorage.removeItem("token");
    return Promise.resolve();
  }
};

// 游戏相关API
export const gameApi = {
  // 获取游戏历史记录
  getGameHistory: () => api.get("/api/game_records"),

  // 玩游戏
  playGame: bets => api.post("/api/game", { bets })
};

// 管理员相关API
export const adminApi = {
  // 获取统计信息
  getStats: () => api.get("/api/admin/stats"),

  // 获取所有用户
  getUsers: () => api.get("/api/admin/users"),

  // 获取所有游戏记录
  getAllGameRecords: () => api.get("/api/admin/game_records"),

  // 更新用户余额
  updateUserBalance: (username, balance) =>
    api.post("/api/admin/update_balance", { username, balance })
};

export default api;
