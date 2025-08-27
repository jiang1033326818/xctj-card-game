class RouletteGame {
  constructor() {
    // 美式轮盘数字序列（按轮盘顺序）
    this.rouletteNumbers = [
      0,
      28,
      9,
      26,
      30,
      11,
      7,
      20,
      32,
      17,
      5,
      22,
      34,
      15,
      3,
      24,
      36,
      13,
      1,
      "00",
      27,
      10,
      25,
      29,
      12,
      8,
      19,
      31,
      18,
      6,
      21,
      33,
      16,
      4,
      23,
      35,
      14,
      2
    ];

    // 数字颜色映射
    this.numberColors = {
      0: "green",
      "00": "green",
      1: "red",
      2: "black",
      3: "red",
      4: "black",
      5: "red",
      6: "black",
      7: "red",
      8: "black",
      9: "red",
      10: "black",
      11: "black",
      12: "red",
      13: "black",
      14: "red",
      15: "black",
      16: "red",
      17: "black",
      18: "red",
      19: "red",
      20: "black",
      21: "red",
      22: "black",
      23: "red",
      24: "black",
      25: "red",
      26: "black",
      27: "red",
      28: "black",
      29: "black",
      30: "red",
      31: "black",
      32: "red",
      33: "black",
      34: "red",
      35: "black",
      36: "red"
    };

    // 游戏状态
    this.balance = 1000;
    this.currentBets = {};
    this.selectedChip = 1;
    this.gameState = "betting";
    this.history = [];
    this.currentStripPosition = 0;

    // 统计数据
    this.stats = {
      totalGames: 0,
      houseProfit: 0,
      totalPlayerBets: 0,
      totalPlayerWins: 0,
      betTypeStats: {}
    };

    this.init();
  }

  init() {
    this.createNumberStrip();
    this.createBettingGrid();
    this.bindEvents();
    this.updateDisplay();
    this.loadStats();
  }

  createNumberStrip() {
    const strip = document.getElementById("numberStrip");
    strip.innerHTML = "";

    // 创建多个重复的数字序列
    const repeats = 10;
    for (let r = 0; r < repeats; r++) {
      this.rouletteNumbers.forEach(num => {
        const cell = document.createElement("div");
        cell.className = `number-cell ${this.numberColors[num]}`;
        cell.textContent = num;
        strip.appendChild(cell);
      });
    }

    // 设置初始位置
    this.currentStripPosition = -(80 * 38 * 5);
    strip.style.transform = `translateX(${this.currentStripPosition}px)`;
  }

  createBettingGrid() {
    const numbersGrid = document.getElementById("numbersGrid");
    if (!numbersGrid) return;

    numbersGrid.innerHTML = "";

    for (let i = 1; i <= 36; i++) {
      const cell = document.createElement("div");
      cell.className = `bet-cell ${this.numberColors[i]}`;
      cell.textContent = i;
      cell.dataset.bet = i;
      numbersGrid.appendChild(cell);
    }
  }

  bindEvents() {
    document.getElementById("playerView").addEventListener("click", () => {
      this.switchInterface("player");
    });
    document.getElementById("houseView").addEventListener("click", () => {
      this.switchInterface("house");
    });

    document.querySelectorAll(".chip").forEach(chip => {
      chip.addEventListener("click", e => {
        document
          .querySelectorAll(".chip")
          .forEach(c => c.classList.remove("selected"));
        e.target.classList.add("selected");
        this.selectedChip = parseInt(e.target.dataset.value);
      });
    });

    document.querySelector('.chip[data-value="1"]').classList.add("selected");

    document.querySelectorAll(".bet-cell").forEach(cell => {
      cell.addEventListener("click", e => {
        this.placeBet(e.target.dataset.bet);
      });
    });

    document.getElementById("spinWheel").addEventListener("click", () => {
      this.spinWheel();
    });
    document.getElementById("clearBets").addEventListener("click", () => {
      this.clearBets();
    });
    document.getElementById("resetStats").addEventListener("click", () => {
      this.resetStats();
    });
  }

  switchInterface(type) {
    document
      .querySelectorAll(".interface")
      .forEach(i => i.classList.remove("active"));
    document
      .querySelectorAll(".nav-btn")
      .forEach(b => b.classList.remove("active"));

    if (type === "player") {
      document.getElementById("playerInterface").classList.add("active");
      document.getElementById("playerView").classList.add("active");
    } else {
      document.getElementById("houseInterface").classList.add("active");
      document.getElementById("houseView").classList.add("active");
      this.updateStatsDisplay();
    }
  }

  placeBet(betType) {
    if (this.gameState !== "betting") return;
    if (this.balance < this.selectedChip) {
      alert("余额不足！");
      return;
    }

    this.balance -= this.selectedChip;
    this.currentBets[betType] =
      (this.currentBets[betType] || 0) + this.selectedChip;

    this.updateDisplay();
    this.updateBetDisplay();
  }

  clearBets() {
    if (this.gameState !== "betting") return;

    Object.values(this.currentBets).forEach(amount => {
      this.balance += amount;
    });

    this.currentBets = {};
    this.updateDisplay();
    this.updateBetDisplay();
  }

  spinWheel() {
    if (this.gameState !== "betting") return;
    if (Object.keys(this.currentBets).length === 0) {
      alert("请先下注！");
      return;
    }

    this.gameState = "spinning";
    this.updateDisplay();

    const randomMove = Math.random() * 3040 + 2000;
    this.currentStripPosition -= randomMove;

    const strip = document.getElementById("numberStrip");
    strip.style.transition =
      "transform 3s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
    strip.style.transform = `translateX(${this.currentStripPosition}px)`;

    setTimeout(() => {
      this.finishSpin();
    }, 3000);
  }

  finishSpin() {
    this.gameState = "finished";

    const result = this.getResultFromPosition();
    const winnings = this.calculateWinnings(result);
    this.balance += winnings;

    this.updateStats(result, winnings);

    this.history.unshift(result);
    if (this.history.length > 20) {
      this.history.pop();
    }

    this.showResult(result, winnings);
    this.currentBets = {};

    setTimeout(() => {
      this.gameState = "betting";
      this.updateDisplay();
      this.updateBetDisplay();
      document.getElementById("result").classList.add("hidden");
    }, 3000);
  }

  getResultFromPosition() {
    const containerWidth = document.querySelector(".number-strip-container")
      .offsetWidth;
    const pointerPosition = containerWidth / 2;
    const relativePosition = pointerPosition - this.currentStripPosition;
    const cellWidth = 80;
    const cellIndex = Math.floor(relativePosition / cellWidth);
    const numberIndex = cellIndex % this.rouletteNumbers.length;
    return this.rouletteNumbers[numberIndex];
  }

  calculateWinnings(result) {
    let totalWinnings = 0;

    Object.entries(this.currentBets).forEach(([betType, amount]) => {
      const payout = this.getPayoutRatio(betType, result);
      if (payout > 0) {
        totalWinnings += amount * (payout + 1);
      }
    });

    return totalWinnings;
  }

  getPayoutRatio(betType, result) {
    if (betType == result) return 35;

    if (betType === "red" && this.numberColors[result] === "red") return 1;
    if (betType === "black" && this.numberColors[result] === "black") return 1;

    if (
      betType === "odd" &&
      result !== 0 &&
      result !== "00" &&
      result % 2 === 1
    )
      return 1;
    if (
      betType === "even" &&
      result !== 0 &&
      result !== "00" &&
      result % 2 === 0
    )
      return 1;

    if (betType === "1-18" && result >= 1 && result <= 18) return 1;
    if (betType === "19-36" && result >= 19 && result <= 36) return 1;

    if (betType === "1st12" && result >= 1 && result <= 12) return 2;
    if (betType === "2nd12" && result >= 13 && result <= 24) return 2;
    if (betType === "3rd12" && result >= 25 && result <= 36) return 2;

    if (
      betType === "col1" &&
      result % 3 === 1 &&
      result !== 0 &&
      result !== "00"
    )
      return 2;
    if (
      betType === "col2" &&
      result % 3 === 2 &&
      result !== 0 &&
      result !== "00"
    )
      return 2;
    if (
      betType === "col3" &&
      result % 3 === 0 &&
      result !== 0 &&
      result !== "00"
    )
      return 2;

    return 0;
  }

  showResult(result, winnings) {
    const resultDiv = document.getElementById("result");
    const resultNumber = resultDiv.querySelector(".result-number");
    const resultText = resultDiv.querySelector(".result-text");

    resultNumber.textContent = result;
    resultNumber.className = `result-number ${this.numberColors[result]}`;

    if (winnings > 0) {
      resultText.textContent = `恭喜！您赢得了 $${winnings}`;
    } else {
      resultText.textContent = "很遗憾，您没有中奖";
    }

    resultDiv.classList.remove("hidden");
  }

  updateStats(result, winnings) {
    const totalBetAmount = Object.values(this.currentBets).reduce(
      (sum, amount) => sum + amount,
      0
    );

    this.stats.totalGames++;
    this.stats.totalPlayerBets += totalBetAmount;
    this.stats.totalPlayerWins += winnings;
    this.stats.houseProfit += totalBetAmount - winnings;

    Object.keys(this.currentBets).forEach(betType => {
      if (!this.stats.betTypeStats[betType]) {
        this.stats.betTypeStats[betType] = { count: 0, profit: 0 };
      }
      this.stats.betTypeStats[betType].count++;
      this.stats.betTypeStats[betType].profit +=
        this.currentBets[betType] -
        (this.getPayoutRatio(betType, result) > 0
          ? this.currentBets[betType] *
            (this.getPayoutRatio(betType, result) + 1)
          : 0);
    });

    this.saveStats();
  }

  updateDisplay() {
    document.getElementById("balance").textContent = this.balance;
    document.getElementById("gameState").textContent =
      this.gameState === "betting"
        ? "等待下注"
        : this.gameState === "spinning" ? "轮盘转动中..." : "结算中";

    this.updateHistoryDisplay();
  }

  updateBetDisplay() {
    const betsList = document.getElementById("betsList");
    const totalBet = document.getElementById("totalBet");

    betsList.innerHTML = "";
    let total = 0;

    Object.entries(this.currentBets).forEach(([betType, amount]) => {
      const item = document.createElement("div");
      item.className = "bet-item";
      item.innerHTML = `<span>${betType}</span><span>$${amount}</span>`;
      betsList.appendChild(item);
      total += amount;
    });

    totalBet.textContent = total;

    document.querySelectorAll(".bet-amount").forEach(el => el.remove());

    Object.entries(this.currentBets).forEach(([betType, amount]) => {
      const cell = document.querySelector(`[data-bet="${betType}"]`);
      if (cell) {
        const amountEl = document.createElement("div");
        amountEl.className = "bet-amount";
        amountEl.textContent = amount;
        cell.appendChild(amountEl);
      }
    });
  }

  updateHistoryDisplay() {
    const historyList = document.getElementById("historyList");
    historyList.innerHTML = "";

    this.history.forEach(num => {
      const item = document.createElement("div");
      item.className = `history-item ${this.numberColors[num]}`;
      item.textContent = num;
      historyList.appendChild(item);
    });
  }

  updateStatsDisplay() {
    document.getElementById("houseProfit").textContent = `$${this.stats
      .houseProfit}`;
    document.getElementById("totalGames").textContent = this.stats.totalGames;
    document.getElementById("totalPlayerBets").textContent = `$${this.stats
      .totalPlayerBets}`;
    document.getElementById("totalPlayerWins").textContent = `$${this.stats
      .totalPlayerWins}`;

    const houseEdge =
      this.stats.totalPlayerBets > 0
        ? (this.stats.houseProfit / this.stats.totalPlayerBets * 100).toFixed(2)
        : 0;
    document.getElementById("houseEdge").textContent = `${houseEdge}%`;

    const avgProfit =
      this.stats.totalGames > 0
        ? (this.stats.houseProfit / this.stats.totalGames).toFixed(2)
        : 0;
    document.getElementById("avgProfit").textContent = `$${avgProfit}`;

    const betTypeStats = document.getElementById("betTypeStats");
    betTypeStats.innerHTML = "";

    Object.entries(this.stats.betTypeStats).forEach(([betType, stats]) => {
      const row = document.createElement("div");
      row.className = "table-row";
      row.innerHTML = `
        <span>${betType}</span>
        <span>${stats.count}</span>
        <span>$${stats.profit}</span>
      `;
      betTypeStats.appendChild(row);
    });
  }

  saveStats() {
    localStorage.setItem("rouletteStats", JSON.stringify(this.stats));
  }

  loadStats() {
    const saved = localStorage.getItem("rouletteStats");
    if (saved) {
      this.stats = JSON.parse(saved);
    }
  }

  resetStats() {
    if (confirm("确定要重置所有统计数据吗？")) {
      this.stats = {
        totalGames: 0,
        houseProfit: 0,
        totalPlayerBets: 0,
        totalPlayerWins: 0,
        betTypeStats: {}
      };
      this.saveStats();
      this.updateStatsDisplay();
    }
  }
}

// 启动游戏
document.addEventListener("DOMContentLoaded", () => {
  new RouletteGame();
});
