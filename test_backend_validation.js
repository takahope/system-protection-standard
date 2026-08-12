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
  console.log("PASS: applyAssessmentImportChanges");
} else {
  console.error("FAIL", JSON.stringify(res, null, 2), mockSheet);
  process.exit(1);
}

