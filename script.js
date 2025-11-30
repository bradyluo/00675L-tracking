// ================================
// 全域變數
// ================================
let records = [];               // 所有交易記錄
let holdings = {};              // 當前持倉
let totalDividend = 0;          // 已收配息

// ================================
// 初始化
// ================================
document.addEventListener("DOMContentLoaded", () => {
    loadRecords();
    displayRecords();
    updateSummary();

    // 預設日期＝今天
    document.getElementById('date').value = today();
});

// ================================
// 工具函式
// ================================
function today() {
    return new Date().toISOString().split("T")[0];
}

function formatNumber(n) {
    return Number(n).toLocaleString("zh-TW", { maximumFractionDigits: 2 });
}

// ================================
// 資料讀取 / 儲存
// ================================
function loadRecords() {
    const saved = localStorage.getItem("records");
    records = saved ? JSON.parse(saved) : [];
}

function saveRecords() {
    localStorage.setItem("records", JSON.stringify(records));
}

// ================================
// 新增交易記錄
// ================================
document.getElementById("transactionForm").addEventListener("submit", (e) => {
    e.preventDefault();

    const date = document.getElementById("date").value;
    const type = document.getElementById("transactionType").value;
    const security = document.getElementById("security").value;
    const shares = Number(document.getElementById("shares").value);
    const price = Number(document.getElementById("price").value);

    if (!date || !type || !security || !shares || !price) {
        alert("請確認所有欄位皆已填寫");
        return;
    }

    const amount = shares * 1000 * price;

    const record = {
        date,
        type,
        security,
        shares,
        price,
        amount
    };

    records.push(record);
    saveRecords();

    displayRecords();
    updateSummary();

    // 重置表單
    document.getElementById("transactionForm").reset();
    document.getElementById("date").value = today();
});

// ================================
// 顯示交易記錄
// ================================
function displayRecords() {
    const tbody = document.getElementById("recordsBody");
    tbody.innerHTML = "";

    records.forEach((rec, index) => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${rec.date}</td>
            <td>${rec.type}</td>
            <td>${rec.security}</td>
            <td>${rec.shares}</td>
            <td>${rec.price}</td>
            <td>${formatNumber(rec.amount)}</td>
            <td><button onclick="deleteRecord(${index})">刪除</button></td>
        `;

        tbody.appendChild(tr);
    });
}

// ================================
// 刪除記錄
// ================================
function deleteRecord(i) {
    if (!confirm("確定刪除嗎？")) return;

    records.splice(i, 1);
    saveRecords();

    displayRecords();
    updateSummary();
}

// ================================
// 計算持倉與損益
// ================================
function updateSummary() {
    holdings = {};
    totalDividend = 0;

    let realized = 0;

    for (const r of records) {
        if (!holdings[r.security]) {
            holdings[r.security] = {
                shares: 0,
                cost: 0
            };
        }

        if (r.type === "buy") {
            holdings[r.security].shares += r.shares * 1000;
            holdings[r.security].cost += r.amount;
        }

        if (r.type === "sell") {
            const avgCost = holdings[r.security].cost / holdings[r.security].shares;
            const sellQty = r.shares * 1000;

            realized += (r.price * sellQty - avgCost * sellQty);

            holdings[r.security].shares -= sellQty;
            holdings[r.security].cost -= avgCost * sellQty;
        }

        if (r.type === "dividend") {
            totalDividend += r.amount;
        }
    }

    // 計算當前市值（暫時以成本代替，因無股價 API）
    let totalInvested = 0;

    for (const s in holdings) {
        totalInvested += holdings[s].cost;
    }

    const currentValue = totalInvested;

    const totalReturn = currentValue + realized + totalDividend - totalInvested;

    document.getElementById("totalInvested").innerText = 
        "NT$ " + formatNumber(totalInvested);

    document.getElementById("currentValue").innerText = 
        "NT$ " + formatNumber(currentValue);

    document.getElementById("totalDividend").innerText = 
        "NT$ " + formatNumber(totalDividend);

    document.getElementById("realizedPnL").innerText = 
        "NT$ " + formatNumber(realized);

    document.getElementById("unrealizedPnL").innerText = 
        "NT$ " + formatNumber(currentValue - totalInvested);

    document.getElementById("totalReturn").innerText =
        ((totalReturn / totalInvested) * 100).toFixed(2) + "%";

    displayHoldings();
}

// ================================
// 顯示持倉
// ================================
function displayHoldings() {
    const tbody = document.getElementById("holdingsBody");
    tbody.innerHTML = "";

    for (const s in holdings) {
        const h = holdings[s];

        if (h.shares <= 0) continue;

        const avgCost = h.cost / h.shares;

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${s}</td>
            <td>${h.shares / 1000}</td>
            <td>${avgCost.toFixed(2)}</td>
            <td>-</td>
            <td>${formatNumber(h.cost)}</td>
            <td>-</td>
            <td>-</td>
        `;

        tbody.appendChild(tr);
    }
}

