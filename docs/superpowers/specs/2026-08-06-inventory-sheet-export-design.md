# 資通系統清冊產出功能設計

## 概要

新增「資通系統清冊」產出功能，將所有系統的關鍵資訊彙整至一份 Google Sheet 範本中（每個系統一列），與現有的「一個系統一份文件」的評估表產出流程並行存在。

## 設計決策

- **獨立函式**：新增 `generateInventorySheet(templateKey)` 與現有 `generateAssessmentDoc` 完全分離，因兩者本質不同（多系統→一張表 vs 一系統→一份文件）。
- **僅批次模式**：清冊產出只支援批次（一次產出包含所有系統的完整清冊），不支援單一系統產出。
- **僅 Sheet 格式**：清冊本質為表格資料，產出固定為 Google Sheet，不經過 Doc/Sheet 格式選擇 Modal。
- **留空欄位**：「資通系統描述」、「管理單位」、「使用單位」留空，由使用者手動補充。

## 欄位對照表

### 表頭區域（佔位符替換）

| 範本佔位符 | 資料來源 | 說明 |
|-----------|---------|------|
| `{{填表人}}` | `evaluator.name` | 複用現有邏輯 |
| `{{單位主管}}` | HR `人員職務配置` C欄=`PRE` → B欄姓名 | 新增 `getPresidentFromHR_()` |
| `{{填表日期_民國年}}` | 當前西元年 - 1911 | 複用現有邏輯 |
| `{{填表日期_月}}` | 當前月份 | 複用現有邏輯 |
| `{{填表日期_日}}` | 當前日期 | 複用現有邏輯 |

### 資料列區域（逐列寫入）

每個系統寫入一列，欄位順序依照範本的表格欄位排列：

| # | 範本欄位 | 資料來源 | 說明 |
|---|---------|---------|------|
| 1 | 資通系統名稱 | `system['系統名稱']` | 直接讀取 |
| 2 | 資通系統描述 | （留空） | 使用者手動補充 |
| 3 | 管理單位 | （留空） | 固定值，使用者手動填入 |
| 4 | 管理人 | 系統角色（優先：部署維護人員→承辦窗口） | 複用現有 `generateAssessmentDoc` 的角色查詢邏輯 |
| 5 | 使用單位 | （留空） | 固定值，使用者手動填入 |
| 6 | 開發型態 | `system['建置方式']` | 直接讀取文字值（不使用核取方框格式） |
| 7 | 機密性等級 | `getRatingDetails_(systemId)` | 複用現有邏輯 |
| 8 | 完整性等級 | `getRatingDetails_(systemId)` | 複用現有邏輯 |
| 9 | 可用性等級 | `getRatingDetails_(systemId)` | 複用現有邏輯 |
| 10 | 法規遵循性等級 | `getRatingDetails_(systemId)` | 複用現有邏輯 |
| 11 | 資通系統防護等級 | `system['防護需求等級']` | 直接讀取 |
| 12 | 是否含個人資料 | `system['個資數量']` > 0 → `是`，否則 `否` | 新邏輯 |

## 架構

### 後端 (`AppScript_Code.js`)

#### 新增函式

1. **`generateInventorySheet(templateKey)`**
   - 入口函式，供前端呼叫。
   - 流程：
     1. 從規則設定取得範本 ID 和輸出資料夾 ID。
     2. 複製範本到輸出資料夾，命名加上時間戳。
     3. 用 `SpreadsheetApp.openById()` 開啟複本。
     4. 以 `createTextFinder` 替換表頭佔位符（填表人、單位主管、填表日期）。
     5. 取得所有系統（`getSystems()`）。
     6. 對每個系統，組裝一列資料並寫入對應列。
     7. 回傳 `{ success: true, url, name }`。

2. **`getPresidentFromHR_()`**
   - 從 HR 試算表的「人員職務配置」工作表中，找到 C 欄值為 `PRE` 的列，取其 B 欄（姓名）。
   - 若找不到，回傳空字串。

#### 設定項目

在 `getDefaultRuleDefinitions_()` 的 `doc_generation` 群組中新增：

```javascript
{
  group: 'doc_generation',
  key: 'inventory_sheet_template',
  label: '資通系統清冊範本 ID (Sheet)',
  type: 'string',
  value: '',
  description: '資通系統清冊的 Google Sheet 範本檔案 ID',
  enabled: true,
  sort: 12
}
```

### 前端 (`AppScript_Index.html`)

#### 下拉選單

在 `#doc-template-select` 新增選項：

```html
<option value="inventory_sheet">資通系統清冊</option>
```

#### 產出流程

- 當選擇「資通系統清冊」時，點擊「批次產出全部」：
  - 跳過格式選擇 Modal（清冊固定為 Sheet）。
  - 直接呼叫 `google.script.run.generateInventorySheet('inventory_sheet_template')`。
  - 成功後顯示檔案連結。
- 「單一產出」按鈕在清冊模式下禁用或隱藏。

## 資料流

```
使用者 → 選擇「資通系統清冊」(下拉) → 點擊「批次產出全部」
→ 前端判斷為清冊模式 → 跳過格式 Modal → 呼叫 generateInventorySheet
→ 後端：
   1. 複製範本
   2. TextFinder 替換表頭佔位符
   3. getSystems() 取得所有系統
   4. 迴圈：每個系統 → getRatingDetails_ + 角色查詢 → 寫入一列
   5. 回傳 { success, url, name }
→ 前端顯示產出檔案連結（window.open）
```

## 範本結構假設

範本 Google Sheet 結構：
- **表頭區域**（前幾列）：包含 `{{填表人}}`、`{{單位主管}}`、`{{填表日期_民國年}}`、`{{填表日期_月}}`、`{{填表日期_日}}` 等佔位符。
- **資料表格**：具有欄標題列（資通系統名稱、資通系統描述...），資料從標題列的下一列開始填寫。
- 實作時以 `createTextFinder('資通系統名稱')` 定位欄標題列，從下一列開始寫入資料。

## 錯誤處理

- 範本 ID 未設定 → 回傳錯誤訊息「請先在系統設定中設定資通系統清冊範本 ID」。
- 系統無評估資料 → 等級欄位填空字串，不中斷整批產出。
- HR 查無 PRE 人員 → 單位主管欄填空字串。
- 複製範本失敗 → 回傳錯誤，含原始錯誤訊息。

## 影響範圍

| 檔案 | 變更類型 |
|------|---------|
| `AppScript_Code.js` | 新增 `generateInventorySheet`、`getPresidentFromHR_`、設定項目 |
| `AppScript_Index.html` | 下拉選單新增選項、批次產出邏輯分支、單一產出禁用邏輯 |
