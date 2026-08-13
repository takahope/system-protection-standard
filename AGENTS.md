# Repository Guidelines

## Project Structure & Module Organization
This repository is a Google Apps Script-based management tool for the `資通系統防護基準` workflow.

- `AppScript_Code.js`: backend Apps Script logic. When deploying, paste this into `Code.gs`.
- `AppScript_Index.html`: frontend UI, including HTML, CSS, and browser-side JavaScript. Deploy this as `Index.html`.
- `部署說明.md`: deployment and usage notes.
- `*.xlsx`, `*.pdf`: source reference materials, templates, and official attachments. Treat these as inputs and documentation, not executable code.

Keep business logic in `AppScript_Code.js` and UI behavior in `AppScript_Index.html`. Do not embed spreadsheet schema changes in multiple places without updating the related headers and form fields together.

## Build, Test, and Development Commands
There is no package manager or local build pipeline in this folder. Development is primarily manual through Google Sheets and Apps Script.

- `open AppScript_Code.js` / `open AppScript_Index.html`: inspect the source locally.
- `rg "function " AppScript_Code.js`: list backend entry points quickly.
- `rg "google.script.run|onclick|showPage" AppScript_Index.html`: trace UI actions and server calls.

Deployment steps are documented in `部署說明.md`: create a Google Sheet, paste the script into Apps Script, add `Index.html`, then deploy as a web app.

## Coding Style & Naming Conventions
Use the existing style consistently:

- Indentation: 2 spaces in HTML, CSS, and JavaScript.
- JavaScript: keep Apps Script-compatible ES5-style patterns (`var`, function declarations, `map(function (...) {})`).
- Naming: use `camelCase` for functions like `initializeSheets`, `getSystems`, and `addSystem`.
- Sheet names and object keys must match the current Chinese labels exactly, for example `系統清冊` and `防護需求分級評估`.

Prefer small, focused functions. Keep UI text and spreadsheet column names stable unless the corresponding deployment and data logic are updated together.

## Testing Guidelines
There is no automated test suite in this repository. Verify changes manually in a deployed Apps Script environment.

- Test `initializeSheets()` on a new spreadsheet.
- Verify CRUD flows, rating updates, and self-assessment saves from the web UI.
- Confirm any changed column headers still align with read/write logic.

## Commit & Pull Request Guidelines
This folder is not currently a Git repository, so no local commit history is available to infer conventions. Use short imperative commit messages such as `Add system assessment export` or `Fix dashboard completion rate`.

For pull requests, include:

- a clear summary of the user-facing or data-model change
- affected files and sheet tabs
- deployment or migration steps, if any
- screenshots for UI changes

## 事件紀錄
- **2026-08-06**: 修正文件產出佔位符空白問題。發現 `generateAssessmentDoc` 錯誤引用英文屬性（如 `system.name`, `system.mtpd`），改為中文表頭 key（如 `system['系統名稱']`）。另外驗證了「卡在產出中」問題實為部署版本未更新所致，符合 PLAYBOOK P2 部署問題排除法則。
- **2026-08-06**: 修正防護需求分級評估等級佔位符空白問題。發現 `generateAssessmentDoc` 誤呼叫唯讀版本的 `getRatingDetailsReadOnly_` 導致無法取得構面與判定等級資料，且錯誤地引用 `.dimension` 而非 `.field`。已修正為呼叫 `getRatingDetails_` 並將映射屬性改為 `.field`。
- **2026-08-06**: 變更文件產出的 `{{填表人}}` 顯示格式。修改 `generateAssessmentDoc` 邏輯，從讀取 `.displayName` 改為優先讀取乾淨的 `.name`，達成僅文件產出時不顯示信箱，且不影響其他試算表與 UI 的紀錄格式。
- **2026-08-07**: 調整「資通系統清冊範本」的「開發型態」寫入規則。將 `generateInventorySheet` 中原本直接寫入 `建置方式` 的邏輯改為先透過字串對照，將「本機關購置套裝軟體」、「本機關委外開發」、「本機關自行開發」分別轉換為「套裝軟硬體」、「委外開發」、「自行開發」。（並於稍後修正了字串比對的錯字，從「建置」修正為「購置」）。
- **2026-08-07**: 調整分級評估表中建置與維運單位的聯絡人抓取邏輯。將原本兩者共用單一 `contactStr` 的邏輯拆分，並依據廠商名稱是否為「中央研究院」判斷是否為委外：若是委外（非中央研究院），優先抓取「系統承辦窗口」角色；若是院內（中央研究院或空白），則維持優先抓取「開發」角色。
- **2026-08-13**: 修正 SheetJS 匯入功能引發的「檔案解析失敗」錯誤。發現前次任務雖在 `AppScript_Index.html` 中加入了 `<?!= include('AppScript_SheetJS'); ?>`，但未將 `AppScript_Code.js` 中的 `doGet` 從 `createHtmlOutputFromFile` 升級為 `createTemplateFromFile('Index').evaluate()`，亦未實作 `include` 函式，導致範本標籤未被解析而直接傳送到前端，進而造成前端找不到 `XLSX` 物件。已修正 `doGet` 邏輯並補上 `include` 函式。
- **2026-08-13**: 優化匯入模組的按鈕 UX。將 `AppScript_Index.html` 中原本會在檢查通過後並存的「檢查匯入內容」與「套用更新」兩個主按鈕，修改為互斥顯示狀態，並將後者文字改為「確認匯入」。當匯入檢查通過（`canApply`）時，原檢查按鈕會隱藏，並在同位置顯示確認按鈕，讓使用者操作更直覺；重新選擇檔案時則會重置此狀態。
- **2026-08-13**: 改進匯入模組的比對預覽畫面。原本僅會列出「將更新：符合性、現況說明」，現已修改 `buildAssessmentImportPreviewClient` 以紀錄 `oldValue`，並在 `renderAssessmentImportPreview` 中將變更渲染為具體的新舊對照格式（例如：`符合性：<del>不符合</del> ➔ 符合`），舊資料並加上灰色刪除線效果，讓使用者在確認匯入前能明確檢視每一項具體的資料異動。
- **2026-08-13**: 變更匯入模組的符合性驗證邏輯。原本只要「符合性」欄位出現無法識別的文字（如「未知」、「還沒做」）就會觸發 Error 並阻擋整個檔案匯入。現已放寬此限制：遇到無法識別的文字時不再阻擋匯入，而是自動將其降級為「不符合」，並在預覽畫面發出 Warning（「符合性出現未識別文字『...』，已自動轉為『不符合』」），讓使用者能順利匯入其他正常的項目。
- **2026-08-13**: 強化匯入模組的異常數值比對顯示。原本當「符合性」降級為「不符合」或映射為空值時，若與資料庫中既有值相同，該項目會從預覽清單中隱藏，或者僅顯示「➔ 不符合」讓人困惑。現已加入 `displayNew` 屬性與 `wasFallback` 追蹤機制，強制此類降級更新顯示於清單，並明確標示原始掃描內容（例如：`符合性：<del>不符合</del> ➔ 不符合 (原內容: 還沒做)`），達成完全透明的數值轉換預覽。
- **2026-08-13**: 優化系統詳情頁面的預設顯示分頁。修改 `AppScript_Index.html` 中的 HTML 結構與 `viewSystem` 的分頁重置邏輯，將預設開啟的頁籤從「防護需求分級評估」改為「防護基準自評」，減少使用者切換頁籤的操作負擔。並同步在 `viewSystem` 初始化流程中加入 `loadAssessment(sysId)`，確保預設進入自評頁籤時能正確觸發「懶載入（Lazy Loading）」機制拉取資料，解決原先畫面空白的問題。
- **2026-08-13**: 修正套用自評匯入時引發的 `ReferenceError`。因為前次重構時將讀取設定的程式碼從前端複製到後端，導致後端的 `applyAssessmentImportChanges` 誤呼叫了僅存在於前端的 `getPersistedRuleValue`。已將其替換為後端專用的 `getAssessmentApplicabilityConfig_().naLabel`，確保資料能成功寫入。
- **2026-08-13**: 修復匯入自評後，因換行與空白字元導致的「誤判為未儲存變更」問題。在 `AppScript_Index.html` 的 `normalizeAssessmentDraftValue` 中加入 `.replace(/\r\n/g, '\n').trim()`，統一將 Excel 匯入的 CRLF 轉換為瀏覽器 `<textarea>` 讀取的 LF，並濾除首尾空白，確保快照與 DOM 的資料能正確比對，不再觸發錯誤的未儲存警告。
- **2026-08-13**: 修正匯入模組預覽階段的差異誤判（False Positives）。將 `AppScript_Index.html` 內 `buildAssessmentImportPreviewClient` 的取值邏輯從單純的 `.trim()` 升級為呼叫 `normalizeAssessmentDraftValue`，讓新舊資料在比對前，統一先經過換行（CRLF 轉 LF）與空白濾除的正規化處理，確保預覽清單只顯示真正有意義的文字異動。
- **2026-08-13**: 調整匯入模組自動降級「不符合」的預覽邏輯。移除 `AppScript_Index.html` 中的強制顯示條件 `|| wasFallback`，讓原本會被強制顯示的異常文字（例如：「還沒做」降級為「不符合」），若與資料庫中既有值（也是「不符合」）完全相同時，不再顯示於差異清單中，減少無謂的干擾；但若既有值不同，則仍會如期顯示 `(原內容: 還沒做)` 供參考。
