/**
 * 2026_Htm_Yi 鮮果與文具商城 - 後台管理邏輯
 * 包含商品庫存與價格即時維護、圖片更新上傳、訂單歷程檢視與 CSV 匯出
 */

let adminProducts = [];
let adminOrders = [];

const LOCAL_PRODUCTS_KEY = '2026_Htm_Yi_products';
const LOCAL_ORDERS_KEY = '2026_Htm_Yi_orders';
const LOCAL_VERSION_KEY = '2026_Htm_Yi_version';

document.addEventListener('DOMContentLoaded', () => {
  if (!checkAdminAuth()) return;

  const targetSheet = document.getElementById('targetSheetName');
  if (targetSheet && typeof SPREADSHEET_NAME !== 'undefined') {
    targetSheet.textContent = SPREADSHEET_NAME;
  }

  loadData();
  bindAdminEvents();
});

// 管理者身分驗證（防止一般顧客誤闖）
function checkAdminAuth() {
  const sessionAuth = sessionStorage.getItem('admin_authenticated');
  if (sessionAuth === 'true') return true;

  const validPwd = typeof ADMIN_PASSWORD !== 'undefined' ? ADMIN_PASSWORD : 'admin';
  const inputPwd = prompt('🔐 請輸入後台管理密碼：\n（預設密碼為：admin，可於 config.js 自行更換）');

  if (inputPwd === validPwd) {
    sessionStorage.setItem('admin_authenticated', 'true');
    return true;
  } else {
    alert('❌ 密碼錯誤或取消登入，將為您導回商城首頁！');
    window.location.href = 'index.html';
    return false;
  }
}

function getSafeImageUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  return encodeURI(url);
}

// 智慧雙向容錯找圖：同時支援「根目錄」與「水果/、文具/」子目錄
function handleAdminImageFallback(imgEl, originalUrl) {
  const decoded = decodeURI(originalUrl || '');
  
  // 若原本沒有子目錄前綴，嘗試加上 水果/ 或 文具/
  if (!decoded.includes('/') && !decoded.startsWith('http')) {
    if (['青頻果.png', '水梨.png', '馥香梨.png'].includes(decoded)) {
      imgEl.onerror = () => { imgEl.onerror = null; };
      imgEl.src = encodeURI('水果/' + decoded);
      return;
    }
    if (['德制原木鉛筆.png', 'Pentet 原子筆Hybrid.png', '剪刀.png', '橡皮擦.png'].includes(decoded)) {
      imgEl.onerror = () => { imgEl.onerror = null; };
      imgEl.src = encodeURI('文具/' + decoded);
      return;
    }
  }

  // 若原本有子目錄前綴但找不到（如使用者把圖檔上傳在根目錄），嘗試剝除前綴
  if (decoded.includes('/') && !decoded.startsWith('http')) {
    const filename = decoded.split('/').pop();
    imgEl.onerror = () => { imgEl.onerror = null; };
    imgEl.src = encodeURI(filename);
    return;
  }

  imgEl.onerror = null;
}

// 載入資料
async function loadData() {
  // 1. 讀取商品（檢查版本號以確保本機設定能即刻生效）
  try {
    const cachedVersion = localStorage.getItem(LOCAL_VERSION_KEY);
    const cached = localStorage.getItem(LOCAL_PRODUCTS_KEY);

    if (cached && cachedVersion === (typeof CONFIG_VERSION !== 'undefined' ? CONFIG_VERSION : '1.0')) {
      adminProducts = JSON.parse(cached);
    } else {
      adminProducts = JSON.parse(JSON.stringify(INITIAL_PRODUCTS));
      localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(adminProducts));
      if (typeof CONFIG_VERSION !== 'undefined') {
        localStorage.setItem(LOCAL_VERSION_KEY, CONFIG_VERSION);
      }
    }
  } catch (e) {
    adminProducts = JSON.parse(JSON.stringify(INITIAL_PRODUCTS));
  }

  // 2. 讀取訂單
  try {
    adminOrders = JSON.parse(localStorage.getItem(LOCAL_ORDERS_KEY) || '[]');
  } catch (e) {
    adminOrders = [];
  }

  // 若有遠端 API 則優先向 Google Apps Script 獲取
  if (API_URL) {
    await fetchRemoteAdminData();
  }

  renderAdminStats();
  renderProductsTable();
  renderOrdersTable();
}

// 遠端拉取最新資料
async function fetchRemoteAdminData() {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'getAdminData' })
    });
    const data = await res.json();
    if (data.ok) {
      if (Array.isArray(data.products) && data.products.length > 0) {
        adminProducts = data.products;
        localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(adminProducts));
      }
      if (Array.isArray(data.orders)) {
        adminOrders = data.orders;
        localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(adminOrders));
      }
    } else {
      console.warn('遠端後端回傳錯誤：', data.error);
    }
  } catch (err) {
    console.warn('無法連線到遠端 GAS 後端，顯示本地儲存資料', err);
  }
}

// 統計數據渲染
function renderAdminStats() {
  const totalRevenue = adminOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const totalOrders = adminOrders.length;
  const avgOrder = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  const totalStock = adminProducts.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
  const lowStockCount = adminProducts.filter(p => p.stock > 0 && p.stock <= 10).length;

  const revEl = document.getElementById('statRevenue');
  const avgEl = document.getElementById('statAvg');
  const countEl = document.getElementById('statOrdersCount');
  const latestEl = document.getElementById('statLatestTime');
  const stockEl = document.getElementById('statTotalStock');
  const lowStockEl = document.getElementById('statLowStockCount');

  if (revEl) revEl.textContent = `NT$ ${totalRevenue.toLocaleString()}`;
  if (avgEl) avgEl.textContent = `平均客單價 NT$ ${avgOrder.toLocaleString()}`;
  if (countEl) countEl.textContent = `${totalOrders} 筆`;
  if (latestEl) {
    latestEl.textContent = totalOrders > 0 
      ? `最新訂單：${new Date(adminOrders[0].timestamp).toLocaleTimeString('zh-TW')}`
      : '尚無新訂單';
  }
  if (stockEl) stockEl.textContent = `${totalStock.toLocaleString()} 件`;
  if (lowStockEl) lowStockEl.textContent = `${lowStockCount} 項`;
}

// 渲染商品管理表格
function renderProductsTable() {
  const tbody = document.getElementById('productsTableBody');
  if (!tbody) return;

  tbody.innerHTML = adminProducts.map((p) => {
    const isOutOfStock = p.stock <= 0;
    const isLowStock = p.stock > 0 && p.stock <= 10;
    let statusBadge = isOutOfStock
      ? '<span style="color:#ef4444;font-weight:700;">● 已售罄</span>'
      : isLowStock
      ? '<span style="color:#f59e0b;font-weight:700;">● 庫存緊張</span>'
      : '<span style="color:#10b981;font-weight:700;">● 充足</span>';

    const safeImgSrc = getSafeImageUrl(p.imageUrl);

    return `
      <tr data-id="${p.id}">
        <td>
          <img src="${safeImgSrc}" alt="${p.name}" class="table-thumb" id="thumb-${p.id}" style="object-fit: contain; background: #fff;" onerror="handleAdminImageFallback(this, '${p.imageUrl}')" />
        </td>
        <td>
          <b>${p.name}</b><br/>
          <small style="color:var(--text-muted);">${p.id}</small>
        </td>
        <td>
          <span style="font-size:0.8rem;background:#f1f5f9;padding:3px 8px;border-radius:4px;">
            ${p.category === 'fruit' ? '🍎 水果' : '✏️ 文具'}
          </span>
        </td>
        <td>
          <input type="number" class="input-edit prod-price" data-id="${p.id}" value="${p.price}" min="0" />
        </td>
        <td>
          <input type="number" class="input-edit prod-stock" data-id="${p.id}" value="${p.stock}" min="0" />
        </td>
        <td>${p.unit}</td>
        <td>${statusBadge}</td>
        <td>
          <input type="text" class="form-input prod-img-url" data-id="${p.id}" value="${p.imageUrl}" style="font-size:0.75rem;padding:4px 8px;margin-bottom:4px;" placeholder="例如：青頻果.png 或 https://..." />
          <small style="display:block;color:var(--text-muted);font-size:0.7rem;">
            可填寫檔名（如「青頻果.png」）或網路圖片網址
          </small>
        </td>
      </tr>
    `;
  }).join('');
}

// 渲染訂單表格
function renderOrdersTable() {
  const tbody = document.getElementById('ordersTableBody');
  if (!tbody) return;

  if (adminOrders.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center;padding:30px;color:var(--text-muted);">
          目前尚無任何訂購紀錄。前台下單後將即時顯示於此。
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = adminOrders.map(o => {
    const itemsText = (o.items || []).map(i => `${i.name} × ${i.quantity} ${i.unit || ''}`).join('、 ');
    const timeStr = o.timestamp ? new Date(o.timestamp).toLocaleString('zh-TW') : '-';

    return `
      <tr>
        <td><code>${o.orderId || '-'}</code></td>
        <td style="white-space:nowrap;">${timeStr}</td>
        <td><b>${o.customer?.name || '-'}</b></td>
        <td>${o.customer?.phone || '-'}</td>
        <td style="max-width:300px;">${itemsText}</td>
        <td style="font-weight:800;color:#047857;">NT$ ${(o.totalAmount || 0).toLocaleString()}</td>
        <td style="color:var(--text-muted);font-size:0.8rem;">${o.customer?.note || '-'}</td>
      </tr>
    `;
  }).join('');
}

// 儲存商品更新
async function saveProductChanges() {
  const rows = document.querySelectorAll('#productsTableBody tr');
  const btn = document.getElementById('btnSaveAllProducts');

  if (btn) {
    btn.disabled = true;
    btn.textContent = '儲存中…';
  }

  rows.forEach(row => {
    const id = row.dataset.id;
    const price = Number(row.querySelector('.prod-price')?.value) || 0;
    const stock = Number(row.querySelector('.prod-stock')?.value) || 0;
    const imgUrl = (row.querySelector('.prod-img-url')?.value || '').trim();

    const prod = adminProducts.find(p => p.id === id);
    if (prod) {
      prod.price = price;
      prod.stock = stock;
      if (imgUrl) prod.imageUrl = imgUrl;
    }
  });

  // 儲存本地
  try {
    localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(adminProducts));
  } catch (err) {
    alert('⚠️ 本機儲存失敗：資料量過大（若含有大體積 Base64 圖片，請改用圖片檔名如 青頻果.png）');
  }

  // 若有雲端 API，同步至 Google 試算表
  if (API_URL) {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'updateProducts',
          products: adminProducts
        })
      });
      const result = await res.json();
      if (!result.ok) throw new Error(result.error || '雲端同步失敗');
      alert('✅ 商品價格、庫存與圖片已全數同步更新至 Google 試算表！');
    } catch (e) {
      alert('⚠️ 雲端試算表更新失敗：\n' + e.message + '\n\n【注意】若圖片使用從電腦上傳的 Base64 過長（超過 Google 試算表儲存格 50,000 字元限制），試算表會拒絕寫入。建議圖片使用本地檔案檔名（如「青頻果.png」）或雲端圖床連結！');
    }
  } else {
    alert('✅ 商品價格、庫存與圖片設定已更新（已儲存於本機快取中）！');
  }

  renderAdminStats();
  renderProductsTable();

  if (btn) {
    btn.disabled = false;
    btn.textContent = '💾 儲存商品庫存與價格變更';
  }
}

// 匯出訂單 CSV
function exportOrdersToCSV() {
  if (adminOrders.length === 0) {
    alert('目前沒有訂單可供匯出！');
    return;
  }

  // 欄位標題
  const headers = ['訂單編號', '下單時間', '訂購人', '電話', '購買品項明細', '總金額', '備註說明'];
  
  const rows = adminOrders.map(o => {
    const items = (o.items || []).map(i => `${i.name}*${i.quantity}`).join('; ');
    const time = o.timestamp ? new Date(o.timestamp).toLocaleString('zh-TW') : '';
    return [
      `"${o.orderId || ''}"`,
      `"${time}"`,
      `"${o.customer?.name || ''}"`,
      `"${o.customer?.phone || ''}"`,
      `"${items}"`,
      o.totalAmount || 0,
      `"${o.customer?.note || ''}"`
    ];
  });

  // 加入 UTF-8 BOM (\uFEFF)，確保 Windows Excel 開啟繁體中文不會亂碼
  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `2026_Htm_Yi_訂單名單_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 綁定後台事件
function bindAdminEvents() {
  document.getElementById('btnSaveAllProducts')?.addEventListener('click', saveProductChanges);
  document.getElementById('btnRefreshData')?.addEventListener('click', () => {
    loadData();
    alert('已重新整理最新資料！');
  });
  document.getElementById('btnExportCSV')?.addEventListener('click', exportOrdersToCSV);
  document.getElementById('btnClearOrders')?.addEventListener('click', handleClearOrders);

  // 還原預設商品並重新載入 config.js
  document.getElementById('btnResetDefault')?.addEventListener('click', () => {
    if (confirm('確定要強制清除快取並重新載入 config.js 中的最新商品與圖片路徑嗎？')) {
      adminProducts = JSON.parse(JSON.stringify(INITIAL_PRODUCTS));
      localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(adminProducts));
      if (typeof CONFIG_VERSION !== 'undefined') {
        localStorage.setItem(LOCAL_VERSION_KEY, CONFIG_VERSION);
      }
      renderAdminStats();
      renderProductsTable();
      alert('已重新載入最新商品與圖片路徑！前台將同步顯示最新圖片。');
    }
  });
}

// 清空所有歷史訂單紀錄
function handleClearOrders() {
  if (adminOrders.length === 0) {
    alert('目前沒有任何訂單紀錄可清空！');
    return;
  }

  const confirmed = confirm('⚠️ 確定要清空所有歷史訂單紀錄嗎？\n\n此動作將清除目前所有累積完成的測試訂單，並將累計營業額重置為 0。');
  if (!confirmed) return;

  adminOrders = [];
  try {
    localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify([]));
  } catch (e) {}

  renderAdminStats();
  renderOrdersTable();

  alert('✅ 已成功清空所有訂單紀錄！\n\n💡 提示：若您已串聯 Google 試算表，可一併開啟 Google 試算表 2026_Htm_Yi 的 Orders 工作表，將測試資料列刪除。');
}
