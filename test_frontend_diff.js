// test_frontend_diff.js
var fs = require('fs');

// Mock browser globals for Node env
global.window = { addEventListener: function() {}, removeEventListener: function() {} };
global.document = {
  addEventListener: function() {},
  removeEventListener: function() {},
  getElementById: function() { return null; },
  querySelector: function() { return null; },
  querySelectorAll: function() { return []; }
};

var html = fs.readFileSync('AppScript_Index.html', 'utf-8');

// Extract script blocks to mock the environment
var scriptContent = '';
var regex = /<script>([\s\S]*?)<\/script>/g;
var match;
while ((match = regex.exec(html)) !== null) {
  scriptContent += match[1] + '\n';
}

eval(scriptContent);

var mockCurrentAssessment = [
  { '項次': '1.1', '符合性': '符合', 'id': 'A1' }
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
  console.error("FAIL", JSON.stringify(preview, null, 2));
  process.exit(1);
}
