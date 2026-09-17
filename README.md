# 🍃 2026_Htm_Yi 鮮果與文具生活誌 - 雲端即時選購與防超賣商城系統

一套專為生活選品、餐會團購或企業內部福利設計的現代化電商系統。
採用 **Jamstack + Serverless** 極簡零成本架構：
- **前端 (Frontend)**：HTML5 + CSS3 (Glassmorphism 玻璃擬態視覺) + Vanilla JavaScript
- **雲端運算 (Backend)**：Google Apps Script (GAS) Web App，內建 `LockService` 原子腳本鎖
- **資料庫 (Database)**：Google 試算表（名稱：`2026_Htm_Yi`）
- **發布託管 (Hosting)**：GitHub Pages + Cloudflare 全球 CDN

---

## ✨ 核心功能特色

1. **精選雙類別圖文展現**：
   - 🍎 **鮮採水果**：青蘋果、富士蘋果、水梨、馥香梨。
   - ✏️ **精選文具**：原木鉛筆、經典原子筆、極輕量剪刀、無屑橡皮擦。
   - 炫麗卡片設計：高畫質大圖、即時庫存膠囊（充足 / 緊張 / 售罄）、微交互動畫。
2. **即時動態購物車 (Slide-Over Drawer)**：
   - 點擊按鈕直接滑出購物車，商品數量隨選隨算、小計與總額實時更新。
   - 前台防呆限制：無法選擇超過目前庫存的數量，庫存為 0 時按鈕自動鎖定。
3. **嚴密後端防超賣機制 (Atomic Script Lock)**：
   - 訂單送出時，GAS 後端啟動排他鎖（LockService），即時比對試算表最新庫存。
   - 若庫存不足即時駁回，避免多人併發搶購產生「超賣」現象。
   - 通過檢核後直接在試算表中扣減庫存，並寫入 `Orders` 訂單記錄。
4. **全功能管理後台 (admin.html)**：
   - 即時調整每樣商品價格、庫存數量、更換圖片網址或本機上傳。
   - 即時檢視營業額統計、低庫存警戒項目。
   - 一鍵匯出繁體中文 UTF-8 BOM CSV 訂單報表（支援 Microsoft Excel 完美開啟不亂碼）。
5. **雙模式支援**：
   - **本機體驗模式**：未設定 API 網址前，以瀏覽器 LocalStorage 運作，可直接離線測試完整選購與扣庫存流程。
   - **雲端連線模式**：設定 Google Apps Script 網址後，自動與 Google 試算表進行雙向同步。

---

## 🚀 三步驟快速部署教學

### 【步驟一：建立 Google 試算表與設定後端 (Google Apps Script)】

1. 前往 [Google 試算表](https://docs.google.com/spreadsheets/u/0/)，建立一份新的空白試算表。
2. 將試算表標題命名為：**`2026_Htm_Yi`**。
3. 點選頂部選單的 **「擴充功能」➔「Apps Script」**。
4. 將專案中的 **`Code.gs`** 檔案全部內容複製，覆蓋貼入 Apps Script 編輯器中。
5. 點選 Apps Script 編輯器上方的函數下拉選單，選擇 `initSheet`，並點擊 **「執行」**：
   - 系統會提示授權，請依照畫面完成 Google 帳號授權。
   - 執行完成後，回到試算表，您會發現已自動生成 `Products`（商品與初始庫存）和 `Orders`（訂單）兩個工作表！
6. 點擊右上角藍色按鈕 **「部署」➔「新增部署作業」**：
   - 點選左側齒輪 ⚙️，選擇 **「網路應用程式 (Web App)」**
   - 說明：`2026_Htm_Yi API v1`
   - 執行身分：選擇 **「我」**
   - **誰可以存取：務必選擇「所有人 (Anyone)」**（這樣一般訪客下單時才不需登入 Google）
7. 點擊 **「部署」**，複製最後產生的 **Web 應用程式網址**（以 `/exec` 結尾）。

---

### 【步驟二：設定前端 API 網址】

1. 開啟本地專案資料夾中的 **`config.js`**。
2. 將剛才複製的網址貼入 `API_URL`：
   ```javascript
   const API_URL = 'https://script.google.com/macros/s/你的部署ID/exec';
   ```
3. 存檔完成！現在前台與後台的所有下單、價格更動與庫存增減，都會直接與您的 Google 試算表即時連動。

---

### 【步驟三：推送到 GitHub 並開啟 GitHub Pages】

目標倉庫：`https://github.com/Doliao/Doliao`

在終端機或命令提示字元中進入專案目錄 `e:\2026_Htm_Yi\`，執行以下指令：

```bash
# 初始化 Git 倉庫
git init

# 將所有檔案加入暫存區
git add .

# 提交第一次版本
git commit -m "feat: 2026_Htm_Yi 鮮果與文具商城系統"

# 設定主分支名稱為 main
git branch -M main

# 關聯遠端倉庫
git remote add origin https://github.com/Doliao/Doliao.git

# 推送至 GitHub
git push -u origin main
```

#### 開啟 GitHub Pages：
1. 進入 GitHub 倉庫 `https://github.com/Doliao/Doliao` 的 **Settings** ➔ **Pages**。
2. 在 **Branch** 選取 `main` 分支、目錄選 `/(root)`，點擊 **Save**。
3. 稍等約 1 ~ 2 分鐘，即可獲得線上訪問網址！

---

### 【選用：透過 Cloudflare 覆蓋加速與綁定自訂網域】

1. 在 Cloudflare DNS 新增一筆 `CNAME` 記錄指向您的 GitHub Pages（例如 `doliao.github.io`）。
2. 開啟 **Proxied（橙色小雲朵）**。
3. 進入 Cloudflare 的 **SSL/TLS** ➔ **Overview**，將加密模式設為 **Full** 或 **Full (strict)**。
4. 在 GitHub 倉庫的 Pages 設定中填入您的自訂網域，即可享有全球 CDN 極速快取與企業級防護！

---

## 📂 專案檔案清單

```
e:\2026_Htm_Yi\
├── index.html        # 商城首頁（現代感 Hero、分類篩選、卡片網格、即時購物車 Drawer）
├── admin.html        # 管理後台（庫存與單價調整、圖片更換、營業額統計、CSV 匯出）
├── style.css         # 炫麗視覺樣式（Glassmorphism 玻璃擬態、流暢微交互、RWD 響應式）
├── config.js         # 系統設定檔（API_URL、8項初始鮮果文具資料）
├── app.js            # 前台選購邏輯（購物車即時算額、防超賣防呆、API 下單通訊）
├── admin.js          # 後台管理邏輯（即時編輯、圖片轉換、訂單列表、Excel CSV 匯出）
├── Code.gs           # Google Apps Script 完整後端代碼（含 LockService 排他鎖）
└── README.md         # 本說明手冊
```
