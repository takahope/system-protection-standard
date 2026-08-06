# 資通系統清冊產出功能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增「資通系統清冊」產出功能，將所有系統彙整至一份 Google Sheet 範本（每個系統一列）。

**Architecture:** 新增獨立的 `generateInventorySheet` 函式處理清冊產出，與現有 `generateAssessmentDoc` 分離。新增 `getPresidentFromHR_` 查詢單位主管。前端在下拉選單新增選項，批次產出時偵測清冊模式直接呼叫後端。

**Tech Stack:** Google Apps Script (ES5), SpreadsheetApp, DriveApp

## Global Constraints

- 修改 GAS 檔後必附部署聲明、禁止主動執行 clasp push、宣稱修復必附驗收證據。
- 使用 ES5 語法（`var`, `function(){}`, `.map(function(...){})`）。
- 中文 Sheet 名稱和 key 必須與現有欄位完全一致。
- 因 GAS 環境無自動化單元測試，測試步驟為 `node -c` 語法檢查和手動驗證說明。

---

### Task 1: Backend — Settings + HR Helper

**Files:**
- Modify: `AppScript_Code.js:1058` (新增設定項目)
- Modify: `AppScript_Code.js:3809` (新增 `getPresidentFromHR_` 函式，插入在 `getManagerFromHR_` 之後)

**Interfaces:**
- Consumes: `HR_SPREADSHEET_ID` (全域常數)、`HR_ROLE_ASSIGNMENT_SHEET_NAME` (全域常數，值為 `'人員職務配置'`)、`cachedHRData_` (快取變數，已被 `getManagerFromHR_` 使用)
- Produces: `getPresidentFromHR_()` → `string`（單位主管姓名，查無則空字串）；`inventory_sheet_template` 設定 key（供 Task 2 讀取）

- [ ] **Step 1: 在 `getDefaultRuleDefinitions_` 新增設定項目**

在 `AppScript_Code.js` 第 1058 行 (`doc_template_transl_center_sheet` 那一行之後) 插入：

```javascript
    {group:'doc_generation', key:'inventory_sheet_template', label:'資通系統清冊範本 ID (Sheet)', type:'text', value:'', description:'資通系統清冊的 Google Sheet 範本檔案 ID', enabled:true, sort:12},
```

- [ ] **Step 2: 新增 `getPresidentFromHR_` 函式**

在 `AppScript_Code.js` 第 3809 行（`getManagerFromHR_` 函式的 `}` 之後）插入：

```javascript
/**
 * 從 HR 人員職務配置表查詢單位主管（C欄 = 'PRE' 對應之 B欄姓名）。
 * @return {string} 單位主管姓名，查無則回傳空字串。
 */
function getPresidentFromHR_() {
  if (!HR_SPREADSHEET_ID) return '';
  try {
    if (!cachedHRData_) {
      var hrSs = SpreadsheetApp.openById(HR_SPREADSHEET_ID);
      var hrSheet = hrSs.getSheetByName(HR_ROLE_ASSIGNMENT_SHEET_NAME);
      if (!hrSheet) return '';
      cachedHRData_ = hrSheet.getDataRange().getValues();
    }
    var data = cachedHRData_;
    for (var i = 1; i < data.length; i++) {
      var group = String(data[i][2] || '').trim(); // C欄 (index 2)
      if (group === 'PRE') {
        return data[i][1] || ''; // B欄 (index 1) = 姓名
      }
    }
  } catch(e) {
    console.error('HR President Lookup failed', e);
  }
  return '';
}
```

- [ ] **Step 3: 語法檢查**

Run: `node -c AppScript_Code.js`
Expected: 無輸出，exit code 0

- [ ] **Step 4: Commit**

```bash
git add AppScript_Code.js
git commit -m "feat: add inventory sheet template setting and getPresidentFromHR_ helper"
```

---

### Task 2: Backend — Implement `generateInventorySheet`

**Files:**
- Modify: `AppScript_Code.js:3958` (在 `batchGenerateAssessmentDocs` 函式之後插入新函式)

**Interfaces:**
- Consumes:
  - `getPresidentFromHR_()` → `string` (from Task 1)
  - `getRuleConfig_()` → rules object
  - `getRuleValue_(rules, group, key, default)` → `string`
  - `getCurrentEvaluator()` → `{name, email}`
  - `getRatingDetails_(systemId)` → `Array<{field, selectedLevel, ...}>`
  - `getSystemRolesData_(systemId)` → `Array<{roleName, name, email}>`
  - `assertRuleAdmin_()` — 權限檢查
- Produces: `generateInventorySheet(templateKey)` → `{success: boolean, url: string, name: string}`

- [ ] **Step 1: 新增 `generateInventorySheet` 函式**

在 `AppScript_Code.js` 的 `batchGenerateAssessmentDocs` 函式結尾 `}` 之後（約第 3958 行後）插入：

```javascript
/**
 * 產出資通系統清冊：將所有系統彙整至一份 Google Sheet 範本中。
 * @param {string} templateKey - 規則設定中的範本 key，預設 'inventory_sheet_template'
 * @return {{success:boolean, url:string, name:string}}
 */
function generateInventorySheet(templateKey) {
  assertRuleAdmin_();

  var rules = getRuleConfig_();
  var tplId = getRuleValue_(rules, 'doc_generation', templateKey || 'inventory_sheet_template', '');
  var folderId = getRuleValue_(rules, 'doc_generation', 'doc_output_folder', '');

  if (!tplId) throw new Error('請先在系統設定中設定資通系統清冊範本 ID。');
  if (!folderId) throw new Error('請先在系統設定中設定文件輸出資料夾 ID。');

  try {
    // ---- 1. 複製範本 ----
    var tplFile = DriveApp.getFileById(tplId);
    var folder  = DriveApp.getFolderById(folderId);
    var now     = new Date();
    var dateStr = Utilities.formatDate(now, 'Asia/Taipei', 'yyyy-MM-dd');
    var newName = '資通系統清冊_' + dateStr;
    var newFile = tplFile.makeCopy(newName, folder);
    var outSs   = SpreadsheetApp.openById(newFile.getId());

    // ---- 2. 表頭佔位符替換 ----
    var evaluator     = getCurrentEvaluator();
    var evaluatorName = evaluator.name || evaluator.email || '';
    var parts    = dateStr.split('-');
    var rocYear  = String(parseInt(parts[0], 10) - 1911);
    var monthStr = String(parseInt(parts[1], 10));
    var dayStr   = String(parseInt(parts[2], 10));
    var president = getPresidentFromHR_();

    var headerMap = {
      '{{填表人}}':        evaluatorName,
      '{{單位主管}}':      president,
      '{{填表日期_民國年}}': rocYear,
      '{{填表日期_月}}':    monthStr,
      '{{填表日期_日}}':    dayStr
    };
    for (var ph in headerMap) {
      outSs.createTextFinder(ph).replaceAllWith(
        headerMap[ph] != null ? String(headerMap[ph]) : ''
      );
    }

    // ---- 3. 定位欄位標題列 ----
    var outSheet = outSs.getSheets()[0];
    var tplData  = outSheet.getDataRange().getValues();
    var headerRowIdx = -1;
    var colMap = {};

    for (var r = 0; r < tplData.length; r++) {
      for (var c = 0; c < tplData[r].length; c++) {
        if (String(tplData[r][c]).trim() === '資通系統名稱') {
          headerRowIdx = r;
          for (var cc = 0; cc < tplData[r].length; cc++) {
            var h = String(tplData[r][cc]).trim();
            if (h) colMap[h] = cc;
          }
          break;
        }
      }
      if (headerRowIdx >= 0) break;
    }
    if (headerRowIdx < 0) throw new Error('範本中找不到「資通系統名稱」欄位標題。');

    // ---- 4. 讀取系統清冊資料 ----
    var srcSs    = SpreadsheetApp.getActiveSpreadsheet();
    var sysSheet = srcSs.getSheetByName('系統清冊');
    if (!sysSheet) throw new Error('找不到「系統清冊」工作表。');
    var sysData = sysSheet.getDataRange().getDisplayValues();
    if (sysData.length <= 1) throw new Error('系統清冊無資料。');

    var sysHeaders = sysData[0];
    var systems = [];
    for (var i = 1; i < sysData.length; i++) {
      var obj = {};
      for (var j = 0; j < sysHeaders.length; j++) {
        obj[sysHeaders[j]] = sysData[i][j];
      }
      if (obj['系統ID'] || obj['系統名稱']) systems.push(obj);
    }

    // ---- 5. 確保輸出表有足夠列數 ----
    var dataStartRow = headerRowIdx + 2; // Sheet 行號 1-based
    var availRows = outSheet.getMaxRows() - dataStartRow + 1;
    if (systems.length > availRows) {
      outSheet.insertRowsAfter(outSheet.getMaxRows(), systems.length - availRows);
    }

    // ---- 6. 確定寫入範圍 ----
    var fieldNames = [
      '資通系統名稱', '資通系統描述', '管理單位', '管理人',
      '使用單位', '開發型態', '機密性等級', '完整性等級',
      '可用性等級', '法規遵循性等級', '資通系統防護等級', '是否含個人資料'
    ];
    var minCol = Infinity, maxCol = -1;
    for (var fi = 0; fi < fieldNames.length; fi++) {
      if (colMap.hasOwnProperty(fieldNames[fi])) {
        if (colMap[fieldNames[fi]] < minCol) minCol = colMap[fieldNames[fi]];
        if (colMap[fieldNames[fi]] > maxCol) maxCol = colMap[fieldNames[fi]];
      }
    }
    var numCols = maxCol - minCol + 1;

    // ---- 7. 組裝所有系統列 ----
    var rowsToWrite = [];
    for (var s = 0; s < systems.length; s++) {
      var sys = systems[s];
      var sysId = sys['系統ID'];

      // 評估明細
      var detailMap = {};
      try {
        var dets = getRatingDetails_(sysId);
        for (var di = 0; di < dets.length; di++) detailMap[dets[di].field] = dets[di];
      } catch(e) { /* 無評估資料，等級欄位留空 */ }

      // 管理人
      var mgrName = '';
      try {
        var roles = getSystemRolesData_(sysId);
        var mgr = roles.filter(function(r){ return r.roleName === '系統部署維護人員'; })[0]
               || roles.filter(function(r){ return r.roleName === '系統承辦窗口'; })[0];
        mgrName = mgr ? mgr.name : '';
      } catch(e) {}

      // 是否含個人資料
      var piiCount = parseInt(sys['個資數量'] || '0', 10);
      var hasPII = isNaN(piiCount) || piiCount <= 0 ? '否' : '是';

      var vals = {
        '資通系統名稱':     sys['系統名稱'] || '',
        '資通系統描述':     '',
        '管理單位':         '',
        '管理人':           mgrName,
        '使用單位':         '',
        '開發型態':         sys['建置方式'] || '',
        '機密性等級':       (detailMap['confidentiality'] || {}).selectedLevel || '',
        '完整性等級':       (detailMap['integrity'] || {}).selectedLevel || '',
        '可用性等級':       (detailMap['availability'] || {}).selectedLevel || '',
        '法規遵循性等級':   (detailMap['compliance'] || {}).selectedLevel || '',
        '資通系統防護等級': sys['防護需求等級'] || '',
        '是否含個人資料':   hasPII
      };

      var row = new Array(numCols);
      for (var ci = 0; ci < numCols; ci++) row[ci] = '';
      for (var fn in vals) {
        if (colMap.hasOwnProperty(fn)) row[colMap[fn] - minCol] = vals[fn];
      }
      rowsToWrite.push(row);
    }

    // ---- 8. 批次寫入 ----
    if (rowsToWrite.length > 0) {
      outSheet.getRange(dataStartRow, minCol + 1, rowsToWrite.length, numCols)
              .setValues(rowsToWrite);
    }
    SpreadsheetApp.flush();

    return { success: true, url: newFile.getUrl(), name: newName };
  } catch (err) {
    throw new Error('產出清冊失敗：' + err.toString());
  }
}
```

- [ ] **Step 2: 語法檢查**

Run: `node -c AppScript_Code.js`
Expected: 無輸出，exit code 0

- [ ] **Step 3: Commit**

```bash
git add AppScript_Code.js
git commit -m "feat: add generateInventorySheet function for batch inventory export"
```

---

### Task 3: Frontend — UI Integration

**Files:**
- Modify: `AppScript_Index.html:850` (下拉選單新增選項)
- Modify: `AppScript_Index.html:6003-6006` (`doBatchGenerateDocs` 加入清冊分支)
- Modify: `AppScript_Index.html:6040` (新增 `executeInventorySheet` 函式，插入在 `executeBatchGenerateDocs` 之後)

**Interfaces:**
- Consumes: `generateInventorySheet(templateKey)` → `{success, url, name}` (from Task 2)
- Produces: 前端 UI 完整流程 — 下拉選單 + 批次產出分支 + 成功/失敗回饋

- [ ] **Step 1: 在下拉選單新增「資通系統清冊」選項**

在 `AppScript_Index.html` 第 850 行（`<option value="doc_template_transl_center">` 之後）插入：

```html
              <option value="inventory_sheet">資通系統清冊</option>
```

- [ ] **Step 2: 修改 `doBatchGenerateDocs` 加入清冊模式偵測**

將 `AppScript_Index.html` 第 6003-6006 行的 `doBatchGenerateDocs` 函式替換為：

```javascript
function doBatchGenerateDocs() {
  var selectValue = document.getElementById('doc-template-select').value;

  // 清冊模式：跳過格式選擇 Modal，直接產出 Sheet
  if (selectValue === 'inventory_sheet') {
    if (!confirm('即將產出資通系統清冊，這可能需要幾分鐘時間。確定要繼續嗎？')) return;
    executeInventorySheet();
    return;
  }

  // 評估表模式：原有流程
  if (!confirm('即將為所有已評估系統產出文件，這可能需要幾分鐘時間。確定要繼續嗎？')) return;
  openTemplateChoiceModal({ type: 'batch' });
}
```

- [ ] **Step 3: 新增 `executeInventorySheet` 函式**

在 `AppScript_Index.html` 的 `executeBatchGenerateDocs` 函式結尾 `}` 之後（約第 6040 行後）插入：

```javascript
function executeInventorySheet() {
  var btn = document.getElementById('btn-batch-gen');
  var status = document.getElementById('batch-gen-status');
  var resultsDiv = document.getElementById('batch-gen-results');

  btn.disabled = true;
  status.textContent = '清冊產出中，請勿關閉視窗...';
  resultsDiv.innerHTML = '';

  google.script.run
    .withSuccessHandler(function(res) {
      btn.disabled = false;
      status.textContent = '產出完成！';
      resultsDiv.innerHTML = '<p><a href="' + res.url + '" target="_blank">' + res.name + '</a></p>';
    })
    .withFailureHandler(function(err) {
      btn.disabled = false;
      status.textContent = '';
      showToast('清冊產出失敗：' + (err.message || err), 'error');
    })
    .generateInventorySheet('inventory_sheet_template');
}
```

- [ ] **Step 4: 語法結構檢查**

以人工方式檢查 HTML 結構完整性：確認所有 `<script>` 標籤對應關閉，函式語法正確。

- [ ] **Step 5: Commit**

```bash
git add AppScript_Index.html
git commit -m "feat: add inventory sheet option to dropdown and batch generate flow"
```
