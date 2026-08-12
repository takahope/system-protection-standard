var fs = require('fs');
var code = fs.readFileSync('AppScript_Code.js', 'utf-8');

var codeContext = `
  var mockSheet = {};
  var getAssessment = function() { return [{ '項次': '1.1', '符合性': '不符合', '備註': '' }]; };
  var assertCanEditSystem_ = function() { return true; };
  var getSystemRecord_ = function() { return { '防護需求等級': '普' }; };
  var getPersistedRuleValue = function() { return '不適用'; };
  var isAssessmentNa_ = function() { return false; };
  var batchSaveAssessment = function(updates) { mockSheet.updates = updates; return updates.length; };
`;

eval(codeContext + code);

var changes = [{ index: '1.1', fields: [{ key: '符合性', newValue: '符合' }] }];
var res = applyAssessmentImportChanges('SYS1', changes);

if (res && res.success && res.updated === 1 && mockSheet.updates && mockSheet.updates[0] && mockSheet.updates[0].fields['符合性'] === '符合') {
  console.log("PASS: applyAssessmentImportChanges");
} else {
  console.error("FAIL", JSON.stringify(res, null, 2));
  process.exit(1);
}
