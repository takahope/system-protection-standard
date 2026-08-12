var fs = require('fs');
var code = fs.readFileSync('AppScript_Code.js', 'utf-8');

var codeContext = `
  var mockSheet = {};
  var getAssessment = function(systemId) {
    return [{
      systemId: systemId,
      systemName: '測試系統',
      index: '1.1',
      dimension: '技術面',
      category: '存取控制',
      level: '普',
      description: '測試控制措施',
      compliance: '不符合',
      currentStatus: '舊現況',
      evidence: '',
      corrective: '',
      targetDate: '',
      note: ''
    }];
  };
  var assertCanEditSystem_ = function() { return true; };
  var getSystemRecord_ = function() { return { '防護需求等級': '普' }; };
  var getPersistedRuleValue = function() { return '不適用'; };
  var isAssessmentNa_ = function() { return false; };
  var batchSaveAssessment = function(updates) {
    mockSheet.updates = updates;
    mockSheet.savedRows = (updates || []).map(function(item) {
      return [
        item.systemId, item.systemName, item.index, item.dimension,
        item.category, item.level, item.description, item.compliance || '',
        item.currentStatus || '', item.evidence || '', item.corrective || '',
        item.targetDate || '', item.note || ''
      ];
    });
    return { success: true, updated: updates.length };
  };
`;

eval(codeContext + code);

var changes = [{ index: '1.1', fields: [{ key: '符合性', newValue: '符合' }] }];
var res = applyAssessmentImportChanges('SYS1', changes);

if (
  res && res.success && res.updated === 1 &&
  mockSheet.updates && mockSheet.updates[0] &&
  mockSheet.updates[0].index === '1.1' &&
  mockSheet.updates[0].compliance === '符合' &&
  mockSheet.savedRows && mockSheet.savedRows[0] &&
  mockSheet.savedRows[0][0] === 'SYS1' &&
  mockSheet.savedRows[0][2] === '1.1' &&
  mockSheet.savedRows[0][7] === '符合'
) {
  console.log("PASS: applyAssessmentImportChanges basic update");
} else {
  console.error("FAIL basic update", JSON.stringify(res, null, 2), mockSheet);
  process.exit(1);
}

// Test index normalization (change payload has '1.0', current assessment has '1')
var normContext = codeContext.replace("index: '1.1'", "index: '1'");
eval(normContext + code);
var normChanges = [{ index: '1.0', fields: [{ key: '符合性', newValue: '符合' }] }];
var normRes = applyAssessmentImportChanges('SYS1', normChanges);
if (normRes && normRes.success && normRes.updated === 1 && mockSheet.updates[0].index === '1') {
  console.log("PASS: applyAssessmentImportChanges index normalization (1.0 vs 1)");
} else {
  console.error("FAIL index normalization", JSON.stringify(normRes, null, 2), mockSheet);
  process.exit(1);
}

// Test deduplication (duplicate entries for same index in changes payload)
eval(codeContext + code);
var dupChanges = [
  { index: '1.1', fields: [{ key: '符合性', newValue: '符合' }] },
  { index: '1.1', fields: [{ key: '現況說明', newValue: '重複測試' }] }
];
var dupRes = applyAssessmentImportChanges('SYS1', dupChanges);
if (dupRes && dupRes.success && dupRes.updated === 1 && dupRes.rejected === 1 && mockSheet.updates.length === 1) {
  console.log("PASS: applyAssessmentImportChanges duplicate index deduplication");
} else {
  console.error("FAIL deduplication", JSON.stringify(dupRes, null, 2), mockSheet);
  process.exit(1);
}


