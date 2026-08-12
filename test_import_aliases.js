// test_import_aliases.js
var fs = require('fs');
var code = fs.readFileSync('./AppScript_Code.js', 'utf8');

// Mock GAS environment if necessary, though these pure functions do not need it
// Evaluate the code to make functions available in global scope
eval(code);

function assertEqual(actual, expected, msg) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(msg + ' Expected: ' + JSON.stringify(expected) + ', but got: ' + JSON.stringify(actual));
  }
}

console.log('Testing normalizeImportCompliance_...');
assertEqual(normalizeImportCompliance_('Y', '不適用'), '符合', 'Y should be 符合');
assertEqual(normalizeImportCompliance_('y', '不適用'), '符合', 'y should be 符合');
assertEqual(normalizeImportCompliance_('N', '不適用'), '不符合', 'N should be 不符合');
assertEqual(normalizeImportCompliance_('n', '不適用'), '不符合', 'n should be 不符合');
assertEqual(normalizeImportCompliance_('符合', '不適用'), '符合', '符合 should be 符合');
console.log('normalizeImportCompliance_ tests passed.');

console.log('Testing findAssessmentImportHeader_...');
var rows = [
  ['項次', '是否符合(Y、N、不適用)', '符合性或不適用情況說明', '佐證資料', '如不符合\n預計規劃執行方式', '預計辦理時程', '備註']
];
var header = findAssessmentImportHeader_(rows);
assertEqual(header.rowIndex, 0, 'Should find header at row 0');
assertEqual(header.columnMap['符合性'], 1, 'Should map 符合性 correctly');
assertEqual(header.columnMap['現況說明'], 2, 'Should map 現況說明 correctly');
assertEqual(header.columnMap['矯正作為'], 4, 'Should map 矯正作為 correctly');
assertEqual(header.columnMap['目標日期'], 5, 'Should map 目標日期 correctly');
console.log('findAssessmentImportHeader_ tests passed.');

console.log('All tests passed!');
