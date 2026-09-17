/**
 * 2026_Htm_Yi 鮮果與文具商城 - Google Apps Script (GAS) 後端核心代碼
 * 
 * 部署指引：
 * 1. 在 Google 試算表（名稱：2026_Htm_Yi）中點擊「擴充功能」➔「Apps Script」
 * 2. 清空既有內容，將此檔案全部代碼複製貼入
 * 3. 點擊右上角「部署」➔「新增部署作業」
 * 4. 類型選擇「網路應用程式 (Web App)」
 *    - 說明：2026_Htm_Yi API v2.0
 *    - 執行身分：我 (您的 Google 帳號)
 *    - 誰可以存取：所有人 (Anyone)  <-- 務必選擇「所有人」，前端才能免登入下單
 * 5. 點擊「部署」，並複製獲得的 Web 應用程式網址（以 /exec 結尾）
 * 6. 將網址貼回前端 config.js 中的 API_URL 變數！
 */

const SPREADSHEET_NAME = '2026_Htm_Yi';
const PRODUCTS_SHEET = 'Products';
const ORDERS_SHEET = 'Orders';

// 初始商品資料庫定義（已綁定本地水果與文具資料夾）
const DEFAULT_PRODUCTS = [
  { id: 'fruit-01', name: '青蘋果', category: 'fruit', price: 45, stock: 50, unit: '顆', badge: '青脆微酸', description: '產地嚴選青蘋果，果肉爽脆清甜，豐富維他命C，一口咬下多汁回甘。', imageUrl: '水果/青頻果.png', tags: '產地直送,鮮採脆甜' },
  { id: 'fruit-02', name: '富士蘋果', category: 'fruit', price: 60, stock: 40, unit: '顆', badge: '蜜芯甜脆', description: '特級高山富士蘋果，果香濃郁、甜度高，帶有迷人自然蜜腺。', imageUrl: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=800&q=80', tags: '高山蜜蘋果,送禮首選' },
  { id: 'fruit-03', name: '水梨', category: 'fruit', price: 75, stock: 30, unit: '顆', badge: '細緻多汁', description: '頂級雪白水梨，皮薄肉白、質地細密，水分飽滿清涼解渴。', imageUrl: '水果/水梨.png', tags: '消暑清甜,水分飽滿' },
  { id: 'fruit-04', name: '馥香梨', category: 'fruit', price: 85, stock: 25, unit: '顆', badge: '稀有香甜', description: '特殊高雅清香，果肉細嫩無渣，甜而不膩的珍稀限定品種。', imageUrl: '水果/馥香梨.png', tags: '季節限定,果香濃郁' },
  { id: 'stat-01', name: '德制原木鉛筆 (HB)', category: 'stationery', price: 15, stock: 120, unit: '支', badge: '滑順好寫', description: '德制天然木質筆桿，握感溫潤自然，石墨筆芯均勻不易斷裂。', imageUrl: '文具/德制原木鉛筆.png', tags: '德制工藝,無毒環保' },
  { id: 'stat-02', name: 'Pentel 經典原子筆 (0.5mm)', category: 'stationery', price: 25, stock: 100, unit: '支', badge: '速乾順暢', description: 'Pentel 經典款，超滑順低黏度墨水，出墨穩定不漏墨，人體工學軟膠防滑握把。', imageUrl: '文具/Pentet 原子筆Hybrid.png', tags: '辦公利器,極致滑順' },
  { id: 'stat-03', name: '極輕量不沾膠剪刀', category: 'stationery', price: 80, stock: 35, unit: '把', badge: '銳利耐用', description: '日本不鏽鋼刀刃，特氟龍防沾膠塗層，弧形刀刃剪切省力50%。', imageUrl: '文具/剪刀.png', tags: '防沾膠,省力弧刃' },
  { id: 'stat-04', name: '無屑高機能橡皮擦', category: 'stationery', price: 20, stock: 90, unit: '個', badge: '擦拭乾淨', description: '聚合物超微細配方，輕輕一擦即淨不傷紙面，屑屑聚條好清理。', imageUrl: '文具/橡皮擦.png', tags: '不易留屑,考試專用' }
];

/**
 * 初始化試算表結構與預設商品
 */
function initSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. 確保 Products 表存在
  let pSheet = ss.getSheetByName(PRODUCTS_SHEET);
  if (!pSheet) {
    pSheet = ss.insertSheet(PRODUCTS_SHEET);
    pSheet.appendRow(['id', 'name', 'category', 'price', 'stock', 'unit', 'badge', 'description', 'imageUrl', 'tags']);
    pSheet.getRange(1, 1, 1, 10).setFontWeight('bold').setBackground('#d1fae5');
    
    // 寫入初始資料
    DEFAULT_PRODUCTS.forEach(p => {
      pSheet.appendRow([p.id, p.name, p.category, p.price, p.stock, p.unit, p.badge, p.description, p.imageUrl, p.tags]);
    });
  } else {
    // 若表已存在，更新標題列並確保格式正確
    pSheet.getRange(1, 1, 1, 10).setFontWeight('bold');
  }

  // 2. 確保 Orders 表存在
  let oSheet = ss.getSheetByName(ORDERS_SHEET);
  if (!oSheet) {
    oSheet = ss.insertSheet(ORDERS_SHEET);
    oSheet.appendRow(['orderId', 'timestamp', 'customerName', 'customerPhone', 'itemsDetail', 'totalAmount', 'note', 'status']);
    oSheet.getRange(1, 1, 1, 8).setFontWeight('bold').setBackground('#e0f2fe');
  }

  return '✅ 試算表初始化成功！';
}

/**
 * 處理 GET 測試請求
 */
function doGet(e) {
  return respondJSON({
    ok: true,
    message: '2026_Htm_Yi API 伺服器正常運作中！',
    time: new Date().toISOString()
  });
}

/**
 * 處理 POST 主業務邏輯（查詢、下單扣庫存、後台更新）
 */
function doPost(e) {
  try {
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    }

    const action = payload.action || '';

    // 1. 獲取商品清單與庫存
    if (action === 'getProducts') {
      return respondJSON({ ok: true, products: getProductsFromSheet() });
    }

    // 2. 後台管理員更新商品價格/庫存/圖片
    if (action === 'updateProducts') {
      return handleUpdateProducts(payload.products);
    }

    // 3. 後台獲取統計數據與訂單歷程
    if (action === 'getAdminData') {
      return respondJSON({
        ok: true,
        products: getProductsFromSheet(),
        orders: getOrdersFromSheet()
      });
    }

    // 4. 前台結帳下單（防超賣核心：使用排他腳本鎖）
    if (action === 'checkout') {
      return handleAtomicCheckout(payload);
    }

    return respondJSON({ ok: false, error: '未知動作：' + action });

  } catch (err) {
    return respondJSON({ ok: false, error: '後端執行異常：' + err.toString() });
  }
}

/**
 * 核心防超賣結帳邏輯（Atomic Checkout with ScriptLock）
 */
function handleAtomicCheckout(payload) {
  const lock = LockService.getScriptLock();
  
  // 嘗試獲取排他鎖，最多等待 20 秒
  try {
    const success = lock.waitLock(20000);
    if (!success) {
      return respondJSON({ ok: false, error: '伺服器目前繁忙中，多位同仁正在同時搶購，請稍後重試！' });
    }
  } catch (e) {
    return respondJSON({ ok: false, error: '排隊逾時，請再次點擊送出。' });
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const pSheet = ss.getSheetByName(PRODUCTS_SHEET);
    const oSheet = ss.getSheetByName(ORDERS_SHEET);

    if (!pSheet || !oSheet) {
      initSheet();
    }

    // 讀取試算表中的最新商品現貨
    const pData = pSheet.getDataRange().getValues();
    const headers = pData[0];
    const idIdx = headers.indexOf('id');
    const nameIdx = headers.indexOf('name');
    const stockIdx = headers.indexOf('stock');

    // 將現有庫存建立映射表: id -> { rowNumber, currentStock, name }
    const stockMap = {};
    for (let r = 1; r < pData.length; r++) {
      const pid = pData[r][idIdx];
      stockMap[pid] = {
        row: r + 1, // 1-indexed
        name: pData[r][nameIdx],
        stock: Number(pData[r][stockIdx]) || 0
      };
    }

    const orderItems = payload.items || [];
    if (orderItems.length === 0) {
      return respondJSON({ ok: false, error: '購物車內無商品' });
    }

    // 第一階段：嚴密防超賣比對
    for (let i = 0; i < orderItems.length; i++) {
      const item = orderItems[i];
      const current = stockMap[item.id];
      if (!current) {
        return respondJSON({ ok: false, error: `商品 [${item.name}] 不存在或已下架！` });
      }
      if (current.stock < item.quantity) {
        return respondJSON({
          ok: false,
          error: `很抱歉！商品「${current.name}」目前庫存不足（僅剩 ${current.stock} 件，您欲選購 ${item.quantity} 件），已被其他同仁搶購完畢。`
        });
      }
    }

    // 第二階段：驗證全數通過，正式自試算表中扣除庫存
    orderItems.forEach(item => {
      const target = stockMap[item.id];
      const newStock = target.stock - item.quantity;
      pSheet.getRange(target.row, stockIdx + 1).setValue(newStock);
      target.stock = newStock; // 更新內部快取
    });

    // 第三階段：寫入 Orders 訂單資料表
    const itemsDetailText = orderItems.map(it => `${it.name} × ${it.quantity}`).join('、 ');
    oSheet.appendRow([
      payload.orderId || ('ORD-' + Date.now()),
      payload.timestamp || new Date().toISOString(),
      payload.customer ? payload.customer.name : '',
      payload.customer ? payload.customer.phone : '',
      itemsDetailText,
      payload.totalAmount || 0,
      payload.customer ? payload.customer.note : '',
      '已成立'
    ]);

    // 重新取得更新後的完整商品清單
    const updatedProducts = getProductsFromSheet();

    return respondJSON({
      ok: true,
      orderId: payload.orderId,
      message: '訂單建立成功，庫存已即時扣抵！',
      products: updatedProducts
    });

  } finally {
    // 務必釋放鎖定
    lock.releaseLock();
  }
}

/**
 * 讀取 Products 試算表
 */
function getProductsFromSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let pSheet = ss.getSheetByName(PRODUCTS_SHEET);
  if (!pSheet) {
    initSheet();
    pSheet = ss.getSheetByName(PRODUCTS_SHEET);
  }

  const values = pSheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  const headers = values[0];
  const list = [];

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const obj = {};
    headers.forEach((h, col) => {
      obj[h] = row[col];
    });
    // 轉型處理
    obj.price = Number(obj.price) || 0;
    obj.stock = Number(obj.stock) || 0;
    obj.tags = obj.tags ? String(obj.tags).split(',').map(s => s.trim()) : [];
    list.push(obj);
  }

  return list;
}

/**
 * 讀取 Orders 試算表
 */
function getOrdersFromSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const oSheet = ss.getSheetByName(ORDERS_SHEET);
  if (!oSheet) return [];

  const values = oSheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  const headers = values[0];
  const list = [];

  // 由新到舊倒序排序
  for (let r = values.length - 1; r >= 1; r--) {
    const row = values[r];
    list.push({
      orderId: row[0],
      timestamp: row[1],
      customer: {
        name: row[2],
        phone: row[3],
        note: row[6]
      },
      items: [{ name: row[4], quantity: 1, unit: '' }], // 簡要明細
      totalAmount: Number(row[5]) || 0,
      status: row[7]
    });
  }

  return list;
}

/**
 * 後台管理員批次更新商品（含儲存格長度安全檢查）
 */
function handleUpdateProducts(products) {
  if (!Array.isArray(products)) {
    return respondJSON({ ok: false, error: '格式錯誤，products 必須為陣列' });
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const pSheet = ss.getSheetByName(PRODUCTS_SHEET);
  if (!pSheet) return respondJSON({ ok: false, error: 'Products 表不存在' });

  const pData = pSheet.getDataRange().getValues();
  const headers = pData[0];
  const idIdx = headers.indexOf('id');
  const priceIdx = headers.indexOf('price');
  const stockIdx = headers.indexOf('stock');
  const imgIdx = headers.indexOf('imageUrl');

  for (let r = 1; r < pData.length; r++) {
    const pid = pData[r][idIdx];
    const updateTarget = products.find(p => p.id === pid);
    if (updateTarget) {
      if (priceIdx !== -1 && updateTarget.price !== undefined) {
        pSheet.getRange(r + 1, priceIdx + 1).setValue(updateTarget.price);
      }
      if (stockIdx !== -1 && updateTarget.stock !== undefined) {
        pSheet.getRange(r + 1, stockIdx + 1).setValue(updateTarget.stock);
      }
      if (imgIdx !== -1 && updateTarget.imageUrl !== undefined) {
        // 嚴密防呆：Google 試算表單一儲存格最多 50,000 字元，避免 Base64 塞爆出錯
        const urlStr = String(updateTarget.imageUrl);
        if (urlStr.length > 45000) {
          return respondJSON({
            ok: false,
            error: `商品 [${updateTarget.name || pid}] 的圖片資料長度超過 50,000 字元上限！請改用圖片檔案路徑（如「水果/青頻果.png」）或一般圖床連結。`
          });
        }
        pSheet.getRange(r + 1, imgIdx + 1).setValue(urlStr);
      }
    }
  }

  return respondJSON({ ok: true, message: '商品資料已全數同步更新至 Google 試算表！' });
}

/**
 * 輔助函數：封裝 JSON 回傳物件
 */
function respondJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
