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
- **2026-08-13**: 變更匯入模組的預覽畫面顯示順序。修改 `AppScript_Index.html` 內的 `renderAssessmentImportPreview`，將黃色的 Warning 訊息（包含略過的重複項次、不適用項目以及無法識別文字的降級警告）從實際變更清單的上方移至下方，使得畫面呈現依照「紅色錯誤 ➔ 實際更新清單 ➔ 黃色警告/略過項目」的順序，提升閱讀體驗。
- **2026-08-13**: 調整匯入模組略過不適用項目的判斷邏輯。將前端 `AppScript_Index.html` 與後端 `AppScript_Code.js` 在檢查是否略過匯入項目時，從原本呼叫 `isAssessmentNaItem` / `isAssessmentNa_` 改為嚴格檢查 `!isAssessmentApplicable` / `!isAssessmentControlApplicable_`。解決了過去使用者手動將符合性設為「不適用」後，系統就連同現況說明（不適用原因）的修改一併拒絕匯入的 Bug；現在只有真正因系統等級而不適用的項目才會被略過。
- **2026-08-13**: 增強匯入更新寫入後端時的使用者體驗。在 `AppScript_Index.html` 的 `applyAssessmentImportPreview` 中，將送出匯入時單純的文字提示 `showToast`，升級為具有動態進度條效果的 `showProgressToast` 與 `finishProgressToast`。這樣使用者在等待後端寫入資料庫時，能有更明確的視覺回饋（顯示進度條並在完成時填滿轉為綠色成功狀態）。
- **2026-08-13**: 修復首頁系統卡片（`.sys-card`）中標籤（`.sys-tag`）因 Flexbox 特性被異常拉伸的問題。在 `AppScript_Index.html` 內的 CSS 中，為 `.sys-tags` 容器加上 `align-items: center`，並為 `.sys-tag` 加上 `white-space: nowrap`，確保彩色外框能緊密包覆文字，維持整齊一致的膠囊形狀。
- **2026-09-11**: 新增通行碼輸入框「顯示／隱藏通行碼」切換功能。修改 `AppScript_Code.js` 的 `createPasscodeOutput_`，在通行碼輸入框右側加入經典極簡線條眼睛（Eye / Eye-off）SVG 切換按鈕，預設維持密碼遮蔽狀態（符合防護基準第 46 項要求），點擊切換明文與遮蔽，按鈕設為 type="button" 避免誤觸表單提交，且不依賴外部 CDN 圖示庫。
- **2026-09-16**: 修復自評匯出 Excel 開啟時出現「We found a problem with some content」錯誤。修改 `AppScript_Code.js` 內的 `populateAssessmentReportSheet_`，取消第 1 列大跨度（A1:Q1）合併儲存格以解除與 `setFrozenRows(5)` 的 OpenXML 視圖幾何衝突，標題改於 A1 儲存格獨立設定；並將資料區塊邊框改為一次性批次寫入，大幅精簡樣式表 XML 定義，解決 Excel 開啟損壞提示。（**診斷有誤，見 2026-11-05 紀錄**：此次修改未看過壞檔，合併儲存格與邊框並非損毀原因，Excel 損毀問題實際未被解決。）
- **2026-11-05**: 真正修復自評匯出 Excel 損毀（「We found a problem with some content」→ 修復失敗）。離線解壓壞檔（`docs/防護基準自評_收案系統_20261103_1610.xlsx`）後，所有 XML 部件與樣式皆合法，唯一異常是 `sheet1.xml` 的 `<c r="G27" t="e"><v>#ERROR!</v></c>`——`#ERROR!` 是 Google Sheets 專有錯誤值，不在 SpreadsheetML 合法錯誤值內，Excel 無法解析。來源為 `原始表格/…收案系統_1130902.xlsx` 的 G27 壞公式（快取值 `#ERROR!`），使項次 22 的現況說明帶有該字串；匯出時 `setValues` 將字串當使用者輸入解析，變成真正的錯誤儲存格。以測試檔（僅把 G27 由 `t="e"` 改為文字儲存格）在 Excel 實測可正常開啟，確認根因。修正：`populateAssessmentReportSheet_` 在寫入前先對整個寫入區 `setNumberFormat('@')`（純文字），使 `#ERROR!`、`=…`、`1.10`、`6-2` 等字串原樣保存。後續仍需：①在系統內將收案系統項次 22 的現況說明由 `#ERROR!` 清除；②搜尋「防護基準自評」工作表有無其他 `#ERROR!`；③已知同類風險未處理——`saveAssessmentItem_` / `batchSaveAssessment` 以 `setValues` 寫入使用者文字，以 `=` 開頭者會被存成公式。
