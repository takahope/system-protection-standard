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
