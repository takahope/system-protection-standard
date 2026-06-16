# 防護基準系統 設計風格指南 (Design Guidelines)

本指南總結了「資通系統防護基準管理」系統（`AppScript_Index.html`）的設計風格與 UI 規範，供後續開發與維護參考。

## 1. 核心視覺與排版 (Typography & Layout)

### 字體 (Typography)
- **字型 (Font Family)**: `'Microsoft JhengHei', 'Segoe UI', sans-serif`
- **主要字體大小**: 基礎介面為 `12px` - `13px`。標籤或次要說明常使用 `10px` 或 `11px`，大標題與關鍵數據則使用 `18px`, `20px`, `24px` 至 `32px` 不等。

### 版面佈局 (Layout)
- **最大寬度**: `.container` 設定為 `1560px`，置中對齊，兩側留白 `16px`。
- **背景顏色**: 整體網頁背景使用 `var(--bg)` (`#f8f9fa`)。
- **網格系統**: 系統列表使用 Auto-fill Grid，欄寬最小 `320px` (`grid-template-columns: repeat(auto-fill, minmax(320px, 1fr))`)，間距 `14px`。

---

## 2. 品牌與狀態色彩 (Color Palette)

採用 CSS 變數定義，整體風格具有清晰的層級與狀態指示：

### 核心色彩
- **主色 (Primary)**: `#1a73e8` (Google Blue) / 深主色 `#1557b0`
- **背景 (Background)**: `#f8f9fa` (Light Gray)
- **卡片 (Card)**: `#fff` (White)
- **邊框 (Border)**: `#dadce0`
- **主要文字 (Text)**: `#202124`
- **次要文字 (Text2)**: `#5f6368`

### 狀態色彩
- **成功 (Success) / 低風險 (Low)**: `#0d904f` (深綠色)
- **警告 (Warning) / 中風險 (Mid)**: `#e37400` (橘色)
- **危險 (Danger) / 高風險 (High)**: `#d93025` (紅色)

*(註：防護需求等級的高/中/低分別對應 Danger, Warning, Success 的色彩系統)*

---

## 3. UI 元件規範 (UI Components)

### 3.1 頂部導覽列 (Topbar)
- **背景**: 漸層藍色 `linear-gradient(135deg, #125dc6 0%, #1a73e8 42%, #2f86ef 100%)`。
- **特性**: `sticky` 吸頂，具備陰影 `box-shadow: 0 8px 24px rgba(17,62,128,.22)`。
- **導覽按鈕**: 半透明白底，Hover 與 Active 狀態時轉為純白背景並帶主色字體。

### 3.2 卡片容器 (Cards)
- **一般卡片 (`.card`)**: 
  - 白底，圓角 `10px`，陰影 `0 1px 3px rgba(0,0,0,.08)`。
  - 內距通常為 `16px`，下邊距 `14px`。
- **系統卡片 (`.sys-card`)**: 
  - 更精緻的立體感與漸層，圓角 `18px`，漸層背景 `linear-gradient(180deg, #fff 0%, #fbfdff 100%)`。
  - 具備右上角放射狀背景裝飾、Hover 時微幅上浮 `translateY(-2px)` 及加深陰影。

### 3.3 按鈕 (Buttons)
- **基礎類別 (`.btn`)**: 
  - 圓角 `6px`，文字 `12px` 加粗 `font-weight: 500`，內距 `7px 16px`。
- **樣式 (Variants)**:
  - `.btn-primary`: 主色底白字。
  - `.btn-success`, `.btn-warning`, `.btn-danger`: 對應狀態色底白字。
  - `.btn-outline`: 透明底，帶 `var(--border)` 邊框。
  - `.btn-sm`: 小按鈕，內距 `4px 10px`，文字 `11px`。

### 3.4 標籤與徽章 (Badges & Tags)
系統大量使用圓角徽章（`border-radius: 999px`）來呈現狀態與標籤：
- **實心徽章 (`.sys-badge`, `.result-badge`)**: 使用狀態色底、白字。
- **柔和標籤 (`.sys-tag`, `.detail-chip`, `.rating-chip`)**:
  - `High` (高): 淺紅底 `#fce8e6` / 紅字。
  - `Mid` (中): 淺黃底 `#fef7e0` / 橘字。
  - `Low` (低): 淺綠底 `#e6f4ea` / 綠字。
  - `Neutral` (中性): 淺灰底 `#edf2f7` / 深灰字 `#334155`。

### 3.5 表單與輸入框 (Forms & Inputs)
- **外觀**: 邊框 `1px solid #d1d9e6`（或 `var(--border)`），圓角 `6px` 至 `12px` 不等。
- **內距**: `10px 12px`，文字大小 `12px` 或 `13px`。
- **Focus 與錯誤狀態**: 錯誤或警告的輸入框會加上淺黃/淺橘背景（如 `#fffdf7`）與邊框（如 `#f1c36d`）。

### 3.6 彈出視窗 (Modals)
- **外觀**: 大圓角 `20px`，大陰影 `0 24px 70px rgba(15,23,42,.24)`，白色背景。
- **寬度限制**: 最大寬度為 `980px` (`width: min(94vw, 980px)`)。
- **內部排版**: 頭部（標題區）、內容區（可滾動）、底部（按鈕操作區）切割清晰。表單通常採用兩欄式 Grid (`grid-template-columns: 1fr 1fr`) 排版。

### 3.7 表格 (Tables)
- **評估表格 (`.assess-table`)**:
  - 文字大小 `12px`，文字強制換行 `overflow-wrap: anywhere`。
  - 標題列：底色深藍 `#0f5fa8`，文字純白，`sticky` 吸頂。
  - 資料列：Hover 時有微弱高亮背景 `#f8fbff`。修改中或未儲存（`.dirty`）的資料列會以淺黃色背景 `#fffdf7` 凸顯。

### 3.8 進度條 (Progress Bars)
- **基本形狀**: 圓角膠囊狀 `border-radius: 999px`，高度通常為 `6px` 至 `12px`。
- **填充效果**: 採用色彩漸層 (`linear-gradient`) 搭配向右移動的光澤動畫 (`animation: submitShimmer`) 表現進度感與活力。

---

## 4. 互動與微動畫 (Interaction & Animations)
- **過場特效 (Transitions)**: 按鈕、卡片 hover 通常配有 `0.15s` - `0.2s` 的短過場，如 `transform: translateY(-1px)` 與陰影變化。
- **動態進場**: 部分載入面板或 Modal 內容具備進場動畫 (`@keyframes stageIn`)，帶來由下微幅上升且淡入的滑順感。
- **Toast 提示訊息**: 固定於畫面右下角，黑底/深色底，使用 `opacity` 與 `transform` 滑入顯示，並可內建彩色進度條。
