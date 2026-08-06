# 支援 Google Sheet 範本功能設計規格 (Design Spec)

## 1. 簡介 (Introduction)
目前系統產出「資通系統防護需求分級評估表」僅支援 Google Doc 作為範本。此功能擴充將允許使用者自由選擇要匯出的檔案格式為 Google Doc 或 Google Sheet，並且可以針對不同的表單種類設定對應的 Sheet 範本 ID。

## 2. 介面變更 (UI Changes)

### 2.1 規則設定頁面 (Settings)
- 在現有的設定欄位下，針對每一種表單新增對應的 Google Sheet 範本 ID 欄位。
- 原有欄位：`doc_template_transl_center` (轉譯中心評估表範本 ID - Google Doc)
- 新增欄位：`doc_template_transl_center_sheet` (轉譯中心評估表範本 ID - Google Sheet)

### 2.2 匯出功能 (Export Actions)
- **保留** 現有的「批次產出全部」旁邊的下拉式選單（用於選擇表單種類，例如「轉譯中心評估表」）。
- 修改「產出此系統評估表 (單一產出)」與「批次產出全部 (批次產出)」的觸發流程：
  1. 點擊按鈕後，不再直接開始產出。
  2. 彈出一個置中對話框 (Modal)，標題為：「請選擇要匯出的檔案格式」。
  3. 對話框內提供三個按鈕：
     - `📄 Google Doc`
     - `📊 Google Sheet`
     - `取消`
  4. 點擊格式按鈕後，彈出視窗關閉，前端根據使用者選擇的表單種類與格式，產生對應的 `templateKey` (若選 Sheet 則在原 key 後加上 `_sheet`)，發送請求給後端並開始產出。

## 3. 後端變更 (Backend Changes)

### 3.1 `generateAssessmentDoc(systemId, templateKey)`
- 取得 `templateFile` 後，使用 `templateFile.getMimeType()` 判斷檔案類型。
- 若 `mimeType === MimeType.GOOGLE_DOCS`：維持現有 `DocumentApp` 替換邏輯。
- 若 `mimeType === MimeType.GOOGLE_SHEETS`：
  - 使用 `SpreadsheetApp.openById(newFile.getId())` 開啟剛複製的試算表。
  - 迴圈讀取 `mapping` 物件，對每一個變數執行 `ss.createTextFinder(key).replaceAllWith(replacement)`。
- 若為其他未知的 MIME Type，拋出錯誤。

## 4. 錯誤處理 (Error Handling)
- 若使用者未設定對應格式的範本 ID，後端將拋出錯誤，前端 Toast 會顯示「尚未設定範本 ID」。
- 若 Google Sheet 授權不足，將依據錯誤訊息提示使用者進行審查權限。

