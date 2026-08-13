// test_frontend_diff.js
var fs = require('fs');

// Mock browser globals for Node env
global.window = { addEventListener: function() {}, removeEventListener: function() {} };
global.document = {
  addEventListener: function() {},
  removeEventListener: function() {},
  getElementById: function(id) { if (id === "assessment-import-file") return { files: [] }; return { classList: { add: function(){}, remove: function(){} } }; },
  querySelector: function() { return null; },
  querySelectorAll: function() { return []; }
};
global.showToast = function() {};
global.closeModal = function() {};
global.loadAssessment = function() {};

var html = fs.readFileSync('AppScript_Index.html', 'utf-8');

// Extract script blocks to mock the environment
var scriptContent = '';
var regex = /<script>([\s\S]*?)<\/script>/g;
var match;
while ((match = regex.exec(html)) !== null) {
  scriptContent += match[1] + '\n';
}

eval(scriptContent);

// Test 1: buildAssessmentImportPreviewClient
var mockCurrentAssessment = [
  { index: '1.1', compliance: '符合', currentStatus: '', id: 'A1' }
];

var mockRows = [
  ['項次', '符合性', '現況說明'],
  ['1.1', 'Y', '已落實'],
  ['1.2', 'N', '無']
];

var preview = buildAssessmentImportPreviewClient(mockRows, mockCurrentAssessment, { '防護需求等級': '普' });

if (preview.updateCount === 1 && preview.previewChanges[0].fields[0].key === '現況說明') {
  console.log("PASS: buildAssessmentImportPreviewClient");
} else {
  console.error("FAIL buildAssessmentImportPreviewClient", JSON.stringify(preview, null, 2));
  process.exit(1);
}

// Test 2: applyAssessmentImportPreview
global.applyCalledWith = null;
global.google = {
  script: {
    run: {
      withSuccessHandler: function(cb) {
        return {
          withFailureHandler: function(failCb) {
            return {
              applyAssessmentImportChanges: function(sysId, changes) {
                console.log("Mock called!"); global.applyCalledWith = { sysId: sysId, changes: changes };
              }
            };
          }
        };
      }
    }
  }
};

currentSystem = { '系統ID': 'SYS001' };
assessmentImportSubmitting = false;
assessmentImportPreview = preview;

try { applyAssessmentImportPreview(); } catch (e) { console.error("Error in applyAssessmentImportPreview:", e); }

if (global.applyCalledWith && global.applyCalledWith.sysId === 'SYS001' && global.applyCalledWith.changes.length === 1) {
  console.log("PASS: applyAssessmentImportPreview");
} else {
  console.error("FAIL applyAssessmentImportPreview", global.applyCalledWith, global.currentSystem, global.assessmentImportSubmitting, global.assessmentImportPreview.canApply, global.assessmentImportPreview.changes);
  process.exit(1);
}

// Test 3: numeric index normalization
var mockRowsNum = [
  ['項次', '符合性', '現況說明'],
  ['1.10', 'Y', 'ok']
];
var previewNum = buildAssessmentImportPreviewClient(mockRowsNum, [{ index: '1.1', compliance: '不符合' }], { '防護需求等級': '普' });
if (previewNum.updateCount === 1) {
  console.log("PASS: numeric index normalization");
} else {
  console.error("FAIL numeric index normalization", previewNum);
  process.exit(1);
}

// Test 4: legacy column headers
var mockRowsLegacy = [
  ['項目', '是否符合(y、n、不適用)', '符合性或不適用情況說明'],
  ['1.1', 'N', 'Legacy test']
];
var previewLegacy = buildAssessmentImportPreviewClient(mockRowsLegacy, [{ index: '1.1', compliance: '符合', currentStatus: '' }], { '防護需求等級': '普' });
if (previewLegacy.updateCount === 1 && previewLegacy.previewChanges[0].fields.length === 2) {
  console.log("PASS: legacy column headers");
} else {
  console.error("FAIL legacy column headers", JSON.stringify(previewLegacy));
  process.exit(1);
}

// Test 5: partial compliance
var mockRowsPartial = [
  ['項次', '符合性', '現況說明'],
  ['1.1', '部分符合', ''],
  ['1.2', '未符合', '']
];
var previewPartial = buildAssessmentImportPreviewClient(mockRowsPartial, [
  { index: '1.1', compliance: '' },
  { index: '1.2', compliance: '' }
], { '防護需求等級': '普' });
if (previewPartial.updateCount === 2 && 
    previewPartial.previewChanges[0].fields[0].newValue === '部分符合' &&
    previewPartial.previewChanges[1].fields[0].newValue === '不符合') {
  console.log("PASS: partial compliance");
} else {
  console.error("FAIL partial compliance", JSON.stringify(previewPartial));
  process.exit(1);
}

// Test 6: invalid compliance fallback
var mockRowsInvalid = [
  ['項次', '符合性', '現況說明'],
  ['1.1', '還沒做', '']
];
var previewInvalid = buildAssessmentImportPreviewClient(mockRowsInvalid, [
  { index: '1.1', compliance: '符合' }
], { '防護需求等級': '普' });

if (previewInvalid.updateCount === 1 && 
    previewInvalid.errorCount === 0 && 
    previewInvalid.warnings.length === 1 &&
    previewInvalid.warnings[0].message.indexOf('還沒做') >= 0 &&
    previewInvalid.previewChanges[0].fields[0].newValue === '不符合' &&
    previewInvalid.previewChanges[0].fields[0].displayNew === '不符合 (原內容: 還沒做)') {
  console.log("PASS: invalid compliance fallback");
} else {
  console.error("FAIL invalid compliance fallback", JSON.stringify(previewInvalid, null, 2));
  process.exit(1);
}
