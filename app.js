/**
 * 2026_Htm_Yi 鮮果與文具商城 - 前台核心互動邏輯
 * 包含商品動態渲染、購物車即時計算、防呆防超賣限制、API 通訊與訂單成立處理
 */

// 全局狀態管理
let products = [];
let cart = {}; // { [productId]: quantity }
let activeCategory = 'all';
let onlyInStock = false;
let isSubmitting = false;

// 本機儲存 Key (單機體驗模式用)
const LOCAL_PRODUCTS_KEY = '2026_Htm_Yi_products';
const LOCAL_ORDERS_KEY = '2026_Htm_Yi_orders';
const LOCAL_VERSION_KEY = '2026_Htm_Yi_version';

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  initSystem();
  bindEvents();
});

// 初始化資料載入
async function initSystem() {
  updateBannerStatus();
  loadProductsFromStorage();
  renderProducts();
  renderCart();

  // 若有設定 API 網址，則與 Google 試算表同步最新庫存
  if (API_URL) {
    await fetchRemoteProducts();
  }
}

// 顯示目前連線狀態（示範模式 / 雲端連線模式）
function updateBannerStatus(customErrorMsg = null) {
  const banner = document.getElementById('connectionBanner');
  if (!banner) return;

  if (customErrorMsg) {
    banner.innerHTML = `
      <div class="alert-box warning">
        <span>⚠️ <b>後端連線警告</b>：${customErrorMsg}（目前顯示本機最新設定資料）。</span>
      </div>`;
    return;
  }

  if (!API_URL) {
    banner.innerHTML = `
      <div class="alert-box warning">
        <span>💡 <b>目前為本機離線體驗模式</b>：已載入「水果」與「文具」實體圖檔資料。可在本機測試選購與扣庫存；設定 <code style="background:rgba(0,0,0,0.06);padding:2px 6px;border-radius:4px">config.js</code> 的 API_URL 後即可無縫串聯 Google 試算表。</span>
      </div>`;
  } else {
    banner.innerHTML = `
      <div class="alert-box info">
        <span>☁️ <b>已連線至 Google 雲端試算表 (${SPREADSHEET_NAME})</b>：即時庫存與訂單已與後端同步。</span>
      </div>`;
  }
}

// 處理路徑編碼（支援中文字元與空白檔名，如「水果/青頻果.png」與「文具/Pentet 原子筆Hybrid.png」）
function getSafeImageUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  return encodeURI(url);
}

// 智慧快取管理：若版本更新或為本機模式，自動更新快取，避免被舊資料卡死
function loadProductsFromStorage() {
  try {
    const cachedVersion = localStorage.getItem(LOCAL_VERSION_KEY);
    const cached = localStorage.getItem(LOCAL_PRODUCTS_KEY);

    // 若版本相同且有快取，且不是新載入設定
    if (cached && cachedVersion === (typeof CONFIG_VERSION !== 'undefined' ? CONFIG_VERSION : '1.0')) {
      products = JSON.parse(cached);
      return;
    }
  } catch (e) {
    console.warn('讀取快取失敗，載入預設商品清單', e);
  }

  // 載入 config.js 中的最新商品並同步快取
  products = JSON.parse(JSON.stringify(INITIAL_PRODUCTS));
  saveProductsToStorage(products);
  if (typeof CONFIG_VERSION !== 'undefined') {
    localStorage.setItem(LOCAL_VERSION_KEY, CONFIG_VERSION);
  }
}

function saveProductsToStorage(data) {
  try {
    localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('LocalStorage 儲存失敗（可能因圖片過大超過 5MB 限制）', e);
  }
}

// 向 Google Apps Script 獲取最新商品與庫存
async function fetchRemoteProducts() {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'getProducts' })
    });
    const result = await res.json();
    if (result.ok && Array.isArray(result.products)) {
      products = result.products;
      saveProductsToStorage(products);
      renderProducts();
      renderCart();
      updateBannerStatus();
    } else {
      updateBannerStatus(result.error || '無法取得試算表商品資料');
    }
  } catch (err) {
    console.error('遠端庫存同步失敗，繼續使用本地資料', err);
    updateBannerStatus('無法連線到 Google Apps Script 網址，請確認權限是否設定為「所有人 (Anyone)」');
  }
}

// 渲染商品列表
function renderProducts() {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  // 篩選商品
  const filtered = products.filter(p => {
    const matchCategory = activeCategory === 'all' || p.category === activeCategory;
    const matchStock = onlyInStock ? p.stock > 0 : true;
    return matchCategory && matchStock;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-muted);">
        <div style="font-size: 3rem; margin-bottom: 12px;">📦</div>
        <h3>沒有符合條件的商品</h3>
        <p style="margin-top: 6px;">請嘗試切換其他分類或關閉庫存篩選。</p>
      </div>`;
    return;
  }

  grid.innerHTML = filtered.map(product => {
    const inCartQty = cart[product.id] || 0;
    const isOutOfStock = product.stock <= 0;
    const isLowStock = product.stock > 0 && product.stock <= 10;
    const remainingStock = product.stock - inCartQty;

    // 庫存標籤狀態
    let stockPillHtml = '';
    if (isOutOfStock) {
      stockPillHtml = `<span class="stock-pill out-of-stock">❌ 已售罄</span>`;
    } else if (isLowStock) {
      stockPillHtml = `<span class="stock-pill low-stock">⚡ 僅剩 ${product.stock} ${product.unit}</span>`;
    } else {
      stockPillHtml = `<span class="stock-pill in-stock">✨ 庫存 ${product.stock} ${product.unit}</span>`;
    }

    const badgeClass = product.category === 'fruit' ? 'badge-fruit' : 'badge-stationery';
    const safeImgSrc = getSafeImageUrl(product.imageUrl);

    return `
      <div class="product-card" data-id="${product.id}">
        <div class="card-image-wrap">
          <img src="${safeImgSrc}" alt="${product.name}" class="card-image" loading="lazy" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80';" />
          <span class="card-badge ${badgeClass}">${product.badge || product.categoryName}</span>
          ${stockPillHtml}
        </div>
        <div class="card-body">
          <div class="card-header-info">
            <h3 class="card-title">${product.name}</h3>
          </div>
          <p class="card-desc">${product.description}</p>
          <div class="card-tags">
            ${(product.tags || []).map(tag => `<span class="tag-item">${tag}</span>`).join('')}
          </div>
          <div class="card-price-row">
            <div class="price-box">
              <span class="price-currency">NT$</span>
              <span class="price-amount">${product.price}</span>
              <span class="price-unit">/ ${product.unit}</span>
            </div>
            <div class="card-stock-text">
              庫存 <b>${product.stock}</b> ${product.unit}
            </div>
          </div>
          <div class="card-action-box">
            <div class="stepper">
              <button type="button" class="stepper-btn btn-minus" data-id="${product.id}" ${inCartQty <= 0 ? 'disabled' : ''}>-</button>
              <input type="text" class="stepper-input" value="${inCartQty}" readonly />
              <button type="button" class="stepper-btn btn-plus" data-id="${product.id}" ${remainingStock <= 0 ? 'disabled' : ''}>+</button>
            </div>
            <button type="button" class="btn-add-cart" data-id="${product.id}" ${isOutOfStock || remainingStock <= 0 ? 'disabled' : ''}>
              ${isOutOfStock ? '已售完' : inCartQty > 0 ? `已選 ${inCartQty} ${product.unit}` : '加入清單'}
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// 渲染側邊購物車 Drawer
function renderCart() {
  const cartListEl = document.getElementById('cartItemsList');
  const cartBadge = document.getElementById('cartBadge');
  const cartEmptyView = document.getElementById('cartEmptyView');
  const cartContentWrap = document.getElementById('cartContentWrap');
  const subtotalEl = document.getElementById('cartSubtotal');
  const grandTotalEl = document.getElementById('cartGrandTotal');
  const navCartTotalEl = document.getElementById('navCartTotal');

  const cartItemIds = Object.keys(cart).filter(id => cart[id] > 0);
  const totalCount = cartItemIds.reduce((sum, id) => sum + cart[id], 0);

  // 更新導航列角標
  if (cartBadge) {
    cartBadge.textContent = totalCount;
    cartBadge.style.display = totalCount > 0 ? 'flex' : 'none';
    cartBadge.classList.add('bump');
    setTimeout(() => cartBadge.classList.remove('bump'), 250);
  }

  // 購物車為空時顯示
  if (cartItemIds.length === 0) {
    if (cartEmptyView) cartEmptyView.style.display = 'flex';
    if (cartContentWrap) cartContentWrap.style.display = 'none';
    if (navCartTotalEl) navCartTotalEl.textContent = 'NT$ 0';
    return;
  }

  if (cartEmptyView) cartEmptyView.style.display = 'none';
  if (cartContentWrap) cartContentWrap.style.display = 'block';

  let totalAmount = 0;

  // 產生購物車清單 HTML
  if (cartListEl) {
    cartListEl.innerHTML = cartItemIds.map(id => {
      const item = products.find(p => p.id === id);
      if (!item) return '';
      const qty = cart[id];
      const itemTotal = item.price * qty;
      totalAmount += itemTotal;
      const canIncrease = qty < item.stock;
      const safeImgSrc = getSafeImageUrl(item.imageUrl);

      return `
        <div class="cart-item-row" data-id="${id}">
          <img src="${safeImgSrc}" class="cart-item-img" alt="${item.name}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80';" />
          <div class="cart-item-info">
            <div class="cart-item-name">${item.name}</div>
            <div class="cart-item-sub">NT$ ${item.price} / ${item.unit}</div>
            <div class="cart-item-controls">
              <div class="stepper" style="transform: scale(0.9); transform-origin: left center;">
                <button type="button" class="stepper-btn btn-cart-minus" data-id="${id}">-</button>
                <input type="text" class="stepper-input" value="${qty}" readonly />
                <button type="button" class="stepper-btn btn-cart-plus" data-id="${id}" ${!canIncrease ? 'disabled' : ''}>+</button>
              </div>
              <span class="cart-item-total">NT$ ${itemTotal.toLocaleString()}</span>
            </div>
          </div>
          <button type="button" class="btn-remove-item" data-id="${id}" title="移除商品">🗑️</button>
        </div>
      `;
    }).join('');
  }

  // 更新金額
  if (subtotalEl) subtotalEl.textContent = `NT$ ${totalAmount.toLocaleString()}`;
  if (grandTotalEl) grandTotalEl.textContent = `NT$ ${totalAmount.toLocaleString()}`;
  if (navCartTotalEl) navCartTotalEl.textContent = `NT$ ${totalAmount.toLocaleString()}`;
}

// 購物車商品操作
function addToCart(productId, delta = 1) {
  const item = products.find(p => p.id === productId);
  if (!item) return;

  const currentQty = cart[productId] || 0;
  const targetQty = currentQty + delta;

  // 防超賣校驗
  if (targetQty > item.stock) {
    showToast(`⚠️「${item.name}」目前庫存僅剩 ${item.stock} ${item.unit}，無法再加購囉！`, 'warn');
    return;
  }

  if (targetQty <= 0) {
    delete cart[productId];
  } else {
    cart[productId] = targetQty;
  }

  renderProducts();
  renderCart();
}

function removeFromCart(productId) {
  if (cart[productId]) {
    delete cart[productId];
    renderProducts();
    renderCart();
  }
}

// 結帳送出處理 (防超賣核心流程)
async function handleCheckout(e) {
  e.preventDefault();
  if (isSubmitting) return;

  const nameInput = document.getElementById('customerName');
  const phoneInput = document.getElementById('customerPhone');
  const noteInput = document.getElementById('customerNote');
  const submitBtn = document.getElementById('btnSubmitOrder');

  const customerName = (nameInput?.value || '').trim();
  const customerPhone = (phoneInput?.value || '').trim();
  const customerNote = (noteInput?.value || '').trim();

  // 驗證表單
  if (!customerName) {
    showToast('請填寫訂購人姓名', 'warn');
    nameInput?.focus();
    return;
  }
  if (!customerPhone) {
    showToast('請填寫聯絡電話', 'warn');
    phoneInput?.focus();
    return;
  }

  const orderItems = Object.keys(cart).map(id => {
    const p = products.find(prod => prod.id === id);
    return {
      id,
      name: p.name,
      price: p.price,
      quantity: cart[id],
      subtotal: p.price * cart[id],
      unit: p.unit
    };
  }).filter(item => item.quantity > 0);

  if (orderItems.length === 0) {
    showToast('購物車內目前沒有商品喔！', 'warn');
    return;
  }

  // 進入送出狀態
  isSubmitting = true;
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = '正在核對庫存並建立訂單…';
  }

  const grandTotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
  const requestId = generateRequestId();

  const payload = {
    action: 'checkout',
    requestId,
    orderId: 'ORD-' + Date.now().toString(36).toUpperCase(),
    timestamp: new Date().toISOString(),
    customer: {
      name: customerName,
      phone: customerPhone,
      note: customerNote
    },
    items: orderItems,
    totalAmount: grandTotal
  };

  try {
    if (API_URL) {
      // 雲端模式：透過 Google Apps Script 執行原子鎖定扣庫存
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.error || '下單失敗，請稍後再試');
      }

      // 扣庫存成功，以伺服器傳回的最新商品狀態為準
      if (result.products) {
        products = result.products;
        saveProductsToStorage(products);
      }
      showOrderSuccess(payload);
    } else {
      // 本機體驗模式：模擬原子防超賣檢核
      await simulateLocalCheckout(payload);
      showOrderSuccess(payload);
    }

    // 清空購物車與表單
    cart = {};
    if (nameInput) nameInput.value = '';
    if (phoneInput) phoneInput.value = '';
    if (noteInput) noteInput.value = '';
    closeCartDrawer();
    renderProducts();
    renderCart();

  } catch (error) {
    alert('【訂單無法完成】\n' + error.message);
    // 重新拉取最新庫存以刷新畫面
    if (API_URL) fetchRemoteProducts();
  } finally {
    isSubmitting = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = '確認送出訂單（即時扣除庫存）';
    }
  }
}

// 本機體驗模式模擬扣庫存
async function simulateLocalCheckout(orderPayload) {
  // 模擬網路延遲
  await new Promise(r => setTimeout(r, 600));

  // 1. 嚴格比對庫存是否足夠
  for (const item of orderPayload.items) {
    const prod = products.find(p => p.id === item.id);
    if (!prod || prod.stock < item.quantity) {
      throw new Error(`商品「${item.name}」庫存不足（僅剩 ${prod ? prod.stock : 0} ${item.unit}），無法完成訂購！`);
    }
  }

  // 2. 扣除庫存
  orderPayload.items.forEach(item => {
    const prod = products.find(p => p.id === item.id);
    if (prod) {
      prod.stock -= item.quantity;
    }
  });

  // 3. 儲存最新庫存與訂單
  saveProductsToStorage(products);

  try {
    const orders = JSON.parse(localStorage.getItem(LOCAL_ORDERS_KEY) || '[]');
    orders.unshift(orderPayload);
    localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(orders));
  } catch (e) {}
}

// 顯示訂單成功明細視窗
function showOrderSuccess(order) {
  const dialog = document.getElementById('orderDoneDialog');
  const detailsEl = document.getElementById('orderDoneDetails');
  if (!dialog || !detailsEl) return;

  detailsEl.innerHTML = `
    <div class="receipt-header">
      <div class="receipt-icon">🎉</div>
      <h3 class="receipt-title">訂購成功！</h3>
      <div class="receipt-order-id">訂單編號：${order.orderId}</div>
    </div>
    <div class="receipt-info-box">
      <b>訂購人：</b>${order.customer.name} (${order.customer.phone})<br/>
      <b>備註說明：</b>${order.customer.note || '無'}<br/>
      <b>下單時間：</b>${new Date(order.timestamp).toLocaleString('zh-TW')}
    </div>
    <div class="receipt-items-list">
      ${order.items.map(it => `
        <div class="receipt-item-row">
          <span>${it.name} × ${it.quantity} ${it.unit}</span>
          <span>NT$ ${it.subtotal.toLocaleString()}</span>
        </div>
      `).join('')}
      <div class="receipt-total-row">
        <span>應付總計</span>
        <span>NT$ ${order.totalAmount.toLocaleString()}</span>
      </div>
    </div>
    <p style="font-size: 0.8rem; color: var(--text-muted); text-align: center; margin-bottom: 20px;">
      庫存已即時扣除，資料已寫入試算表資料庫中。
    </p>
  `;

  dialog.showModal();
}

// 產生唯一 RequestId
function generateRequestId() {
  try {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  } catch (e) {}
  return 'REQ-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
}

// 綁定事件監聽器
function bindEvents() {
  // 分類標籤切換
  document.querySelectorAll('.chip-btn[data-category]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.chip-btn[data-category]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.dataset.category;
      renderProducts();
    });
  });

  // 僅看有貨切換
  const stockToggle = document.getElementById('stockToggle');
  if (stockToggle) {
    stockToggle.addEventListener('change', (e) => {
      onlyInStock = e.target.checked;
      renderProducts();
    });
  }

  // 商品列表點擊代理 (加、減、加入購物車)
  const grid = document.getElementById('productsGrid');
  if (grid) {
    grid.addEventListener('click', (e) => {
      const btnPlus = e.target.closest('.btn-plus');
      const btnMinus = e.target.closest('.btn-minus');
      const btnAdd = e.target.closest('.btn-add-cart');

      if (btnPlus) {
        addToCart(btnPlus.dataset.id, 1);
      } else if (btnMinus) {
        addToCart(btnMinus.dataset.id, -1);
      } else if (btnAdd) {
        addToCart(btnAdd.dataset.id, 1);
      }
    });
  }

  // 購物車 Drawer 內操作代理
  const cartList = document.getElementById('cartItemsList');
  if (cartList) {
    cartList.addEventListener('click', (e) => {
      const btnCartPlus = e.target.closest('.btn-cart-plus');
      const btnCartMinus = e.target.closest('.btn-cart-minus');
      const btnRemove = e.target.closest('.btn-remove-item');

      if (btnCartPlus) {
        addToCart(btnCartPlus.dataset.id, 1);
      } else if (btnCartMinus) {
        addToCart(btnCartMinus.dataset.id, -1);
      } else if (btnRemove) {
        removeFromCart(btnRemove.dataset.id);
      }
    });
  }

  // 購物車開啟/關閉
  const cartTrigger = document.getElementById('btnOpenCart');
  const cartClose = document.getElementById('btnCloseCart');
  const backdrop = document.getElementById('cartBackdrop');

  if (cartTrigger) cartTrigger.addEventListener('click', openCartDrawer);
  if (cartClose) cartClose.addEventListener('click', closeCartDrawer);
  if (backdrop) backdrop.addEventListener('click', closeCartDrawer);

  // 結帳表單送出
  const checkoutForm = document.getElementById('checkoutForm');
  if (checkoutForm) checkoutForm.addEventListener('submit', handleCheckout);

  // 關閉成功彈窗
  const btnCloseDialog = document.getElementById('btnCloseReceipt');
  const dialog = document.getElementById('orderDoneDialog');
  if (btnCloseDialog && dialog) {
    btnCloseDialog.addEventListener('click', () => dialog.close());
  }
}

function openCartDrawer() {
  document.getElementById('cartDrawer')?.classList.add('active');
  document.getElementById('cartBackdrop')?.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeCartDrawer() {
  document.getElementById('cartDrawer')?.classList.remove('active');
  document.getElementById('cartBackdrop')?.classList.remove('active');
  document.body.style.overflow = '';
}

// 輕量 Toast 通知提示
function showToast(message, type = 'info') {
  let toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toastContainer';
    toastContainer.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 8px;
      pointer-events: none;
    `;
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  const bg = type === 'warn' ? '#ef4444' : '#0f172a';
  toast.style.cssText = `
    background: ${bg};
    color: white;
    padding: 12px 20px;
    border-radius: 9999px;
    font-size: 0.9rem;
    font-weight: 600;
    box-shadow: 0 10px 25px rgba(0,0,0,0.25);
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  `;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}
