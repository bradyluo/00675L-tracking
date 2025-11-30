// ============================================
// 投資帳戶管理工具 - JavaScript
// ============================================

// 全局變數
let transactions = [];
let priceChart = null;

// ============================================
// 初始化
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // 設定今天的日期為預設值
    const today = new Date().toISOString().split('T'),[object Object],;
    document.getElementById('date').value = today;

    // 載入交易記錄
    loadRecords();

    // 綁定表單提交事件
    document.getElementById('transactionForm').addEventListener('submit', addTransaction);

    // 初始化圖表
    initializeChart();
});

// ============================================
// 表單相關函數
// ============================================

// 更新標的選項
function updateSecurityOptions() {
    const transactionType = document.getElementById('transactionType').value;
    const securitySelect = document.getElementById('security');

    if (transactionType === 'dividend') {
        securitySelect.value = '00720B';
        securitySelect.disabled = true;
    } else {
        securitySelect.disabled = false;
    }
}

// 新增交易記錄
function addTransaction(e) {
    e.preventDefault();

    const transaction = {
        date: document.getElementById('date').value,
        type: document.getElementById('transactionType').value,
        security: document.getElementById('security').value,
        shares: parseInt(document.getElementById('shares').value),
        price: parseFloat(document.getElementById('price').value),
        id: Date.now()
    };

    // 驗證輸入
    if (!transaction.date || !transaction.type || !transaction.security || !transaction.shares || !transaction.price) {
        alert('請填寫所有必填欄位');
        return;
    }

    transactions.push(transaction);
    saveRecords();
    displayRecords();
    updateSummary();
    
    // 重置表單
    document.getElementById('transactionForm').reset();
    document.getElementById('date').value = today = new Date().toISOString().split('T'),[object Object],;
    
    alert('交易記錄已新增');
}

// ============================================
// 交易記錄管理
// ============================================

// 顯示交易記錄
function displayRecords() {
    const tbody = document.getElementById('recordsBody');
    tbody.innerHTML = '';

    if (transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #999;">尚無交易記錄</td></tr>';
        return;
    }

    const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

    sortedTransactions.forEach(transaction => {
        const row = tbody.insertRow();
        const amount = transaction.shares * transaction.price * 1000; // 每張1000股

        const typeText = transaction.type === 'buy' ? '買入' : 
                        transaction.type === 'sell' ? '賣出' : '配息';
        const securityText = transaction.security === '00675L' ? '富邦加權正2 (00675L)' : 
                            '元大投資級公司債 (00720B)';

        row.innerHTML = `
            <td>${transaction.date}</td>
            <td>${typeText}</td>
            <td>${securityText}</td>
            <td>${transaction.shares}</td>
            <td>NT$ ${transaction.price.toFixed(2)}</td>
            <td>NT$ ${amount.toLocaleString('zh-TW', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</td>
            <td><button class="btn-delete" onclick="deleteTransaction(${transaction.id})">刪除</button></td>
        `;
    });
}

// 刪除交易記錄
function deleteTransaction(id) {
    if (confirm('確定要刪除此筆記錄嗎？')) {
        transactions = transactions.filter(t => t.id !== id);
        saveRecords();
        displayRecords();
        updateSummary();
    }
}

// ============================================
// 本地存儲
// ============================================

// 保存記錄到本地存儲
function saveRecords() {
    localStorage.setItem('investmentRecords', JSON.stringify(transactions));
}

// 從本地存儲載入記錄
function loadRecords() {
    const saved = localStorage.getItem('investmentRecords');
    if (saved) {
        try {
            transactions = JSON.parse(saved);
            displayRecords();
            updateSummary();
        } catch (e) {
            console.error('載入記錄失敗:', e);
        }
    }
}

// ============================================
// 摘要計算
// ============================================

// 更新摘要信息
function updateSummary() {
    // 計算持倉信息
    const holdings = calculateHoldings();
    
    // 計算配息
    const totalDividend = calculateDividends();
    
    // 計算總投資額
    let totalInvested = 0;
    Object.values(holdings).forEach(h => {
        if (h.shares > 0) {
            totalInvested += h.totalCost;
        }
    });

    // 計算已實現損益
    const realizedPnL = calculateRealizedPnL(holdings);

    // 當前價格（模擬數據）
    const currentPrices = {
        '00675L': 18.5,  // 富邦加權正2
        '00720B': 98.5   // 元大投資級公司債
    };

    // 計算未實現損益和當前市值
    let currentValue = 0;
    let unrealizedPnL = 0;
    
    Object.keys(holdings).forEach(security => {
        if (holdings[security].shares > 0) {
            const marketValue = holdings[security].shares * currentPrices[security] * 1000;
            currentValue += marketValue;
            unrealizedPnL += marketValue - holdings[security].totalCost;
        }
    });

    // 計算總報酬率
    const totalReturn = totalInvested > 0 ? 
        ((unrealizedPnL + realizedPnL + totalDividend) / totalInvested * 100) : 0;

    // 更新UI - 摘要卡片
    updateSummaryCards(totalInvested, currentValue, totalDividend, unrealizedPnL, realizedPnL, totalReturn);

    // 更新持倉明細表
    updateHoldingsTable(holdings, currentPrices);
}

// 計算持倉
function calculateHoldings() {
    const holdings = {};

    transactions.forEach(t => {
        if (t.type === 'buy') {
            if (!holdings[t.security]) {
                holdings[t.security] = { shares: 0, totalCost: 0 };
            }
            holdings[t.security].shares += t.shares;
            holdings[t.security].totalCost += t.shares * t.price * 1000;
        } else if (t.type === 'sell') {
            if (!holdings[t.security]) {
                holdings[t.security] = { shares: 0, totalCost: 0 };
            }
            holdings[t.security].shares -= t.shares;
            
            // 計算賣出的成本（以平均成本計算）
            const avgCost = holdings[t.security].totalCost / ((holdings[t.security].shares + t.shares) * 1000);
            holdings[t.security].totalCost -= t.shares * avgCost * 1000;
        }
    });

    return holdings;
}

// 計算配息
function calculateDividends() {
    let totalDividend = 0;
    transactions.forEach(t => {
        if (t.type === 'dividend') {
            totalDividend += t.shares * t.price * 1000;
        }
    });
    return totalDividend;
}

// 計算已實現損益
function calculateRealizedPnL(holdings) {
    let realizedPnL = 0;
    const soldTransactions = transactions.filter(t => t.type === 'sell');

    soldTransactions.forEach(sell => {
        // 找到該證券的買入交易
        const buyTransactions = transactions.filter(t => t.type === 'buy' && t.security === sell.security && t.date <= sell.date);
        
        if (buyTransactions.length > 0) {
            // 計算平均買入成本
            let totalBuyShares = 0;
            let totalBuyCost = 0;
            
            buyTransactions.forEach(buy => {
                totalBuyShares += buy.shares;
                totalBuyCost += buy.shares * buy.price * 1000;
            });
            
            const avgBuyCost = totalBuyCost / (totalBuyShares * 1000);
            const sellRevenue = sell.shares * sell.price * 1000;
            const sellCost = sell.shares * avgBuyCost * 1000;
            
            realizedPnL += sellRevenue - sellCost;
        }
    });

    return realizedPnL;
}

// 更新摘要卡片
function updateSummaryCards(totalInvested, currentValue, totalDividend, unrealizedPnL, realizedPnL, totalReturn) {
    document.getElementById('totalInvested').textContent = 
        `NT$ ${totalInvested.toLocaleString('zh-TW', {minimumFractionDigits: 0, maximumFractionDigits: 0})}`;
    
    document.getElementById('currentValue').textContent = 
        `NT$ ${currentValue.toLocaleString('zh-TW', {minimumFractionDigits: 0, maximumFractionDigits: 0})}`;
    
    document.getElementById('totalDividend').textContent = 
        `NT$ ${totalDividend.toLocaleString('zh-TW', {minimumFractionDigits: 0, maximumFractionDigits: 0})}`;

    const unrealizedPnLElement = document.getElementById('unrealizedPnL');
    unrealizedPnLElement.textContent = 
        `NT$ ${unrealizedPnL.toLocaleString('zh-TW', {minimumFractionDigits: 0, maximumFractionDigits: 0})}`;
    unrealizedPnLElement.className = unrealizedPnL >= 0 ? 'positive' : 'negative';

    const realizedPnLElement = document.getElementById('realizedPnL');
    realizedPnLElement.textContent = 
        `NT$ ${realizedPnL.toLocaleString('zh-TW', {minimumFractionDigits: 0, maximumFractionDigits: 0})}`;
    realizedPnLElement.className = realizedPnL >= 0 ? 'positive' : 'negative';

    const totalReturnElement = document.getElementById('totalReturn');
    totalReturnElement.textContent = `${totalReturn.toFixed(2)}%`;
    totalReturnElement.className = totalReturn >= 0 ? 'positive' : 'negative';
}

// 更新持倉明細表
function updateHoldingsTable(holdings, currentPrices) {
    const tbody = document.getElementById('holdingsBody');
    tbody.innerHTML = '';

    const securityNames = {
        '00675L': '富邦加權正2 (00675L)',
        '00720B': '元大投資級公司債 (00720B)'
    };

    Object.keys(holdings).forEach(security => {
        if (holdings[security].shares > 0) {
            const h = holdings[security];
            const avgCost = h.totalCost / (h.shares * 1000);
            const currentPrice = currentPrices[security];
            const marketValue = h.shares * currentPrice * 1000;
            const pnl = marketValue - h.totalCost;
            const returnRate = (pnl / h.totalCost * 100);

            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${securityNames[security]}</td>
                <td>${h.shares}</td>
                <td>NT$ ${avgCost.toFixed(2)}</td>
                <td>NT$ ${currentPrice.toFixed(2)}</td>
                <td>NT$ ${marketValue.toLocaleString('zh-TW', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</td>
                <td class="${pnl >= 0 ? 'positive' : 'negative'}">NT$ ${pnl.toLocaleString('zh-TW', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</td>
                <td class="${returnRate >= 0 ? 'positive' : 'negative'}">${returnRate.toFixed(2)}%</td>
            `;
        }
    });

    if (tbody.children.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #999;">暫無持倉</td></tr>';
    }
}

// ============================================
// 圖表相關函數
// ============================================

// 初始化圖表
function initializeChart() {
    const ctx = document.getElementById('priceChart');
    if (!ctx) return;

    const historicalData = generateHistoricalData();
    
    priceChart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: historicalData.dates,
            datasets: [
                {
                    label: '富邦加權正2 (00675L)',
                    data: historicalData.prices00675L,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.1,
                    fill: false,
                    borderWidth: 2,
                    pointRadius: 0
                },
                {
                    label: 'TAIEX (台灣加權指數)',
                    data: historicalData.pricesTAIEX,
                    borderColor: '#764ba2',
                    backgroundColor: 'rgba(118, 75, 162, 0.1)',
                    tension: 0.1,
                    fill: false,
                    borderWidth: 2,
                    pointRadius: 0
                },
                {
                    label: '60MA (00675L)',
                    data: historicalData.ma60_00675L,
                    borderColor: '#f39c12',
                    borderDash: [5, 5],
                    fill: false,
                    borderWidth: 1.5,
                    pointRadius: 0
                },
                {
                    label: '240MA (00675L)',
                    data: historicalData.ma240_00675L,
                    borderColor: '#e74c3c',
                    borderDash: [5, 5],
                    fill: false,
                    borderWidth: 1.5,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 15
                    }
                },
                title: {
                    display: true,
                    text: '股價歷史走勢及技術分析 (2020年至今)',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: '價格 (NT$)'
                    }
                },
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: '日期'
                    }
                }
            }
        }
    });

    updateDivergenceTable(historicalData);
}

// 生成歷史數據
function generateHistoricalData() {
    const dates = [];
    const prices00675L = [];
    const pricesTAIEX = [];
    const ma60_00675L = [];
    const ma240_00675L = [];

    const startDate = new Date(2020, 0, 1);
    let currentDate = new Date(startDate);
    let basePrice00675L = 10;
    let basePriceTAIEX = 12000;
    let dayCount = 0;

    while (currentDate <= new Date()) {
        // 只添加交易日（跳過週末）
        if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
            dates.push(currentDate.toISOString().split('T'),[object Object],);
            
            // 模擬價格波動 - 使用更現實的波動
            const trend00675L = Math.sin(dayCount / 100) * 0.1;
            const randomChange00675L = (Math.random() - 0.5) * 0.3 + trend00675L;
            
            const trendTAIEX = Math.sin(dayCount / 100) * 50;
            const randomChangeTAIEX = (Math.random() - 0.5) * 50 + trendTAIEX;
            
            basePrice00675L += randomChange00675L;
            basePriceTAIEX += randomChangeTAIEX;
            
            prices00675L.push(Math.max(basePrice00675L, 5));
            pricesTAIEX.push(Math.max(basePriceTAIEX, 10000));
            
            dayCount++;
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
    }

    // 計算移動平均線
    for (let i = 0; i < prices00675L.length; i++) {
        if (i < 59) {
            ma60_00675L.push(null);
        } else {
            const sum60 = prices00675L.slice(i - 59, i + 1).reduce((a, b) => a + b, 0);
            ma60_00675L.push(sum60 / 60);
        }

        if (i < 239) {
            ma240_00675L.push(null);
        } else {
            const sum240 = prices00675L.slice(i - 239, i + 1).reduce((a, b) => a + b, 0);
            ma240_00675L.push(sum240 / 240);
        }
    }

    return {
        dates,
        prices00675L,
        pricesTAIEX,
        ma60_00675L,
        ma240_00675L
    };
}

// 更新圖表顯示
function updateChart() {
    const show00675L = document.getElementById('show00675L').checked;
    const showTWSE = document.getElementById('showTWSE').checked;

    if (priceChart) {
        priceChart.data.datasets,[object Object],hidden = !show00675L;
        priceChart.data.datasets,[object Object],hidden = !showTWSE;
        priceChart.data.datasets,[object Object],hidden = !show00675L;
        priceChart.data.datasets,[object Object],hidden = !show00675L;
        priceChart.update();
    }
}

// 更新乖離率表
function updateDivergenceTable(historicalData) {
    const tbody = document.getElementById('divergenceBody');
    tbody.innerHTML = '';

    const lastIndex = historicalData.prices00675L.length - 1;
    const currentPrice00675L = historicalData.prices00675L[lastIndex];
    const ma60 = historicalData.ma60_00675L[lastIndex];
    const ma240 = historicalData.ma240_00675L[lastIndex];

    const divergence60 = ma60 ? ((currentPrice00675L - ma60) / ma60 * 100) : 0;
    const divergence240 = ma240 ? ((currentPrice00675L - ma240) / ma240 * 100) : 0;

    const row = tbody.insertRow();
    row.innerHTML = `
        <td>富邦加權正2 (00675L)</td>
        <td>NT$ ${currentPrice00675L.toFixed(2)}</td>
        <td>NT$ ${ma60 ? ma60.toFixed(2) : 'N/A'}</td>
        <td class="${divergence60 >= 0 ? 'positive' : 'negative'}">${divergence60.toFixed(2)}%</td>
        <td>NT$ ${ma240 ? ma240.toFixed(2) : 'N/A'}</td>
        <td class="${divergence240 >= 0 ? 'positive' : 'negative'}">${divergence240.toFixed(2)}%</td>
    `;
}
