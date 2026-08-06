# Support Google Sheet Template Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓使用者在產出防護需求分級評估表時，能自由選擇要使用 Google Doc 或是 Google Sheet 範本，系統會自動根據格式進行佔位符替換。

**Architecture:** 前端點擊產出時會開啟一個對話框讓使用者選擇要使用哪種範本格式。選擇後，將附加 `_sheet` 後綴（若選 Sheet）或原 Key 送至後端。後端 `generateAssessmentDoc` 透過 `MimeType` 判斷檔案類型，若為試算表則呼叫 `SpreadsheetApp` 的 `TextFinder` 功能執行全域替換。

**Tech Stack:** Google Apps Script, HTML, Vanilla JavaScript, CSS

## Global Constraints

- 修改 GAS 檔後必附部署聲明、禁止主動執行 clasp push、宣稱修復必附驗收證據。
- 遵循原有的 UI 呈現風格 (如 modal class `modal-overlay`, `modal-content`)
- 因 GAS 環境無自動化單元測試，測試步驟為寫入測試用的 Apps Script 函式或說明手動驗證步驟。

---

### Task 1: Add Google Sheet Template ID to Settings

**Files:**
- Modify: `AppScript_Code.js`

**Interfaces:**
- Consumes: N/A
- Produces: `doc_template_transl_center_sheet` rule in `getDefaultRules_`

- [ ] **Step 1: Write minimal implementation**

Modify `AppScript_Code.js` around line 1057 (inside `getDefaultRules_`) to add the new setting rule:

```javascript
    {group:'doc_generation', key:'doc_template_transl_center', label:'轉譯中心評估表範本 ID (Doc)', type:'text', value:'', description:'設定用於產出分級評估表的 Google Doc 範本 ID (轉譯中心)', enabled:true, sort:10},
    {group:'doc_generation', key:'doc_template_transl_center_sheet', label:'轉譯中心評估表範本 ID (Sheet)', type:'text', value:'', description:'設定用於產出分級評估表的 Google Sheet 範本 ID (轉譯中心)', enabled:true, sort:11},
```

- [ ] **Step 2: Verify in Apps Script Editor**
由於無法執行 pytest，請手動確認 JavaScript 語法正確（無少逗號等錯誤）。

- [ ] **Step 3: Commit**

```bash
git add AppScript_Code.js
git commit -m "feat: add Google Sheet template config to default rules"
```

---

### Task 2: Create Template Choice Modal in UI

**Files:**
- Modify: `AppScript_Index.html`

**Interfaces:**
- Consumes: N/A
- Produces: `<div id="modal-template-choice">` block in HTML.

- [ ] **Step 1: Write minimal implementation**

在 `AppScript_Index.html` 中 `<!-- Toast 提示組件 -->` 的下方新增以下 Modal HTML：

```html
<!-- 範本選擇 Modal -->
<div id="modal-template-choice" class="modal-overlay" style="display:none; z-index:9999;">
  <div class="modal-content" style="max-width: 400px; text-align: center;">
    <h3 style="margin-top:0; color:var(--primary);">請選擇要匯出的檔案格式</h3>
    <p style="color:var(--text2); font-size:14px; margin-bottom: 20px;">針對您選擇的表單，系統將使用對應格式的範本進行產出。</p>
    <div style="display: flex; flex-direction: column; gap: 12px;">
      <button class="btn btn-primary" onclick="confirmTemplateChoice('doc')" style="width: 100%; padding: 12px; font-size: 16px;">📄 使用 Google Doc 範本</button>
      <button class="btn btn-primary" onclick="confirmTemplateChoice('sheet')" style="width: 100%; padding: 12px; font-size: 16px; background: #0f9d58; border-color: #0f9d58;">📊 使用 Google Sheet 範本</button>
      <button class="btn btn-outline" onclick="closeTemplateChoiceModal()" style="width: 100%;">取消</button>
    </div>
  </div>
</div>

<script>
var pendingGenerateContext = null;

function openTemplateChoiceModal(context) {
  pendingGenerateContext = context;
  document.getElementById('modal-template-choice').style.display = 'flex';
}

function closeTemplateChoiceModal() {
  pendingGenerateContext = null;
  document.getElementById('modal-template-choice').style.display = 'none';
}

function confirmTemplateChoice(format) {
  document.getElementById('modal-template-choice').style.display = 'none';
  if (pendingGenerateContext) {
    if (pendingGenerateContext.type === 'single') {
      executeSingleGenerateDoc(format);
    } else if (pendingGenerateContext.type === 'batch') {
      executeBatchGenerateDocs(format);
    }
  }
}
</script>
```

- [ ] **Step 2: Commit**

```bash
git add AppScript_Index.html
git commit -m "feat: add template format choice modal UI"
```

---

### Task 3: Hook Up Generate Buttons to Modal

**Files:**
- Modify: `AppScript_Index.html`

**Interfaces:**
- Consumes: `openTemplateChoiceModal`, `executeSingleGenerateDoc`, `executeBatchGenerateDocs`
- Produces: Modified `doSingleGenerateDoc` and `doBatchGenerateDocs` flows.

- [ ] **Step 1: Write minimal implementation**

修改 `doBatchGenerateDocs` 和 `doSingleGenerateDoc`，並新增實際執行的函式。將現有 `AppScript_Index.html` 內的對應邏輯進行重構：

```javascript
// 原本的 doBatchGenerateDocs 變成開啟 Modal
function doBatchGenerateDocs() {
  if (!confirm('即將為所有已評估系統產出文件，這可能需要幾分鐘時間。確定要繼續嗎？')) return;
  openTemplateChoiceModal({ type: 'batch' });
}

// 實際執行的批次產出
function executeBatchGenerateDocs(format) {
  var baseTemplateKey = document.getElementById('doc-template-select').value;
  var templateKey = format === 'sheet' ? baseTemplateKey + '_sheet' : baseTemplateKey;
  
  var btn = document.getElementById('btn-batch-gen');
  var status = document.getElementById('batch-gen-status');
  var resultsDiv = document.getElementById('batch-gen-results');
  
  btn.disabled = true;
  status.textContent = '產出中，請勿關閉視窗...';
  resultsDiv.innerHTML = '';
  
  google.script.run
    .withSuccessHandler(function(res) {
      btn.disabled = false;
      status.textContent = '產出完成！';
      var html = '<ul style="padding-left:20px; color:var(--text);">';
      res.results.forEach(function(r) {
        html += '<li><a href="' + r.url + '" target="_blank">' + r.name + '</a></li>';
      });
      res.errors.forEach(function(e) {
        html += '<li style="color:var(--danger)">失敗 [' + e.systemId + ']: ' + e.error + '</li>';
      });
      html += '</ul>';
      resultsDiv.innerHTML = html;
    })
    .withFailureHandler(function(err) {
      btn.disabled = false;
      status.textContent = '';
      showToast('批次產出失敗：' + (err.message || err), 'error');
    })
    .batchGenerateAssessmentDocs(templateKey);
}

// 原本的 doSingleGenerateDoc 變成開啟 Modal
function doSingleGenerateDoc() {
  if (!currentSystem || !currentSystem['系統ID']) return;
  openTemplateChoiceModal({ type: 'single' });
}

// 實際執行的單一產出
function executeSingleGenerateDoc(format) {
  if (!currentSystem || !currentSystem['系統ID']) return;
  var sysId = currentSystem['系統ID'];
  // 注意：單一產出目前寫死使用轉譯中心評估表，若格式為 sheet 則附加 _sheet
  var templateKey = format === 'sheet' ? 'doc_template_transl_center_sheet' : 'doc_template_transl_center';
  
  var btn = document.getElementById('btn-single-gen');
  var status = document.getElementById('single-gen-status');
  
  btn.disabled = true;
  status.textContent = '產出中...';
  
  google.script.run
    .withSuccessHandler(function(res) {
      btn.disabled = false;
      status.textContent = '產出成功！';
      showToast('文件產出成功');
      window.open(res.url, '_blank');
      setTimeout(function(){ status.textContent = ''; }, 3000);
    })
    .withFailureHandler(function(err) {
      btn.disabled = false;
      status.textContent = '';
      showToast('產出失敗：' + (err.message || err), 'error');
    })
    .generateAssessmentDoc(sysId, templateKey);
}
```

- [ ] **Step 2: Commit**

```bash
git add AppScript_Index.html
git commit -m "feat: hook generate buttons to template choice modal"
```

---

### Task 4: Update Backend to Support SpreadsheetApp

**Files:**
- Modify: `AppScript_Code.js`

**Interfaces:**
- Consumes: `templateKey` sent from Frontend.
- Produces: Backend replaces placeholders in either Doc or Sheet.

- [ ] **Step 1: Write minimal implementation**

在 `AppScript_Code.js` 的 `generateAssessmentDoc` 中修改 `try { ... }` 區塊，加入 `MimeType` 判斷邏輯。

替換原有的 `var doc = DocumentApp.openById(...)` 到 `doc.saveAndClose()`，改為以下內容：

```javascript
    var templateFile = DriveApp.getFileById(templateId);
    var targetFolder = DriveApp.getFolderById(folderId);
    var newFileName = system.name + '_資通系統防護需求分級評估表';
    var newFile = templateFile.makeCopy(newFileName, targetFolder);
    
    var mapping = {
      '{{填表人}}': evaluatorName,
      '{{填表日期_民國年}}': rocYear,
      '{{填表日期_月}}': monthStr,
      '{{填表日期_日}}': dayStr,
      '{{資通系統名稱}}': system.name || '',
      '{{系統管理人}}': sysManagerName,
      '{{系統開發型態}}': devTypeStr,
      '{{建置單位／廠商}}': (system.builderVendor || '') + (contactStr ? ' - ' + contactStr : ''),
      '{{維運單位／廠商}}': (system.maintenanceVendor || '') + (contactStr ? ' - ' + contactStr : ''),
      '{{MTPD}}': system.mtpd != null ? system.mtpd : '',
      '{{RTO}}': system.rto != null ? system.rto : '',
      '{{RPO}}': system.rpo != null ? system.rpo : '',
      '{{機密性說明}}': getAppendix9Description_('機密性', (detailMap['confidentiality'] || {}).selectedLevel),
      '{{完整性說明}}': getAppendix9Description_('完整性', (detailMap['integrity'] || {}).selectedLevel),
      '{{可用性說明}}': getAppendix9Description_('可用性', (detailMap['availability'] || {}).selectedLevel),
      '{{法律遵循性說明}}': getAppendix9Description_('法律遵循性', (detailMap['compliance'] || {}).selectedLevel),
      '{{系統管理人簽章}}': sysManagerName,
      '{{系統管理單位主管簽章}}': sysManagerBoss,
      '{{機密性等級}}': (detailMap['confidentiality'] || {}).selectedLevel || '',
      '{{完整性等級}}': (detailMap['integrity'] || {}).selectedLevel || '',
      '{{可用性等級}}': (detailMap['availability'] || {}).selectedLevel || '',
      '{{法律遵循性等級}}': (detailMap['compliance'] || {}).selectedLevel || '',
      '{{防護需求等級}}': summary.finalLevel || ''
    };
    
    var mimeType = templateFile.getMimeType();
    
    if (mimeType === MimeType.GOOGLE_DOCS) {
      var doc = DocumentApp.openById(newFile.getId());
      var body = doc.getBody();
      for (var key in mapping) {
        body.replaceText(key, mapping[key] != null ? String(mapping[key]) : '');
      }
      doc.saveAndClose();
    } else if (mimeType === MimeType.GOOGLE_SHEETS) {
      var ss = SpreadsheetApp.openById(newFile.getId());
      for (var key in mapping) {
        var replacement = mapping[key] != null ? String(mapping[key]) : '';
        // 透過 TextFinder 在整份試算表中尋找並替換
        ss.createTextFinder(key).replaceAllWith(replacement);
      }
    } else {
      throw new Error('不支援的範本格式。請使用 Google Doc 或 Google Sheet。');
    }
    
    return { success: true, url: newFile.getUrl(), name: newFileName };
```
> 注意上述改動中，為了方便迴圈處理，我們將所有單獨的 `.replaceText('{{...}}', ...)` 也整併到 `mapping` 字典裡，讓邏輯更簡潔。

- [ ] **Step 2: Commit**

```bash
git add AppScript_Code.js
git commit -m "feat: backend support for Google Sheet template replacement"
```
