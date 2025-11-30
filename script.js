// 全局變數
let transactions = [];
let priceChart = null;

// 初始化
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

    transactions.push(transaction);
    saveRecords();
    displayRecords();
    updateSummary();
    document.getElementById('transactionForm').reset();
    document.getElementById('date').value = new Date().toISOString().split('T'),[object Object],;
}

// 刪除交易記錄
function deleteTransaction(id) {
    transactions = transactions.filter(t => t.id !== id);
    saveRecords();
    displayRecords();
    updateSummary();
}

// 顯示交易記錄
function displayRecords() {
    const tbody = document.getElementById('recordsBody');
    tbody.innerHTML = '';

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

// 更新摘要信息
function updateSummary() {
    // 計算持倉信息
    const holdings = {};
    const soldShares = {};

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
            holdings[t.security].totalCost -= t.shares * t.price * 1000;

            if (!soldShares[t.security]) {
                soldShares[t.security] = { shares: 0, totalRevenue: 0 };
            }
            soldShares[t.security].shares += t.shares;
            soldShares[t.security].totalRevenue += t.shares * t.price * 1000;
        }
    });

    // 計算配息
    let totalDividend = 0;
    transactions.forEach(t => {
        if (t.type === 'dividend') {
            totalDividend += t.shares * t.price * 1000;
        }
    });

    // 計算總投資額
    let totalInvested = 0;
    Object.values(holdings).forEach(h => {
        if (h.shares > 0) {
            totalInvested += h.totalCost;
        }
    });

    // 計算已實現損益
    let realizedPnL = 0;
    Object.keys(soldShares).forEach(security => {
        const avgCost = holdings[security] ? holdings[security].totalCost / (holdings[security].shares + soldShares[security].shares) : 0;
        realizedPnL += soldShares[security].totalRevenue - (soldShares[security].shares * avgCost * 1000);
    });

    // 使用模擬的當前價格（實際應該從API獲取）
    const currentPrices = {
        '00675L': 18.5, // 富邦加權正2
        '00720B': 98.5  // 元大投資級公司債
    };

    let currentValue = 0;
    let unrealizedPnL = 0;
    Object.keys(holdings).forEach(security => {
        if (holdings[security].shares > 0) {
            const marketValue = holdings[security].shares * currentPrices[security] * 1000;
            currentValue += marketValue;
            unrealizedPnL += marketValue - holdings[security].totalCost;
        }
    });

    const totalReturn = totalInvested > 0 ? ((unrealizedPnL + realizedPnL + totalDividend) / totalInvested * 100) : 0;

    // 更新UI
    document.getElementById('totalInvested').textContent = `NT$ ${totalInvested.toLocaleString('zh-TW', {minimumFractionDigits: 0, maximumFractionDigits: 0})}`;
    document.getElementById('currentValue').textContent = `NT$ ${currentValue.toLocaleString('zh-TW', {minimumFractionDigits: 0, maximumFractionDigits: 0})}`;
    document.getElementById('totalDividend').textContent = `NT$ ${totalDividend.toLocaleString('zh-TW', {minimumFractionDigits: 0, maximumFractionDigits: 0})}`;
    
    const unrealizedPnLElement = document.getElementById('unrealizedPnL');
    unrealizedPnLElement.textContent = `NT$ ${unrealizedPnL.toLocaleString('zh-TW', {minimumFractionDigits: 0, maximumFractionDigits: 0})}`;
    unrealizedPnLElement.className = unrealizedPnL >= 0 ? 'positive' : 'negative';

    const realizedPnLElement = document.getElementById('realizedPnL');
    realizedPnLElement.textContent = `NT$ ${realizedPnL.toLocaleString('zh-TW', {minimumFractionDigits: 0, maximumFractionDigits: 0})}`;
    realizedPnLElement.className = realizedPnL >= 0 ? 'positive' : 'negative';

    const totalReturnElement = document.getElementById('totalReturn');
    totalReturnElement.textContent = `${totalReturn.toFixed(2)}%`;
    totalReturnElement.className = totalReturn >= 0 ? 'positive' : 'negative';

    // 更新持倉明細表
    updateHoldingsTable(holdings, currentPrices);
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
}

// 初始化圖表
async function initializeChart() {
    const ctx = document.getElementById('priceChart').getContext('2d');
    
    // 模擬歷史數據（2020年至今）
    const historicalData = generateHistoricalData();
    
    priceChart = new Chart(ctx, {
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
                    borderWidth: 2
                },
                {
                    label: 'TAIEX (台灣加權指數)',
                    data: historicalData.pricesTAIEX,
                    borderColor: '#764ba2',
                    backgroundColor: 'rgba(118, 75, 162, 0.1)',
                    tension: 0.1,
                    fill: false,
                    borderWidth: 2
                },
                {
                    label: '60MA (00675L)',
                    data: historicalData.ma60_00675L,
                    borderColor: '#f39c12',
                    borderDash: [5, 5],
                    fill: false,
                    borderWidth: 1,
                    pointRadius: 0
                },
                {
                    label: '240MA (00675L)',
                    data: historicalData.ma240_00675L,
                    borderColor: '#e74c3c',
                    borderDash: [5, 5],
                    fill: false,
                    borderWidth: 1,
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
                    position: 'top'
                },
                title: {
                    display: true,
                    text: '股價歷史走勢及技術分析 (2020年至今)'
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: '價格 (NT$)'
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

    while (currentDate <= new Date()) {
        // 只添加交易日（跳過週末）
        if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
            dates.push(currentDate.toISOString().split('T'),[object Object],);
            
            // 模擬價格波動
            const randomChange00675L = (Math.random() - 0.5) * 0.5;
            const randomChangeTAIEX = (Math.random() - 0.5) * 100;
            
            basePrice00675L += randomChange00675L;
            basePriceTAIEX += randomChangeTAIEX;
            
            prices00675L.push(Math.max(basePrice00675L, 5));
            pricesTAIEX.push(Math.max(basePriceTAIEX, 10000));
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
        <td class="${divergence60 >= 0 ? 'positive' : '
