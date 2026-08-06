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
- **2026-08-07**: 調整「資通系統清冊範本」的「開發型態」寫入規則。將 `generateInventorySheet` 中原本直接寫入 `建置方式` 的邏輯改為先透過字串對照，將「本機關建置套裝軟體」、「本機關委外開發」、「本機關自行開發」分別轉換為「套裝軟硬體」、「委外開發」、「自行開發」。
