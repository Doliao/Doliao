/**
 * 2026_Htm_Yi 鮮果與文具商城 - 系統核心設定檔
 * 包含預設商品清單、初始價格、庫存量、展示圖與 Google Apps Script API 串接網址
 */

// 版本識別碼：修改設定時更新此版號，前台將自動清除舊版快取並刷新資料
const CONFIG_VERSION = '2026.09.17.v3';

// 貼上 Google Apps Script 部署後獲得的 Web 應用程式網址（以 /exec 結尾）
// 若留空字串 ''，系統將自動啟動「本機單機體驗模式（LocalStorage）」，可直接離線測試完整功能！
const API_URL = '';

// 試算表名稱（供對照與後端初始化使用）
const SPREADSHEET_NAME = '2026_Htm_Yi';

// 後台管理員專用登入密碼（預設為 admin，可自行修改）
const ADMIN_PASSWORD = 'admin';

// 初始商品資料庫定義（包含水果 4 樣、文具 4 樣）
// 圖片已佈建於專案目錄下，同時相容根目錄與水果/文具資料夾
const INITIAL_PRODUCTS = [
  // ================= 水果專區 =================
  {
    id: 'fruit-01',
    name: '青蘋果',
    category: 'fruit',
    categoryName: '鮮採水果',
    price: 45,
    stock: 50,
    unit: '顆',
    badge: '青脆微酸',
    description: '產地嚴選青蘋果，果肉爽脆清甜，豐富維他命C，一口咬下多汁回甘。',
    imageUrl: '青頻果.png',
    tags: ['產地直送', '鮮採脆甜']
  },
  {
    id: 'fruit-02',
    name: '富士蘋果',
    category: 'fruit',
    categoryName: '鮮採水果',
    price: 60,
    stock: 40,
    unit: '顆',
    badge: '蜜芯甜脆',
    description: '特級高山富士蘋果，果香濃郁、甜度高，帶有迷人自然蜜腺。',
    imageUrl: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=800&q=80',
    tags: ['高山蜜蘋果', '送禮首選']
  },
  {
    id: 'fruit-03',
    name: '水梨',
    category: 'fruit',
    categoryName: '鮮採水果',
    price: 75,
    stock: 30,
    unit: '顆',
    badge: '細緻多汁',
    description: '頂級雪白水梨，皮薄肉白、質地細密，水分飽滿清涼解渴。',
    imageUrl: '水梨.png',
    tags: ['消暑清甜', '水分飽滿']
  },
  {
    id: 'fruit-04',
    name: '馥香梨',
    category: 'fruit',
    categoryName: '鮮採水果',
    price: 85,
    stock: 25,
    unit: '顆',
    badge: '稀有香甜',
    description: '特殊高雅清香，果肉細嫩無渣，甜而不膩的珍稀限定品種。',
    imageUrl: '馥香梨.png',
    tags: ['季節限定', '果香濃郁']
  },

  // ================= 文具專區 =================
  {
    id: 'stat-01',
    name: '德制原木鉛筆 (HB)',
    category: 'stationery',
    categoryName: '精選文具',
    price: 15,
    stock: 120,
    unit: '支',
    badge: '滑順好寫',
    description: '德制天然木質筆桿，握感溫潤自然，石墨筆芯均勻不易斷裂。',
    imageUrl: '德制原木鉛筆.png',
    tags: ['德制工藝', '無毒環保']
  },
  {
    id: 'stat-02',
    name: 'Pentel 經典原子筆 (0.5mm)',
    category: 'stationery',
    categoryName: '精選文具',
    price: 25,
    stock: 100,
    unit: '支',
    badge: '速乾順暢',
    description: 'Pentel 經典款，超滑順低黏度墨水，出墨穩定不漏墨，人體工學軟膠防滑握把。',
    imageUrl: 'Pentet 原子筆Hybrid.png',
    tags: ['辦公利器', '極致滑順']
  },
  {
    id: 'stat-03',
    name: '極輕量不沾膠剪刀',
    category: 'stationery',
    categoryName: '精選文具',
    price: 80,
    stock: 35,
    unit: '把',
    badge: '銳利耐用',
    description: '日本不鏽鋼刀刃，特氟龍防沾膠塗層，弧形刀刃剪切省力50%。',
    imageUrl: '剪刀.png',
    tags: ['防沾膠', '省力弧刃']
  },
  {
    id: 'stat-04',
    name: '無屑高機能橡皮擦',
    category: 'stationery',
    categoryName: '精選文具',
    price: 20,
    stock: 90,
    unit: '個',
    badge: '擦拭乾淨',
    description: '聚合物超微細配方，輕輕一擦即淨不傷紙面，屑屑聚條好清理。',
    imageUrl: '橡皮擦.png',
    tags: ['不易留屑', '考試專用']
  }
];

// 類別過濾定義
const CATEGORIES = [
  { id: 'all', name: '全部商品', icon: '✨' },
  { id: 'fruit', name: '鮮採水果', icon: '🍎' },
  { id: 'stationery', name: '精選文具', icon: '✏️' }
];
