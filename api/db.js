const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const path = require("path");

// 使用临时目录存储数据库
const dbPath = "/tmp/game.db";

let db = null;

function getDatabase() {
  if (!db) {
    db = new sqlite3.Database(dbPath);
    initializeDatabase();
  }
  return db;
}

function initializeDatabase() {
  db.serialize(() => {
    // 用户表
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      balance INTEGER DEFAULT 1000,
      is_admin BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME
    )`);

    // 游戏记录表
    db.run(`CREATE TABLE IF NOT EXISTS game_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      bet_amount INTEGER,
      result_suit TEXT,
      winnings INTEGER,
      balance_after INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    // 押注记录表
    db.run(`CREATE TABLE IF NOT EXISTS bet_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_record_id INTEGER,
      suit TEXT,
      amount INTEGER,
      FOREIGN KEY (game_record_id) REFERENCES game_records (id)
    )`);

    // 庄家统计表
    db.run(`CREATE TABLE IF NOT EXISTS house_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      total_games INTEGER DEFAULT 0,
      total_bets INTEGER DEFAULT 0,
      total_payouts INTEGER DEFAULT 0,
      house_profit INTEGER DEFAULT 0,
      hearts_count INTEGER DEFAULT 0,
      diamonds_count INTEGER DEFAULT 0,
      clubs_count INTEGER DEFAULT 0,
      spades_count INTEGER DEFAULT 0,
      joker_count INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 初始化庄家统计记录
    db.run(`INSERT OR IGNORE INTO house_stats (id) VALUES (1)`);

    // 创建默认管理员账户
    const adminPassword = bcrypt.hashSync("068162", 10);
    db.run(
      `INSERT OR IGNORE INTO users (username, password, balance, is_admin) 
       VALUES ('admin', ?, 10000, 1)`,
      [adminPassword]
    );

    db.run(
      `INSERT OR IGNORE INTO users (username, password, balance, is_admin) 
       VALUES ('laojiang', ?, 10000, 1)`,
      [adminPassword]
    );
  });
}

module.exports = { getDatabase };
