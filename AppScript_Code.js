/**
 * 資通系統防護基準管理系統 - Google Apps Script 後端
 *
 * 使用方式：
 * 1. 建立一個新的 Google Sheets
 * 2. 開啟 Apps Script 編輯器 (擴充功能 > Apps Script)
 * 3. 將此檔案內容貼入 Code.gs
 * 4. 將 Index.html 的內容新增為 HTML 檔案
 * 5. 部署為網頁應用程式
 */

// ===== 網頁服務 =====
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('資通系統防護基準管理系統')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function getHrConfig_() {
  return {
    spreadsheetId: typeof HR_SPREADSHEET_ID !== 'undefined' ? HR_SPREADSHEET_ID : '',
    sheetName: typeof HR_SHEET_NAME !== 'undefined' ? HR_SHEET_NAME : '人員主檔',
    emailColumn: typeof HR_EMAIL_COLUMN !== 'undefined' ? HR_EMAIL_COLUMN : 1,
    nameColumn: typeof HR_NAME_COLUMN !== 'undefined' ? HR_NAME_COLUMN : 2,
    statusColumn: typeof HR_STATUS_COLUMN !== 'undefined' ? HR_STATUS_COLUMN : 3,
    activeValue: typeof HR_ACTIVE_VALUE !== 'undefined' ? HR_ACTIVE_VALUE : '在勤'
  };
}

function formatEvaluatorDisplayName_(name, email) {
  if (name && email) return name + '（' + email + '）';
  return name || email || '';
}

function normalizeEmail_(email) {
  return String(email || '').trim().toLowerCase();
}

function loadHrDirectory_() {
  var cfg = getHrConfig_();
  var result = {
    map: {},
    activeEmployees: [],
    warning: ''
  };

  if (!cfg.spreadsheetId) {
    result.warning = '尚未設定 HR_SPREADSHEET_ID。';
    return result;
  }

  try {
    var ss = SpreadsheetApp.openById(cfg.spreadsheetId);
    var sheet = ss.getSheetByName(cfg.sheetName);
    if (!sheet) {
      result.warning = '找不到 HR 工作表「' + cfg.sheetName + '」。';
      return result;
    }
    if (sheet.getLastRow() <= 1) {
      result.warning = 'HR 工作表沒有可用資料。';
      return result;
    }

    var data = sheet.getDataRange().getDisplayValues();
    for (var i = 1; i < data.length; i++) {
      var email = normalizeEmail_(data[i][cfg.emailColumn - 1]);
      if (!email) continue;
      var name = String(data[i][cfg.nameColumn - 1] || '').trim();
      var status = String(data[i][cfg.statusColumn - 1] || '').trim();
      result.map[email] = {email: email, name: name, status: status};
      if (status === cfg.activeValue) {
        result.activeEmployees.push({
          email: email,
          name: name,
          displayName: name || email
        });
      }
    }
    return result;
  } catch (err) {
    result.warning = '讀取 HR 人員主檔失敗：' + err.message;
    return result;
  }
}

function getActiveHrEmployees() {
  var directory = loadHrDirectory_();
  return {
    employees: directory.activeEmployees || [],
    warning: directory.warning || ''
  };
}

function getCurrentEvaluator() {
  var email = '';
  try {
    email = Session.getActiveUser().getEmail() || '';
  } catch (err) {}

  var result = {
    email: email,
    name: '',
    displayName: email || '',
    source: email ? 'session' : 'none',
    warning: ''
  };

  if (!email) {
    result.warning = '無法取得目前登入帳號，請檢查 Web App 部署權限或網域設定。';
    return result;
  }

  var cfg = getHrConfig_();
  if (!cfg.spreadsheetId) {
    result.warning = '尚未設定 HR_SPREADSHEET_ID，暫時僅帶入帳號。';
    return result;
  }

  var directory = loadHrDirectory_();
  if (directory.warning) {
    result.warning = directory.warning + ' 暫時僅帶入帳號。';
    return result;
  }

  var person = directory.map[normalizeEmail_(email)];
  if (person) {
    result.name = person.name || '';
    result.displayName = formatEvaluatorDisplayName_(result.name, email);
    result.source = result.name ? 'hr' : 'session';
    if (!result.name) result.warning = 'HR 人員主檔找到帳號，但姓名欄為空白。';
    return result;
  }

  result.warning = 'HR 人員主檔查無此帳號對應姓名，暫時僅帶入帳號。';
  return result;
}

var RULE_SETTINGS_SHEET = '規則設定';
var RULE_AUDIT_SHEET = '規則變更紀錄';
var RULE_SETTINGS_HEADERS = ['rule_group', 'rule_key', 'rule_label', 'rule_type', 'rule_value', 'description', 'enabled', 'sort_order'];
var RULE_AUDIT_HEADERS = ['timestamp', 'editor_email', 'editor_name', 'rule_group', 'rule_key', 'old_value', 'new_value', 'change_summary'];

function getDefaultRuleDefinitions_() {
  return [
    {group:'rating_confidentiality', key:'pii_mid_threshold', label:'個資筆數升中門檻', type:'number', value:'200000', description:'個資數量大於此值時，機密性建議至少升為中。', enabled:true, sort:10},
    {group:'rating_confidentiality', key:'pii_high_threshold', label:'個資筆數升高門檻', type:'number', value:'1000000', description:'個資數量大於等於此值時，機密性建議升為高。', enabled:true, sort:20},
    {group:'rating_confidentiality', key:'high_keywords', label:'高機密關鍵字', type:'keyword_list', value:'病歷,健康', description:'機敏資訊類別包含任一關鍵字時，機密性建議升為高。', enabled:true, sort:30},
    {group:'rating_confidentiality', key:'sensitive_signal', label:'含機敏資訊提示', type:'boolean', value:'true', description:'是否顯示「系統標示為含機敏資訊」提示。', enabled:true, sort:40},

    {group:'rating_integrity', key:'core_level', label:'核心系統建議等級', type:'level', value:'中', description:'核心系統觸發完整性建議等級。', enabled:true, sort:10},
    {group:'rating_integrity', key:'civil_level', label:'民生權益建議等級', type:'level', value:'中', description:'與民生權益相關時觸發完整性建議等級。', enabled:true, sort:20},
    {group:'rating_integrity', key:'core_civil_level', label:'核心且涉民生建議等級', type:'level', value:'高', description:'核心系統且與民生權益相關時觸發完整性建議等級。', enabled:true, sort:30},

    {group:'rating_availability', key:'core_level', label:'核心系統建議等級', type:'level', value:'中', description:'核心系統觸發可用性建議等級。', enabled:true, sort:10},
    {group:'rating_availability', key:'civil_level', label:'民生權益建議等級', type:'level', value:'中', description:'與民生權益相關時觸發可用性建議等級。', enabled:true, sort:20},
    {group:'rating_availability', key:'core_civil_level', label:'核心且涉民生建議等級', type:'level', value:'高', description:'核心系統且與民生權益相關時觸發可用性建議等級。', enabled:true, sort:30},
    {group:'rating_availability', key:'mto_high_hours', label:'MTO 升高門檻（小時）', type:'number', value:'4', description:'最大可容忍中斷時間小於等於此值時，可用性建議升為高。', enabled:true, sort:40},
    {group:'rating_availability', key:'mto_mid_hours', label:'MTO 升中門檻（小時）', type:'number', value:'24', description:'最大可容忍中斷時間小於等於此值時，可用性建議至少升為中。', enabled:true, sort:50},

    {group:'rating_compliance', key:'civil_level', label:'民生權益法遵建議等級', type:'level', value:'中', description:'與民生權益相關時，法律遵循性建議至少升為此等級。', enabled:true, sort:10},
    {group:'rating_compliance', key:'high_pii_threshold', label:'敏感資料升高門檻', type:'number', value:'100000', description:'含機敏資訊且個資數量大於等於此值時，法律遵循性升為高。', enabled:true, sort:20},
    {group:'rating_compliance', key:'high_on_sensitive_civil', label:'機敏資訊且涉民生升高', type:'boolean', value:'true', description:'含機敏資訊且涉及民生權益時，法律遵循性升為高。', enabled:true, sort:30},
    {group:'rating_compliance', key:'external_signal', label:'對外服務提示', type:'boolean', value:'true', description:'是否顯示「系統對外提供服務」提示。', enabled:true, sort:40},
    {group:'rating_compliance', key:'sensitive_signal', label:'機敏資訊提示', type:'boolean', value:'true', description:'是否顯示「系統處理機敏資訊」提示。', enabled:true, sort:50},

    {group:'package_exemption', key:'field_name', label:'免評估判斷欄位', type:'text', value:'防護需求等級', description:'用哪個系統欄位判斷是否為免評估對象。', enabled:true, sort:10},
    {group:'package_exemption', key:'operator', label:'免評估判斷運算子', type:'select', value:'equals', description:'支援 equals / not_equals / contains。', enabled:true, sort:20},
    {group:'package_exemption', key:'target_value', label:'免評估判斷值', type:'text', value:'套裝軟體', description:'當欄位符合此值時，視為免分級與免自評。', enabled:true, sort:30},

    {group:'assessment_applicability', key:'comparison_operator', label:'控制措施適用邏輯', type:'select', value:'lte', description:'支援 lte / gte / eq，預設為控制措施等級小於等於系統等級。', enabled:true, sort:10},
    {group:'assessment_applicability', key:'na_label', label:'不適用標示', type:'text', value:'不適用', description:'不適用時寫入符合性欄位的文字。', enabled:true, sort:20},
    {group:'assessment_applicability', key:'na_note', label:'不適用說明', type:'text', value:'該等級不要求此項目', description:'不適用時寫入備註欄位的文字。', enabled:true, sort:30},
    {group:'assessment_applicability', key:'enabled', label:'啟用適用性判斷', type:'boolean', value:'true', description:'若停用，所有控制措施都視為應評。', enabled:true, sort:40},

    {group:'code_map', key:'存取控制|帳號管理', label:'存取控制 / 帳號管理', type:'mapping', value:'C0101', description:'未符合代碼對照。', enabled:true, sort:10},
    {group:'code_map', key:'存取控制|最小權限', label:'存取控制 / 最小權限', type:'mapping', value:'C0102', description:'未符合代碼對照。', enabled:true, sort:20},
    {group:'code_map', key:'存取控制|遠端存取', label:'存取控制 / 遠端存取', type:'mapping', value:'C0103', description:'未符合代碼對照。', enabled:true, sort:30},
    {group:'code_map', key:'事件日誌與可歸責性|記錄事件', label:'事件日誌與可歸責性 / 記錄事件', type:'mapping', value:'C0201', description:'未符合代碼對照。', enabled:true, sort:40},
    {group:'code_map', key:'事件日誌與可歸責性|日誌紀錄內容', label:'事件日誌與可歸責性 / 日誌紀錄內容', type:'mapping', value:'C0202', description:'未符合代碼對照。', enabled:true, sort:50},
    {group:'code_map', key:'事件日誌與可歸責性|日誌儲存容量', label:'事件日誌與可歸責性 / 日誌儲存容量', type:'mapping', value:'C0203', description:'未符合代碼對照。', enabled:true, sort:60},
    {group:'code_map', key:'事件日誌與可歸責性|日誌處理失效之回應', label:'事件日誌與可歸責性 / 日誌處理失效之回應', type:'mapping', value:'C0204', description:'未符合代碼對照。', enabled:true, sort:70},
    {group:'code_map', key:'事件日誌與可歸責性|時戳及校時', label:'事件日誌與可歸責性 / 時戳及校時', type:'mapping', value:'C0205', description:'未符合代碼對照。', enabled:true, sort:80},
    {group:'code_map', key:'事件日誌與可歸責性|日誌資訊之保護', label:'事件日誌與可歸責性 / 日誌資訊之保護', type:'mapping', value:'C0206', description:'未符合代碼對照。', enabled:true, sort:90},
    {group:'code_map', key:'營運持續計畫|資料備份', label:'營運持續計畫 / 資料備份', type:'mapping', value:'C0301', description:'未符合代碼對照。', enabled:true, sort:100},
    {group:'code_map', key:'營運持續計畫|系統備援', label:'營運持續計畫 / 系統備援', type:'mapping', value:'C0302', description:'未符合代碼對照。', enabled:true, sort:110},
    {group:'code_map', key:'識別與鑑別|使用者之識別與鑑別', label:'識別與鑑別 / 使用者之識別與鑑別', type:'mapping', value:'C0401', description:'未符合代碼對照。', enabled:true, sort:120},
    {group:'code_map', key:'識別與鑑別|身分驗證管理', label:'識別與鑑別 / 身分驗證管理', type:'mapping', value:'C0402', description:'未符合代碼對照。', enabled:true, sort:130},
    {group:'code_map', key:'識別與鑑別|鑑別資訊保護', label:'識別與鑑別 / 鑑別資訊保護', type:'mapping', value:'C0403', description:'未符合代碼對照。', enabled:true, sort:140},
    {group:'code_map', key:'系統與服務獲得|系統發展生命週期需求階段', label:'系統與服務獲得 / 需求階段', type:'mapping', value:'C0501', description:'未符合代碼對照。', enabled:true, sort:150},
    {group:'code_map', key:'系統與服務獲得|系統發展生命週期設計階段', label:'系統與服務獲得 / 設計階段', type:'mapping', value:'C0502', description:'未符合代碼對照。', enabled:true, sort:160},
    {group:'code_map', key:'系統與服務獲得|系統發展生命週期開發階段', label:'系統與服務獲得 / 開發階段', type:'mapping', value:'C0503', description:'未符合代碼對照。', enabled:true, sort:170},
    {group:'code_map', key:'系統與服務獲得|系統發展生命週期測試階段', label:'系統與服務獲得 / 測試階段', type:'mapping', value:'C0504', description:'未符合代碼對照。', enabled:true, sort:180},
    {group:'code_map', key:'系統與服務獲得|系統發展生命週期部署與維運階段', label:'系統與服務獲得 / 部署與維運階段', type:'mapping', value:'C0505', description:'未符合代碼對照。', enabled:true, sort:190},
    {group:'code_map', key:'系統與服務獲得|系統發展生命週期委外階段', label:'系統與服務獲得 / 委外階段', type:'mapping', value:'C0506', description:'未符合代碼對照。', enabled:true, sort:200},
    {group:'code_map', key:'系統與服務獲得|獲得程序', label:'系統與服務獲得 / 獲得程序', type:'mapping', value:'C0507', description:'未符合代碼對照。', enabled:true, sort:210},
    {group:'code_map', key:'系統與服務獲得|系統文件', label:'系統與服務獲得 / 系統文件', type:'mapping', value:'C0508', description:'未符合代碼對照。', enabled:true, sort:220},
    {group:'code_map', key:'系統與通訊保護|傳輸之機密性與完整性', label:'系統與通訊保護 / 傳輸之機密性與完整性', type:'mapping', value:'C0601', description:'未符合代碼對照。', enabled:true, sort:230},
    {group:'code_map', key:'系統與通訊保護|資料儲存之安全', label:'系統與通訊保護 / 資料儲存之安全', type:'mapping', value:'C0602', description:'未符合代碼對照。', enabled:true, sort:240},
    {group:'code_map', key:'系統與資訊完整性|漏洞修復', label:'系統與資訊完整性 / 漏洞修復', type:'mapping', value:'C0701', description:'未符合代碼對照。', enabled:true, sort:250},
    {group:'code_map', key:'系統與資訊完整性|資通系統監控', label:'系統與資訊完整性 / 資通系統監控', type:'mapping', value:'C0702', description:'未符合代碼對照。', enabled:true, sort:260},
    {group:'code_map', key:'系統與資訊完整性|軟體及資訊完整性', label:'系統與資訊完整性 / 軟體及資訊完整性', type:'mapping', value:'C0703', description:'未符合代碼對照。', enabled:true, sort:270}
  ];
}

function ensureRuleSettingsSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(RULE_SETTINGS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(RULE_SETTINGS_SHEET);
    sheet.getRange(1, 1, 1, RULE_SETTINGS_HEADERS.length).setValues([RULE_SETTINGS_HEADERS]);
    sheet.getRange(1, 1, 1, RULE_SETTINGS_HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  if (sheet.getLastRow() <= 1) writeRuleDefinitions_(sheet, getDefaultRuleDefinitions_());
  return sheet;
}

function ensureRuleAuditSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(RULE_AUDIT_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(RULE_AUDIT_SHEET);
    sheet.getRange(1, 1, 1, RULE_AUDIT_HEADERS.length).setValues([RULE_AUDIT_HEADERS]);
    sheet.getRange(1, 1, 1, RULE_AUDIT_HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function writeRuleDefinitions_(sheet, defs) {
  var rows = defs.map(function(rule) {
    return [rule.group, rule.key, rule.label, rule.type, String(rule.value), rule.description, rule.enabled === false ? 'false' : 'true', rule.sort || 0];
  });
  if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
  if (rows.length > 0) sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
}

function parseRuleBool_(val) {
  return String(val).toLowerCase() === 'true' || String(val) === '1' || String(val) === '是';
}

function parseRuleNumber_(val, fallback) {
  var num = parseFloat(String(val || '').trim());
  return isNaN(num) ? fallback : num;
}

function parseKeywordList_(val) {
  return String(val || '').split(/[,，]/).map(function(part) { return String(part || '').trim(); }).filter(function(part) { return !!part; });
}

function getRuleRows_() {
  var sheet = ensureRuleSettingsSheet_();
  if (sheet.getLastRow() <= 1) return [];
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, RULE_SETTINGS_HEADERS.length).getDisplayValues();
  return data.map(function(row) {
    return {
      group: row[0],
      key: row[1],
      label: row[2],
      type: row[3],
      value: row[4],
      description: row[5],
      enabled: parseRuleBool_(row[6]),
      sort: parseRuleNumber_(row[7], 0)
    };
  }).filter(function(rule) { return rule.group && rule.key; });
}

function getRuleConfig_() {
  var rows = getRuleRows_();
  var grouped = {};
  rows.forEach(function(rule) {
    if (!grouped[rule.group]) grouped[rule.group] = [];
    grouped[rule.group].push(rule);
  });
  return grouped;
}

function getRuleValue_(config, group, key, fallback) {
  var rules = config[group] || [];
  for (var i = 0; i < rules.length; i++) {
    if (rules[i].key === key) {
      if (!rules[i].enabled && rules[i].type !== 'mapping') return fallback;
      return rules[i].value;
    }
  }
  return fallback;
}

function getRuleRowEnabled_(config, group, key, fallback) {
  var rules = config[group] || [];
  for (var i = 0; i < rules.length; i++) {
    if (rules[i].key === key) return rules[i].enabled;
  }
  return fallback;
}

function getRuleEnabled_(config, group, key, fallback) {
  var rules = config[group] || [];
  for (var i = 0; i < rules.length; i++) {
    if (rules[i].key === key) return rules[i].enabled && parseRuleBool_(rules[i].value);
  }
  return fallback;
}

function evaluateTextRule_(actual, operator, target) {
  var source = String(actual || '').trim();
  var expected = String(target || '').trim();
  if (operator === 'not_equals') return source !== expected;
  if (operator === 'contains') return source.indexOf(expected) !== -1;
  return source === expected;
}

function isPackageExempt_(system) {
  var config = getRuleConfig_();
  var fieldName = getRuleValue_(config, 'package_exemption', 'field_name', '防護需求等級');
  var operator = getRuleValue_(config, 'package_exemption', 'operator', 'equals');
  var targetValue = getRuleValue_(config, 'package_exemption', 'target_value', '套裝軟體');
  return evaluateTextRule_(system ? system[fieldName] : '', operator, targetValue);
}

function getAssessmentApplicabilityConfig_() {
  var config = getRuleConfig_();
  return {
    enabled: getRuleEnabled_(config, 'assessment_applicability', 'enabled', true),
    operator: getRuleValue_(config, 'assessment_applicability', 'comparison_operator', 'lte'),
    naLabel: getRuleValue_(config, 'assessment_applicability', 'na_label', '不適用'),
    naNote: getRuleValue_(config, 'assessment_applicability', 'na_note', '該等級不要求此項目')
  };
}

function isAssessmentControlApplicable_(ctrlLevel, systemLevel) {
  var rule = getAssessmentApplicabilityConfig_();
  if (!rule.enabled) return true;
  var ctrlLevelNum = LEVEL_ORDER[ctrlLevel] || 1;
  var sysLevelNum = LEVEL_ORDER[systemLevel] || 1;
  if (rule.operator === 'gte') return ctrlLevelNum >= sysLevelNum;
  if (rule.operator === 'eq') return ctrlLevelNum === sysLevelNum;
  return ctrlLevelNum <= sysLevelNum;
}

function getRuleAdminStatus() {
  var evaluator = getCurrentEvaluator();
  var prop = PropertiesService.getScriptProperties().getProperty('RULE_ADMIN_EMAILS') || '';
  var admins = prop.split(',').map(function(email) { return String(email || '').trim().toLowerCase(); }).filter(function(email) { return !!email; });
  var email = String(evaluator.email || '').trim().toLowerCase();
  return {
    isAdmin: !!email && admins.indexOf(email) !== -1,
    evaluator: evaluator,
    adminEmailsConfigured: admins.length > 0
  };
}

function assertRuleAdmin_() {
  var status = getRuleAdminStatus();
  if (!status.isAdmin) throw new Error('僅管理者可修改規則設定，請確認 Script Properties 的 RULE_ADMIN_EMAILS。');
  return status;
}

function getRuleSettings() {
  var rows = getRuleRows_().sort(function(a, b) {
    if (a.group !== b.group) return a.group > b.group ? 1 : -1;
    return a.sort - b.sort;
  });
  return {
    adminStatus: getRuleAdminStatus(),
    rows: rows
  };
}

function writeRuleAuditLog_(editor, changes) {
  if (!changes || changes.length === 0) return;
  var sheet = ensureRuleAuditSheet_();
  var timestamp = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy/MM/dd HH:mm:ss');
  var rows = changes.map(function(change) {
    return [
      timestamp,
      editor.email || '',
      editor.displayName || editor.email || '',
      change.group,
      change.key,
      change.oldValue,
      change.newValue,
      change.summary
    ];
  });
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
}

function normalizeIncomingRules_(rows) {
  return (rows || []).map(function(rule, idx) {
    return {
      group: String(rule.group || '').trim(),
      key: String(rule.key || '').trim(),
      label: String(rule.label || '').trim(),
      type: String(rule.type || 'text').trim(),
      value: String(rule.value == null ? '' : rule.value).trim(),
      description: String(rule.description || '').trim(),
      enabled: rule.enabled !== false,
      sort: parseRuleNumber_(rule.sort, idx * 10)
    };
  }).filter(function(rule) { return rule.group && rule.key; });
}

function saveRuleSettings(payload) {
  var status = assertRuleAdmin_();
  var sheet = ensureRuleSettingsSheet_();
  var currentRows = getRuleRows_();
  var nextRows = normalizeIncomingRules_(payload && payload.rows);
  if (nextRows.length === 0) throw new Error('沒有可儲存的規則資料。');

  var currentMap = {};
  currentRows.forEach(function(rule) { currentMap[rule.group + '|' + rule.key] = rule; });
  var nextMap = {};
  nextRows.forEach(function(rule) { nextMap[rule.group + '|' + rule.key] = rule; });

  var keySet = {};
  currentRows.forEach(function(rule) { keySet[rule.group + '|' + rule.key] = true; });
  nextRows.forEach(function(rule) { keySet[rule.group + '|' + rule.key] = true; });

  var changes = [];
  Object.keys(keySet).sort().forEach(function(mapKey) {
    var before = currentMap[mapKey];
    var after = nextMap[mapKey];
    var beforeValue = before ? (before.value + '|' + before.enabled) : '';
    var afterValue = after ? (after.value + '|' + after.enabled) : '';
    if (beforeValue !== afterValue) {
      var parts = mapKey.split('|');
      changes.push({
        group: parts[0],
        key: parts.slice(1).join('|'),
        oldValue: before ? before.value + '（' + (before.enabled ? '啟用' : '停用') + '）' : '[新增]',
        newValue: after ? after.value + '（' + (after.enabled ? '啟用' : '停用') + '）' : '[刪除]',
        summary: (before ? '更新' : '新增') + '規則'
      });
    }
  });

  writeRuleDefinitions_(sheet, nextRows);
  SpreadsheetApp.flush();
  writeRuleAuditLog_(status.evaluator, changes);
  return {success: true, saved: nextRows.length, changes: changes.length, adminStatus: status};
}

function resetRuleSettings() {
  var status = assertRuleAdmin_();
  var sheet = ensureRuleSettingsSheet_();
  var defaults = getDefaultRuleDefinitions_();
  writeRuleDefinitions_(sheet, defaults);
  SpreadsheetApp.flush();
  writeRuleAuditLog_(status.evaluator, [{
    group: 'system',
    key: 'reset_rule_settings',
    oldValue: 'custom',
    newValue: String(defaults.length),
    summary: '重設全部規則為預設值'
  }]);
  return {success: true};
}

function getRuleAuditLogs() {
  var sheet = ensureRuleAuditSheet_();
  if (sheet.getLastRow() <= 1) return [];
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, RULE_AUDIT_HEADERS.length).getDisplayValues();
  data.reverse();
  return data.slice(0, 100).map(function(row) {
    return {
      timestamp: row[0],
      editorEmail: row[1],
      editorName: row[2],
      group: row[3],
      key: row[4],
      oldValue: row[5],
      newValue: row[6],
      summary: row[7]
    };
  });
}

// ===== 初始化試算表結構 =====
function initializeSheetsCore_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sysHeaders = [
    '系統ID', '資產編號', '系統名稱', '系統屬性', '建置方式', '建置方式補充說明',
    '系統管理者(部門/單位)', '系統使用者(部門/單位)', '系統建置日期',
    '主機設置於機關內', '核心系統', '含機敏資訊', '個資數量',
    '機敏資訊以非明文方式儲存', '機敏資訊類別', '是否與民生權益相關',
    '防護需求等級', '是否包含於ISMS導入範圍', '建置廠商', '建置廠商統一編號',
    '維運廠商', '維運廠商統一編號', '最大可容忍中斷時間',
    '是否符合防護基準', '不符合防護基準項目代碼',
    '系統是否對外', '系統日誌保存時間是否超過6個月',
    '有無開放遠端連線維護', '是否禁用弱密碼', '系統是否備份',
    '備妥流量清洗機制', '備妥CDN啟用作業程序', '備妥靜態網頁',
    '10分鐘內切換至靜態網頁', '提供之服務，是否含有人工智慧', '系統負責人'
  ];

  ensureRuleSettingsSheet_();
  ensureRuleAuditSheet_();

  // 1. 系統清冊
  var sysSheet = ss.getSheetByName('系統清冊');
  if (!sysSheet) {
    sysSheet = ss.insertSheet('系統清冊');
    sysSheet.getRange(1, 1, 1, sysHeaders.length).setValues([sysHeaders]);
    sysSheet.getRange(1, 1, 1, sysHeaders.length).setFontWeight('bold');
    sysSheet.setFrozenRows(1);
  } else {
    var currentHeaders = sysSheet.getRange(1, 1, 1, sysSheet.getLastColumn()).getValues()[0];
    var legacyNoteIndex = currentHeaders.indexOf('備註');
    if (legacyNoteIndex >= 0 && currentHeaders.indexOf('提供之服務，是否含有人工智慧') === -1) {
      sysSheet.getRange(1, legacyNoteIndex + 1).setValue('提供之服務，是否含有人工智慧');
      currentHeaders[legacyNoteIndex] = '提供之服務，是否含有人工智慧';
    }
    if (currentHeaders.indexOf('系統負責人') === -1) {
      sysSheet.insertColumnAfter(sysSheet.getLastColumn());
      sysSheet.getRange(1, sysSheet.getLastColumn()).setValue('系統負責人');
    }
    sysSheet.getRange(1, 1, 1, sysSheet.getLastColumn()).setFontWeight('bold');
    sysSheet.setFrozenRows(1);
  }

  // 2. 防護需求分級評估
  var ratingSheet = ss.getSheetByName('防護需求分級評估');
  if (!ratingSheet) {
    ratingSheet = ss.insertSheet('防護需求分級評估');
    var ratingHeaders = [
      '系統ID', '系統名稱', '評估日期', '評估人員',
      '機密性等級', '機密性說明',
      '完整性等級', '完整性說明',
      '可用性等級', '可用性說明',
      '法律遵循性等級', '法律遵循性說明',
      '最終防護需求等級'
    ];
    ratingSheet.getRange(1, 1, 1, ratingHeaders.length).setValues([ratingHeaders]);
    ratingSheet.getRange(1, 1, 1, ratingHeaders.length).setFontWeight('bold');
    ratingSheet.setFrozenRows(1);
  }

  ensureRatingDetailSheet_();

  // 3. 防護基準自評
  var assessSheet = ss.getSheetByName('防護基準自評');
  if (!assessSheet) {
    assessSheet = ss.insertSheet('防護基準自評');
    var assessHeaders = [
      '系統ID', '系統名稱', '項次', '構面', '類別', '最低要求等級',
      '安全控制措施', '符合性', '現況說明', '佐證資料',
      '矯正作為', '目標日期', '備註', '最後更新時間'
    ];
    assessSheet.getRange(1, 1, 1, assessHeaders.length).setValues([assessHeaders]);
    assessSheet.getRange(1, 1, 1, assessHeaders.length).setFontWeight('bold');
    assessSheet.setFrozenRows(1);
  }

  // 4. 控制措施基準表 (附表十)
  var ctrlSheet = ss.getSheetByName('控制措施基準');
  if (!ctrlSheet) {
    ctrlSheet = ss.insertSheet('控制措施基準');
    var ctrlHeaders = ['項次', '構面', '類別', '最低要求等級', '安全控制措施'];
    ctrlSheet.getRange(1, 1, 1, ctrlHeaders.length).setValues([ctrlHeaders]);
    ctrlSheet.getRange(1, 1, 1, ctrlHeaders.length).setFontWeight('bold');
    ctrlSheet.setFrozenRows(1);

    // 填入控制措施
    var controlData = getControlMeasures();
    if (controlData.length > 0) {
      var rows = controlData.map(function(c) {
        return [c.index, c.dimension, c.category, c.level, c.description];
      });
      ctrlSheet.getRange(2, 1, rows.length, 5).setValues(rows);
    }
  }

  return '初始化完成';
}

function initializeSheets() {
  assertRuleAdmin_();
  return initializeSheetsCore_();
}

var LEVEL_ORDER = {'普': 1, '中': 2, '高': 3};
var RATING_DIMENSIONS = [
  {
    field: 'confidentiality',
    label: '機密性',
    summaryLabel: '機密性等級',
    noteLabel: '機密性說明',
    lowText: '發生資通安全事件致資訊系統受影響時，可能造成未經授權之資訊揭露，對機關之營運、資產或信譽等方面將產生有限之影響。',
    midText: '發生資通安全事件致資訊系統受影響時，可能造成未經授權之資訊揭露，對機關之營運、資產或信譽等方面將產生嚴重之影響。',
    highText: '發生資通安全事件致資訊系統受影響時，可能造成未經授權之資訊揭露，對機關之營運、資產或信譽等方面將產生非常嚴重或災難性之影響。'
  },
  {
    field: 'integrity',
    label: '完整性',
    summaryLabel: '完整性等級',
    noteLabel: '完整性說明',
    lowText: '發生資通安全事件致資訊系統受影響時，可能造成資訊或處理程序遭竄改，對機關之營運、資產或信譽等方面將產生有限之影響。',
    midText: '發生資通安全事件致資訊系統受影響時，可能造成資訊或處理程序遭竄改，對機關之營運、資產或信譽等方面將產生嚴重之影響。',
    highText: '發生資通安全事件致資訊系統受影響時，可能造成資訊或處理程序遭竄改，對機關之營運、資產或信譽等方面將產生非常嚴重或災難性之影響。'
  },
  {
    field: 'availability',
    label: '可用性',
    summaryLabel: '可用性等級',
    noteLabel: '可用性說明',
    lowText: '發生資通安全事件致資訊系統受影響時，可能造成資訊或資訊系統之存取或使用中斷，對機關之營運、資產或信譽等方面將產生有限之影響。',
    midText: '發生資通安全事件致資訊系統受影響時，可能造成資訊或資訊系統之存取或使用中斷，對機關之營運、資產或信譽等方面將產生嚴重之影響。',
    highText: '發生資通安全事件致資訊系統受影響時，可能造成資訊或資訊系統之存取或使用中斷，對機關之營運、資產或信譽等方面將產生非常嚴重或災難性之影響。'
  },
  {
    field: 'compliance',
    label: '法律遵循性',
    summaryLabel: '法律遵循性等級',
    noteLabel: '法律遵循性說明',
    lowText: '其他資通系統設置或運作於法令有相關規範之情形。',
    midText: '如未確實遵循資通系統設置或運作涉及之資通安全相關法令，可能使資通系統受影響而導致資通安全事件，或影響他人合法權益或機關執行業務之公正性及正當性，並使機關所屬人員受到行政罰、懲戒或懲處。',
    highText: '如未確實遵循資通系統設置或運作涉及之資通安全相關法令，可能使資通系統受影響而導致資通安全事件，或影響他人合法權益或機關執行業務之公正性及正當性，並使機關所屬人員負有刑事責任。'
  }
];

function ensureRatingDetailSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('防護需求分級評估明細');
  if (!sheet) {
    sheet = ss.insertSheet('防護需求分級評估明細');
    var headers = [
      '系統ID', '系統名稱', '構面', '系統建議等級', '人工判定等級', '附表九情境等級',
      '系統提示摘要', '評估說明', '覆核理由', '評估人員', '評估日期', '規則版本'
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getRatingDimensionMap_() {
  var map = {};
  RATING_DIMENSIONS.forEach(function(dim) { map[dim.field] = dim; });
  return map;
}

function getScenarioOptions_(dim) {
  return [
    {level: '普', text: dim.lowText},
    {level: '中', text: dim.midText},
    {level: '高', text: dim.highText}
  ];
}

function normalizeLevel_(val) {
  return LEVEL_ORDER[val] ? val : '普';
}

function parseIntSafe_(val) {
  var n = parseInt(String(val || '').replace(/[^\d]/g, ''), 10);
  return isNaN(n) ? 0 : n;
}

function parseMtoHours_(val) {
  var s = String(val || '').trim();
  if (!s) return null;
  var num = parseFloat(s.replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return null;
  if (s.indexOf('分鐘') !== -1) return num / 60;
  if (s.indexOf('天') !== -1) return num * 24;
  return num;
}

function escalateLevel_(current, next) {
  return LEVEL_ORDER[next] > LEVEL_ORDER[current] ? next : current;
}

function buildRatingRecommendations_(system) {
  var config = getRuleConfig_();
  var pii = parseIntSafe_(system['個資數量']);
  var mtoHours = parseMtoHours_(system['最大可容忍中斷時間']);
  var sensitive = String(system['含機敏資訊'] || '') === '是';
  var civil = String(system['是否與民生權益相關'] || '') === '是';
  var core = String(system['核心系統'] || '') === '是';
  var external = String(system['系統是否對外'] || '') === '是';
  var typeText = String(system['機敏資訊類別'] || '');
  var confidentialityMid = parseRuleNumber_(getRuleValue_(config, 'rating_confidentiality', 'pii_mid_threshold', '200000'), 200000);
  var confidentialityHigh = parseRuleNumber_(getRuleValue_(config, 'rating_confidentiality', 'pii_high_threshold', '1000000'), 1000000);
  var confidentialityKeywords = parseKeywordList_(getRuleValue_(config, 'rating_confidentiality', 'high_keywords', '病歷,健康'));
  var integrityCoreLevel = normalizeLevel_(getRuleValue_(config, 'rating_integrity', 'core_level', '中'));
  var integrityCivilLevel = normalizeLevel_(getRuleValue_(config, 'rating_integrity', 'civil_level', '中'));
  var integrityCoreCivilLevel = normalizeLevel_(getRuleValue_(config, 'rating_integrity', 'core_civil_level', '高'));
  var availabilityCoreLevel = normalizeLevel_(getRuleValue_(config, 'rating_availability', 'core_level', '中'));
  var availabilityCivilLevel = normalizeLevel_(getRuleValue_(config, 'rating_availability', 'civil_level', '中'));
  var availabilityCoreCivilLevel = normalizeLevel_(getRuleValue_(config, 'rating_availability', 'core_civil_level', '高'));
  var mtoHighHours = parseRuleNumber_(getRuleValue_(config, 'rating_availability', 'mto_high_hours', '4'), 4);
  var mtoMidHours = parseRuleNumber_(getRuleValue_(config, 'rating_availability', 'mto_mid_hours', '24'), 24);
  var complianceCivilLevel = normalizeLevel_(getRuleValue_(config, 'rating_compliance', 'civil_level', '中'));
  var complianceHighPiiThreshold = parseRuleNumber_(getRuleValue_(config, 'rating_compliance', 'high_pii_threshold', '100000'), 100000);
  var complianceHighOnSensitiveCivil = getRuleEnabled_(config, 'rating_compliance', 'high_on_sensitive_civil', true);
  var recommendations = {};

  RATING_DIMENSIONS.forEach(function(dim) {
    recommendations[dim.field] = {
      field: dim.field,
      label: dim.label,
      recommendedLevel: '普',
      signals: [],
      scenarioOptions: getScenarioOptions_(dim)
    };
  });

  if (sensitive && getRuleEnabled_(config, 'rating_confidentiality', 'sensitive_signal', true)) {
    recommendations.confidentiality.signals.push('系統標示為含機敏資訊。');
  }
  if (pii > confidentialityMid) {
    recommendations.confidentiality.recommendedLevel = escalateLevel_(recommendations.confidentiality.recommendedLevel, pii >= confidentialityHigh ? '高' : '中');
    recommendations.confidentiality.signals.push('個資數量為 ' + pii + ' 筆。');
  }
  if (typeText && typeText !== '無機敏資訊') {
    recommendations.confidentiality.signals.push('機敏資訊類別：' + typeText + '。');
    if (getRuleRowEnabled_(config, 'rating_confidentiality', 'high_keywords', true)) {
      for (var keywordIdx = 0; keywordIdx < confidentialityKeywords.length; keywordIdx++) {
        if (typeText.indexOf(confidentialityKeywords[keywordIdx]) !== -1) {
          recommendations.confidentiality.recommendedLevel = escalateLevel_(recommendations.confidentiality.recommendedLevel, '高');
          break;
        }
      }
    }
  }

  if (core) {
    recommendations.integrity.recommendedLevel = escalateLevel_(recommendations.integrity.recommendedLevel, integrityCoreLevel);
    recommendations.integrity.signals.push('系統標示為核心系統。');
    recommendations.availability.recommendedLevel = escalateLevel_(recommendations.availability.recommendedLevel, availabilityCoreLevel);
    recommendations.availability.signals.push('核心系統中斷將直接影響業務持續。');
  }
  if (civil) {
    recommendations.integrity.recommendedLevel = escalateLevel_(recommendations.integrity.recommendedLevel, core ? integrityCoreCivilLevel : integrityCivilLevel);
    recommendations.integrity.signals.push('系統與民生權益相關。');
    recommendations.availability.recommendedLevel = escalateLevel_(recommendations.availability.recommendedLevel, core ? availabilityCoreCivilLevel : availabilityCivilLevel);
    recommendations.availability.signals.push('民生權益相關服務中斷風險較高。');
    recommendations.compliance.recommendedLevel = escalateLevel_(recommendations.compliance.recommendedLevel, complianceCivilLevel);
    recommendations.compliance.signals.push('系統涉及民生權益，法遵風險較高。');
  }
  if (mtoHours !== null) {
    recommendations.availability.signals.push('最大可容忍中斷時間：' + system['最大可容忍中斷時間'] + '。');
    if (mtoHours <= mtoHighHours) recommendations.availability.recommendedLevel = escalateLevel_(recommendations.availability.recommendedLevel, '高');
    else if (mtoHours <= mtoMidHours) recommendations.availability.recommendedLevel = escalateLevel_(recommendations.availability.recommendedLevel, '中');
  } else {
    recommendations.availability.signals.push('尚未填寫最大可容忍中斷時間，需人工判斷。');
  }

  if (external && getRuleEnabled_(config, 'rating_compliance', 'external_signal', true)) {
    recommendations.compliance.signals.push('系統對外提供服務。');
  }
  if (sensitive && getRuleEnabled_(config, 'rating_compliance', 'sensitive_signal', true)) {
    recommendations.compliance.signals.push('系統處理機敏資訊。');
  }
  if ((sensitive && pii >= complianceHighPiiThreshold) || (complianceHighOnSensitiveCivil && sensitive && civil)) {
    recommendations.compliance.recommendedLevel = escalateLevel_(recommendations.compliance.recommendedLevel, '高');
    recommendations.compliance.signals.push('敏感資料規模或社會影響較高，需提高法遵等級。');
  }

  if (recommendations.confidentiality.signals.length === 0) recommendations.confidentiality.signals.push('未觀察到機敏資料特徵，建議以有限影響起評。');
  if (recommendations.integrity.signals.length === 0) recommendations.integrity.signals.push('未觀察到高衝擊完整性風險，建議以有限影響起評。');
  if (recommendations.availability.signals.length === 1 && recommendations.availability.signals[0].indexOf('尚未填寫') === 0) {
    recommendations.availability.recommendedLevel = '普';
  } else if (recommendations.availability.signals.length === 0) {
    recommendations.availability.signals.push('未觀察到高衝擊中斷條件，建議以有限影響起評。');
  }
  if (recommendations.compliance.signals.length === 0) recommendations.compliance.signals.push('未觀察到高法遵風險特徵，建議以法令一般遵循起評。');

  return recommendations;
}

function getSystemById_(systemId) {
  var systems = getSystems();
  for (var i = 0; i < systems.length; i++) {
    if (systems[i]['系統ID'] == systemId) return systems[i];
  }
  return null;
}

function getSummaryRatingRow_(systemId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('防護需求分級評估');
  if (!sheet || sheet.getLastRow() <= 1) return null;
  var data = sheet.getDataRange().getDisplayValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == systemId) {
      return {
        rowNum: i + 1,
        systemId: data[i][0],
        systemName: data[i][1],
        assessDate: data[i][2],
        assessor: data[i][3],
        confidentiality: data[i][4],
        confidentialityNote: data[i][5],
        integrity: data[i][6],
        integrityNote: data[i][7],
        availability: data[i][8],
        availabilityNote: data[i][9],
        compliance: data[i][10],
        complianceNote: data[i][11],
        finalLevel: data[i][12]
      };
    }
  }
  return null;
}

function getRatingDetails_(systemId) {
  var sheet = ensureRatingDetailSheet_();
  if (sheet.getLastRow() <= 1) return [];
  var data = sheet.getDataRange().getDisplayValues();
  var results = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == systemId) {
      results.push({
        systemId: data[i][0],
        systemName: data[i][1],
        field: data[i][2],
        recommendedLevel: data[i][3],
        selectedLevel: data[i][4],
        scenarioLevel: data[i][5],
        signalSummary: data[i][6],
        note: data[i][7],
        overrideReason: data[i][8],
        assessor: data[i][9],
        assessDate: data[i][10],
        ruleVersion: data[i][11]
      });
    }
  }
  return results;
}

function migrateLegacyRatings_() {
  var sheet = ensureRatingDetailSheet_();
  var existing = {};
  if (sheet.getLastRow() > 1) {
    var detailData = sheet.getDataRange().getDisplayValues();
    for (var i = 1; i < detailData.length; i++) {
      existing[detailData[i][0] + '|' + detailData[i][2]] = true;
    }
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var summarySheet = ss.getSheetByName('防護需求分級評估');
  if (!summarySheet || summarySheet.getLastRow() <= 1) return;
  var data = summarySheet.getDataRange().getDisplayValues();
  var rows = [];
  for (var r = 1; r < data.length; r++) {
    var systemId = data[r][0];
    if (!systemId) continue;
    for (var d = 0; d < RATING_DIMENSIONS.length; d++) {
      var dim = RATING_DIMENSIONS[d];
      var key = systemId + '|' + dim.field;
      if (existing[key]) continue;
      var baseCol = 4 + d * 2;
      rows.push([
        systemId,
        data[r][1],
        dim.field,
        data[r][baseCol] || '普',
        data[r][baseCol] || '普',
        data[r][baseCol] || '普',
        '',
        data[r][baseCol + 1] || '',
        '',
        data[r][3] || '',
        data[r][2] || '',
        'legacy-import'
      ]);
    }
  }
  if (rows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  }
}

function buildRatingPayload_(systemId) {
  migrateLegacyRatings_();
  var system = getSystemById_(systemId);
  if (!system) return null;
  var summary = getSummaryRatingRow_(systemId);
  var detailRows = getRatingDetails_(systemId);
  var recommendations = buildRatingRecommendations_(system);
  var currentEvaluator = getCurrentEvaluator();
  var details = {};

  RATING_DIMENSIONS.forEach(function(dim) {
    var rec = recommendations[dim.field];
    details[dim.field] = {
      field: dim.field,
      label: dim.label,
      recommendedLevel: rec.recommendedLevel,
      signals: rec.signals,
      scenarioOptions: rec.scenarioOptions,
      selectedLevel: rec.recommendedLevel,
      scenarioLevel: rec.recommendedLevel,
      note: '',
      overrideReason: ''
    };
  });

  detailRows.forEach(function(row) {
    if (!details[row.field]) return;
    details[row.field].selectedLevel = normalizeLevel_(row.selectedLevel || row.recommendedLevel || details[row.field].recommendedLevel);
    details[row.field].scenarioLevel = normalizeLevel_(row.scenarioLevel || row.selectedLevel || details[row.field].selectedLevel);
    details[row.field].note = row.note || '';
    details[row.field].overrideReason = row.overrideReason || '';
    details[row.field].signalSummary = row.signalSummary || details[row.field].signals.join(' ');
    details[row.field].assessDate = row.assessDate || '';
  });

  if (summary) {
    details.confidentiality.selectedLevel = normalizeLevel_(summary.confidentiality || details.confidentiality.selectedLevel);
    details.confidentiality.note = details.confidentiality.note || summary.confidentialityNote || '';
    details.integrity.selectedLevel = normalizeLevel_(summary.integrity || details.integrity.selectedLevel);
    details.integrity.note = details.integrity.note || summary.integrityNote || '';
    details.availability.selectedLevel = normalizeLevel_(summary.availability || details.availability.selectedLevel);
    details.availability.note = details.availability.note || summary.availabilityNote || '';
    details.compliance.selectedLevel = normalizeLevel_(summary.compliance || details.compliance.selectedLevel);
    details.compliance.note = details.compliance.note || summary.complianceNote || '';
  }

  var finalLevel = '普';
  RATING_DIMENSIONS.forEach(function(dim) {
    finalLevel = escalateLevel_(finalLevel, details[dim.field].selectedLevel);
  });

  return {
    systemId: system['系統ID'],
    systemName: system['系統名稱'],
    assessor: summary ? (summary.assessor || '') : '',
    assessDate: summary ? (summary.assessDate || '') : '',
    finalLevel: finalLevel,
    details: details,
    currentEvaluator: currentEvaluator
  };
}

function updateSystemLevel_(systemId, level) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sysSheet = ss.getSheetByName('系統清冊');
  if (!sysSheet || sysSheet.getLastRow() <= 1) return;
  var sysData = sysSheet.getDataRange().getValues();
  for (var i = 1; i < sysData.length; i++) {
    if (sysData[i][0] == systemId) {
      var headers = sysData[0];
      var levelCol = headers.indexOf('防護需求等級');
      if (levelCol >= 0) sysSheet.getRange(i + 1, levelCol + 1).setValue(level);
      break;
    }
  }
}

// ===== 控制措施資料 (附表十) =====
function getControlMeasures() {
  return [
    {index:1, dimension:"存取控制", category:"帳號管理", level:"普", description:"建立帳號管理機制，包含帳號之申請、建立、修改、啟用、停用及刪除之程序。"},
    {index:2, dimension:"存取控制", category:"帳號管理", level:"中", description:"已逾期之臨時或緊急帳號應刪除或禁用。"},
    {index:3, dimension:"存取控制", category:"帳號管理", level:"中", description:"資通系統閒置帳號應禁用。"},
    {index:4, dimension:"存取控制", category:"帳號管理", level:"中", description:"定期審核資通系統帳號之申請、建立、修改、啟用、停用及刪除。"},
    {index:5, dimension:"存取控制", category:"帳號管理", level:"高", description:"機關應定義各系統之閒置時間或可使用期限與資通系統之使用情況及條件。"},
    {index:6, dimension:"存取控制", category:"帳號管理", level:"高", description:"逾越機關所許可之閒置時間或可使用期限時，系統應自動將使用者登出。"},
    {index:7, dimension:"存取控制", category:"帳號管理", level:"高", description:"應依機關規定之情況及條件，使用資通系統。"},
    {index:8, dimension:"存取控制", category:"帳號管理", level:"高", description:"監控資通系統帳號，如發現帳號違常使用時，回報管理者。"},
    {index:9, dimension:"存取控制", category:"最小權限", level:"中", description:"採最小權限原則，僅允許使用者（或代表使用者行為之程序）依機關任務及業務功能，完成指派任務所需之授權存取。"},
    {index:10, dimension:"存取控制", category:"遠端存取", level:"普", description:"對於每一種允許之遠端存取類型，均應先取得授權，建立使用限制、組態需求、連線需求及文件化。"},
    {index:11, dimension:"存取控制", category:"遠端存取", level:"普", description:"使用者之權限檢查作業應於伺服器端完成。"},
    {index:12, dimension:"存取控制", category:"遠端存取", level:"普", description:"應監控遠端存取機關內部網段或資通系統後臺之連線。"},
    {index:13, dimension:"存取控制", category:"遠端存取", level:"普", description:"應採用加密機制。"},
    {index:14, dimension:"存取控制", category:"遠端存取", level:"中", description:"遠端存取之來源應為機關已預先定義及管理之存取控制點。"},
    {index:15, dimension:"事件日誌與可歸責性", category:"記錄事件", level:"普", description:"訂定日誌之記錄時間週期及留存政策，並保留日誌至少六個月。"},
    {index:16, dimension:"事件日誌與可歸責性", category:"記錄事件", level:"普", description:"確保資通系統有記錄特定事件之功能，並決定應記錄之特定資通系統事件。"},
    {index:17, dimension:"事件日誌與可歸責性", category:"記錄事件", level:"普", description:"應記錄資通系統管理者帳號所執行之各項功能。"},
    {index:18, dimension:"事件日誌與可歸責性", category:"記錄事件", level:"中", description:"應定期審查機關所保留資通系統產生之日誌。"},
    {index:19, dimension:"事件日誌與可歸責性", category:"日誌紀錄內容", level:"普", description:"資通系統產生之日誌應包含事件類型、發生時間、發生位置及任何與事件相關之使用者身分識別等資訊，採用單一日誌機制，確保輸出格式之一致性。"},
    {index:20, dimension:"事件日誌與可歸責性", category:"日誌儲存容量", level:"普", description:"依據日誌儲存需求，配置所需之儲存容量。"},
    {index:21, dimension:"事件日誌與可歸責性", category:"日誌處理失效之回應", level:"普", description:"資通系統於日誌處理失效時，應採取適當之行動。"},
    {index:22, dimension:"事件日誌與可歸責性", category:"日誌處理失效之回應", level:"高", description:"機關規定需要即時通報之日誌處理失效事件發生時，資通系統應於機關規定之時效內，對特定人員提出警告。"},
    {index:23, dimension:"事件日誌與可歸責性", category:"時戳及校時", level:"普", description:"資通系統應使用系統內部時鐘產生日誌所需時戳，並可以對應到世界協調時間（UTC）或格林威治標準時間（GMT）。"},
    {index:24, dimension:"事件日誌與可歸責性", category:"時戳及校時", level:"中", description:"系統內部時鐘應定期與基準時間源進行同步。"},
    {index:25, dimension:"事件日誌與可歸責性", category:"日誌資訊之保護", level:"普", description:"對日誌之存取管理，僅限於有權限之使用者。"},
    {index:26, dimension:"事件日誌與可歸責性", category:"日誌資訊之保護", level:"中", description:"應運用雜湊或其他適當方式之完整性確保機制。"},
    {index:27, dimension:"事件日誌與可歸責性", category:"日誌資訊之保護", level:"高", description:"定期備份日誌至原系統外之其他實體系統。"},
    {index:28, dimension:"營運持續計畫", category:"資料備份", level:"普", description:"訂定資料可容忍損失之時間要求。"},
    {index:29, dimension:"營運持續計畫", category:"資料備份", level:"普", description:"執行資料備份。"},
    {index:30, dimension:"營運持續計畫", category:"資料備份", level:"中", description:"應定期測試備份資料，以驗證備份媒體之可靠性及資訊之完整性。"},
    {index:31, dimension:"營運持續計畫", category:"資料備份", level:"高", description:"應將備份還原，作為營運持續計畫演練之一部分。"},
    {index:32, dimension:"營運持續計畫", category:"資料備份", level:"高", description:"應建立資料異地備份機制。"},
    {index:33, dimension:"營運持續計畫", category:"系統備援", level:"普", description:"訂定資通系統從中斷後至重新恢復服務之最大可容忍中斷時間要求。"},
    {index:34, dimension:"營運持續計畫", category:"系統備援", level:"中", description:"應定期測試原服務中斷時，於最大可容忍中斷時間內，由備援設備或其他方式取代並提供服務。"},
    {index:35, dimension:"營運持續計畫", category:"系統備援", level:"高", description:"應將備援啟動作為營運持續計畫演練之一部分。"},
    {index:36, dimension:"識別與鑑別", category:"使用者之識別與鑑別", level:"普", description:"資通系統應識別及鑑別使用者，並禁止使用者使用共用帳號。"},
    {index:37, dimension:"識別與鑑別", category:"使用者之識別與鑑別", level:"高", description:"對資通系統之存取採取多因子鑑別技術。"},
    {index:38, dimension:"識別與鑑別", category:"身分驗證管理", level:"普", description:"使用預設密碼初次登入系統時，應於登入後立即變更。"},
    {index:39, dimension:"識別與鑑別", category:"身分驗證管理", level:"普", description:"身分驗證相關資訊不以明文傳輸。"},
    {index:40, dimension:"識別與鑑別", category:"身分驗證管理", level:"普", description:"具備帳戶鎖定機制，帳號登入進行身分驗證失敗達五次後，至少十五分鐘內不允許該帳號繼續嘗試登入或使用機關自建之失敗驗證機制。"},
    {index:41, dimension:"識別與鑑別", category:"身分驗證管理", level:"普", description:"使用密碼進行驗證時，應強制最低密碼複雜度；依機關密碼效期規定變更密碼。"},
    {index:42, dimension:"識別與鑑別", category:"身分驗證管理", level:"普", description:"密碼變更時，至少不可以與前三次使用過之密碼相同。"},
    {index:43, dimension:"識別與鑑別", category:"身分驗證管理", level:"普", description:"第四點及第五點所定措施，對外部使用者，機關得自行規範辦理。"},
    {index:44, dimension:"識別與鑑別", category:"身分驗證管理", level:"中", description:"身分驗證機制應防範自動化程式之登入或密碼更換嘗試。"},
    {index:45, dimension:"識別與鑑別", category:"身分驗證管理", level:"中", description:"密碼重設機制對使用者重新身分確認後，發送一次性及具有時效性符記。"},
    {index:46, dimension:"識別與鑑別", category:"鑑別資訊保護", level:"普", description:"資通系統應遮蔽鑑別過程中之資訊。"},
    {index:47, dimension:"識別與鑑別", category:"鑑別資訊保護", level:"中", description:"資通系統如以密碼進行鑑別時，該密碼應經雜湊或其他適當方式處理後儲存。"},
    {index:48, dimension:"系統與服務獲得", category:"系統發展生命週期需求階段", level:"普", description:"針對系統安全需求（含機密性、可用性、完整性）進行確認。"},
    {index:49, dimension:"系統與服務獲得", category:"系統發展生命週期設計階段", level:"中", description:"根據系統功能與要求，識別可能影響系統之威脅，進行風險分析及評估。"},
    {index:50, dimension:"系統與服務獲得", category:"系統發展生命週期設計階段", level:"中", description:"將風險評估結果回饋需求階段之檢核項目，並提出安全需求修正。"},
    {index:51, dimension:"系統與服務獲得", category:"系統發展生命週期開發階段", level:"普", description:"應針對安全需求實作必要控制措施。"},
    {index:52, dimension:"系統與服務獲得", category:"系統發展生命週期開發階段", level:"普", description:"應注意避免軟體常見漏洞及實作必要控制措施。"},
    {index:53, dimension:"系統與服務獲得", category:"系統發展生命週期開發階段", level:"普", description:"發生錯誤時，使用者頁面僅顯示簡短錯誤訊息及代碼，不包含詳細之錯誤訊息。"},
    {index:54, dimension:"系統與服務獲得", category:"系統發展生命週期開發階段", level:"高", description:"執行「源碼掃描」安全檢測。"},
    {index:55, dimension:"系統與服務獲得", category:"系統發展生命週期開發階段", level:"高", description:"系統應具備發生嚴重錯誤時之通知機制。"},
    {index:56, dimension:"系統與服務獲得", category:"系統發展生命週期測試階段", level:"普", description:"執行「弱點掃描」安全檢測。"},
    {index:57, dimension:"系統與服務獲得", category:"系統發展生命週期測試階段", level:"高", description:"執行「滲透測試」安全檢測。"},
    {index:58, dimension:"系統與服務獲得", category:"系統發展生命週期部署與維運階段", level:"普", description:"於部署環境中應針對相關資通安全威脅，進行更新與修補。"},
    {index:59, dimension:"系統與服務獲得", category:"系統發展生命週期部署與維運階段", level:"普", description:"識別並關閉不必要服務及埠口。"},
    {index:60, dimension:"系統與服務獲得", category:"系統發展生命週期部署與維運階段", level:"普", description:"資通系統不使用預設密碼。"},
    {index:61, dimension:"系統與服務獲得", category:"系統發展生命週期部署與維運階段", level:"普", description:"執行系統源碼備份。"},
    {index:62, dimension:"系統與服務獲得", category:"系統發展生命週期部署與維運階段", level:"中", description:"於系統發展生命週期之維運階段，應執行版本控制與變更管理。"},
    {index:63, dimension:"系統與服務獲得", category:"系統發展生命週期委外階段", level:"普", description:"資通系統開發如委外辦理，應將系統發展生命週期各階段依等級將安全需求（含機密性、可用性、完整性）納入委外契約。"},
    {index:64, dimension:"系統與服務獲得", category:"獲得程序", level:"普", description:"識別資通系統使用之第三方軟體、服務、函式庫或其他元件。"},
    {index:65, dimension:"系統與服務獲得", category:"獲得程序", level:"中", description:"開發、測試及正式作業環境應為區隔。"},
    {index:66, dimension:"系統與服務獲得", category:"系統文件", level:"普", description:"應儲存與管理系統發展生命週期之相關文件。"},
    {index:67, dimension:"系統與通訊保護", category:"傳輸之機密性與完整性", level:"高", description:"資通系統應採用加密機制，以防止未授權之資訊揭露或偵測資訊之變更。"},
    {index:68, dimension:"系統與通訊保護", category:"傳輸之機密性與完整性", level:"高", description:"使用公開、國際機構驗證且未遭破解之演算法。"},
    {index:69, dimension:"系統與通訊保護", category:"傳輸之機密性與完整性", level:"高", description:"加密金鑰或憑證應定期更換。"},
    {index:70, dimension:"系統與通訊保護", category:"傳輸之機密性與完整性", level:"高", description:"伺服器端之金鑰保管應訂定管理規範及實施應有之安全防護措施。"},
    {index:71, dimension:"系統與通訊保護", category:"資料儲存之安全", level:"高", description:"資通系統重要組態設定檔案及其他具保護需求之資訊應加密或以其他適當方式儲存。"},
    {index:72, dimension:"系統與資訊完整性", category:"漏洞修復", level:"普", description:"系統之漏洞修復應測試有效性及潛在影響，並定期更新。"},
    {index:73, dimension:"系統與資訊完整性", category:"漏洞修復", level:"中", description:"定期確認資通系統相關漏洞修復之狀態。"},
    {index:74, dimension:"系統與資訊完整性", category:"資通系統監控", level:"普", description:"發現資通系統有被入侵跡象時，應通報機關特定人員。"},
    {index:75, dimension:"系統與資訊完整性", category:"資通系統監控", level:"中", description:"監控資通系統，以偵測攻擊與未授權之連線，並識別資通系統之未授權使用。"},
    {index:76, dimension:"系統與資訊完整性", category:"資通系統監控", level:"高", description:"資通系統應採用自動化工具監控進出之通信流量，並於發現不尋常或未授權之活動時，針對該事件進行分析。"},
    {index:77, dimension:"系統與資訊完整性", category:"軟體及資訊完整性", level:"普", description:"使用者輸入資料合法性檢查應置放於應用系統伺服器端。"},
    {index:78, dimension:"系統與資訊完整性", category:"軟體及資訊完整性", level:"中", description:"使用完整性驗證工具，以偵測未授權變更特定軟體及資訊。"},
    {index:79, dimension:"系統與資訊完整性", category:"軟體及資訊完整性", level:"中", description:"發現違反完整性時，資通系統應實施機關指定之安全保護措施。"},
    {index:80, dimension:"系統與資訊完整性", category:"軟體及資訊完整性", level:"高", description:"應定期執行軟體與資訊完整性檢查。"}
  ];
}

// ===== 系統清冊 CRUD =====
function getSystems() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('系統清冊');
  if (!sheet) return [];

  // Use display values so Apps Script does not try to serialize Date objects
  // back to the browser as part of the response payload.
  var data = sheet.getDataRange().getDisplayValues();
  if (data.length <= 1) return [];

  var hrDirectory = loadHrDirectory_();
  var headers = data[0];
  var systems = [];
  for (var i = 1; i < data.length; i++) {
    if (!data[i][0] && !data[i][2]) continue;
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = data[i][j];
    }
    var ownerEmail = normalizeEmail_(obj['系統負責人']);
    var ownerInfo = hrDirectory.map[ownerEmail];
    obj._ownerDisplayName = ownerInfo && ownerInfo.name ? ownerInfo.name : (obj['系統負責人'] || '');
    obj._row = i + 1;
    systems.push(obj);
  }
  return systems;
}

function addSystem(systemData) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('系統清冊');
  if (!sheet) { initializeSheetsCore_(); sheet = ss.getSheetByName('系統清冊'); }

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var id = 'SYS_' + new Date().getTime();
  systemData['系統ID'] = id;

  var row = headers.map(function(h) { return systemData[h] || ''; });
  sheet.appendRow(row);
  return {success: true, id: id};
}

function updateSystem(rowNum, systemData) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('系統清冊');
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  var row = headers.map(function(h) { return systemData[h] !== undefined ? systemData[h] : ''; });
  sheet.getRange(rowNum, 1, 1, row.length).setValues([row]);
  return {success: true};
}

// ===== 防護需求分級評估 =====
function saveRating(ratingData) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('防護需求分級評估');
  if (!sheet) { initializeSheetsCore_(); sheet = ss.getSheetByName('防護需求分級評估'); }
  var detailSheet = ensureRatingDetailSheet_();
  var recommendations = buildRatingRecommendations_(getSystemById_(ratingData.systemId) || {});
  var details = ratingData.details || {};
  var maxLevel = '普';
  var assessDate = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy/MM/dd');
  var evaluator = getCurrentEvaluator();
  if (!evaluator.email) throw new Error('無法取得目前登入帳號，請檢查 Web App 部署權限或網域設定。');
  var assessor = evaluator.displayName || evaluator.email;

  RATING_DIMENSIONS.forEach(function(dim) {
    var detail = details[dim.field] || {};
    var selectedLevel = normalizeLevel_(detail.selectedLevel || ratingData[dim.field] || recommendations[dim.field].recommendedLevel);
    maxLevel = escalateLevel_(maxLevel, selectedLevel);
  });

  // 檢查是否已有該系統的評估
  var data = sheet.getDataRange().getValues();
  var existingRow = -1;
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == ratingData.systemId) {
      existingRow = i + 1;
      break;
    }
  }

  var row = [
    ratingData.systemId,
    ratingData.systemName,
    assessDate,
    assessor,
    normalizeLevel_((details.confidentiality || {}).selectedLevel || ratingData.confidentiality || recommendations.confidentiality.recommendedLevel),
    (details.confidentiality || {}).note || ratingData.confidentialityNote || '',
    normalizeLevel_((details.integrity || {}).selectedLevel || ratingData.integrity || recommendations.integrity.recommendedLevel),
    (details.integrity || {}).note || ratingData.integrityNote || '',
    normalizeLevel_((details.availability || {}).selectedLevel || ratingData.availability || recommendations.availability.recommendedLevel),
    (details.availability || {}).note || ratingData.availabilityNote || '',
    normalizeLevel_((details.compliance || {}).selectedLevel || ratingData.compliance || recommendations.compliance.recommendedLevel),
    (details.compliance || {}).note || ratingData.complianceNote || '',
    maxLevel
  ];

  if (existingRow > 0) {
    sheet.getRange(existingRow, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }

  // Upsert detail rows
  var existingDetails = detailSheet.getDataRange().getValues();
  var detailRowMap = {};
  for (var j = 1; j < existingDetails.length; j++) {
    detailRowMap[existingDetails[j][0] + '|' + existingDetails[j][2]] = j + 1;
  }

  RATING_DIMENSIONS.forEach(function(dim) {
    var detail = details[dim.field] || {};
    var rec = recommendations[dim.field];
    var selectedLevel = normalizeLevel_(detail.selectedLevel || ratingData[dim.field] || rec.recommendedLevel);
    var scenarioLevel = normalizeLevel_(detail.scenarioLevel || selectedLevel);
    var key = ratingData.systemId + '|' + dim.field;
    var detailRow = [
      ratingData.systemId,
      ratingData.systemName,
      dim.field,
      normalizeLevel_(detail.recommendedLevel || rec.recommendedLevel),
      selectedLevel,
      scenarioLevel,
      (detail.signals && detail.signals.length ? detail.signals.join(' ') : rec.signals.join(' ')),
      detail.note || ratingData[dim.field + 'Note'] || '',
      detail.overrideReason || '',
      assessor,
      assessDate,
      'wizard-v1'
    ];
    if (detailRowMap[key]) detailSheet.getRange(detailRowMap[key], 1, 1, detailRow.length).setValues([detailRow]);
    else detailSheet.appendRow(detailRow);
  });

  updateSystemLevel_(ratingData.systemId, maxLevel);

  return {
    success: true,
    finalLevel: maxLevel,
    assessDate: assessDate,
    assessor: assessor,
    currentEvaluator: evaluator
  };
}

function getRating(systemId) {
  return buildRatingPayload_(systemId);
}

// ===== 防護基準自評 =====
function getAssessmentCompareChangeMeta_(index) {
  var normalized = String(index || '');
  var colorMap = {
    level_change: '#E8F3FF',
    wording_change: '#FFF8D9',
    new_item: '#EAF7EA'
  };
  var labelMap = {
    level_change: '等級變更',
    wording_change: '文字修改',
    new_item: '新增項目'
  };
  var type = '';
  var levelChanges = {'2':true,'3':true,'4':true,'5':true,'6':true,'9':true,'33':true,'77':true};
  var wordingChanges = {'28':true,'29':true,'30':true,'31':true,'32':true,'33':true,'34':true,'36':true,'37':true,'38':true,'41':true,'42':true,'43':true,'47':true,'58':true,'70':true};
  var newItems = {'35':true,'59':true,'61':true,'64':true};

  if (newItems[normalized]) type = 'new_item';
  else if (levelChanges[normalized]) type = 'level_change';
  else if (wordingChanges[normalized]) type = 'wording_change';

  return {
    compareChangeType: type,
    compareChangeLabel: labelMap[type] || '',
    compareChangeColor: colorMap[type] || ''
  };
}

function getAssessment(systemId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('防護基準自評');
  if (!sheet) return [];

  var data = sheet.getDataRange().getDisplayValues();
  var results = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == systemId) {
      var meta = getAssessmentCompareChangeMeta_(data[i][2]);
      results.push({
        systemId: data[i][0],
        systemName: data[i][1],
        index: data[i][2],
        dimension: data[i][3],
        category: data[i][4],
        level: data[i][5],
        description: data[i][6],
        compliance: data[i][7],
        currentStatus: data[i][8],
        evidence: data[i][9],
        corrective: data[i][10],
        targetDate: data[i][11],
        note: data[i][12],
        lastUpdate: data[i][13],
        compareChangeType: meta.compareChangeType,
        compareChangeLabel: meta.compareChangeLabel,
        compareChangeColor: meta.compareChangeColor,
        _row: i + 1
      });
    }
  }
  return results;
}

function saveAssessmentItem(item) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('防護基準自評');
  if (!sheet) { initializeSheetsCore_(); sheet = ss.getSheetByName('防護基準自評'); }

  var row = [
    item.systemId, item.systemName, item.index, item.dimension,
    item.category, item.level, item.description, item.compliance || '',
    item.currentStatus || '', item.evidence || '', item.corrective || '',
    item.targetDate || '', item.note || '',
    new Date().toLocaleString('zh-TW')
  ];

  if (item._row) {
    sheet.getRange(item._row, 1, 1, row.length).setValues([row]);
  } else {
    // Check if exists
    var data = sheet.getDataRange().getValues();
    var found = false;
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] == item.systemId && data[i][2] == item.index) {
        sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
        found = true;
        break;
      }
    }
    if (!found) {
      sheet.appendRow(row);
    }
  }
  return {success: true};
}

function initAssessmentForSystem(systemId, systemName, systemLevel) {
  var controls = getControlMeasures();
  var existing = getAssessment(systemId);
  var existingIndexes = existing.map(function(e) { return e.index; });
  var appRule = getAssessmentApplicabilityConfig_();
  var count = 0;

  controls.forEach(function(ctrl) {
    if (existingIndexes.indexOf(ctrl.index) === -1) {
      var applicable = isAssessmentControlApplicable_(ctrl.level, systemLevel);
      saveAssessmentItem({
        systemId: systemId,
        systemName: systemName,
        index: ctrl.index,
        dimension: ctrl.dimension,
        category: ctrl.category,
        level: ctrl.level,
        description: ctrl.description,
        compliance: applicable ? '未符合' : appRule.naLabel,
        currentStatus: '',
        evidence: '',
        corrective: '',
        targetDate: '',
        note: applicable ? '' : appRule.naNote
      });
      count++;
    }
  });

  return {success: true, added: count};
}

// ===== 統計 =====
function getSystemStats(systemId) {
  var assessment = getAssessment(systemId);
  if (assessment.length === 0) return null;

  var naLabel = getAssessmentApplicabilityConfig_().naLabel;
  var stats = {total: 0, compliant: 0, partial: 0, nonCompliant: 0, na: 0, pending: 0};
  assessment.forEach(function(a) {
    stats.total++;
    switch (a.compliance) {
      case '符合': stats.compliant++; break;
      case '部分符合': stats.partial++; break;
      case '未符合': stats.nonCompliant++; break;
      case naLabel: stats.na++; break;
      default: stats.pending++; break;
    }
  });
  return stats;
}

// ===== 全域儀表板統計 =====
function getGlobalDashboard() {
  var systems = getSystems();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var assessSheet = ss.getSheetByName('防護基準自評');
  var allAssess = [];
  if (assessSheet && assessSheet.getLastRow() > 1) {
    var data = assessSheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      allAssess.push({systemId: data[i][0], index: data[i][2], dimension: data[i][3],
        category: data[i][4], level: data[i][5], compliance: data[i][7]});
    }
  }

  var codeMap = getCodeMap();
  var result = [];

  systems.forEach(function(sys) {
    var sysId = sys['系統ID'];
    var sysLevel = sys['防護需求等級'] || '';
    var items = allAssess.filter(function(a) { return a.systemId == sysId; });

    var stats = {compliant:0, partial:0, nonCompliant:0, na:0, pending:0, applicable:0};
    var dimStats = {};
    var failCodes = [];

    items.forEach(function(item) {
      var isApplicable = isAssessmentControlApplicable_(item.level, sysLevel);
      if (!isApplicable) { stats.na++; return; }
      stats.applicable++;
      if (item.compliance === '符合') stats.compliant++;
      else if (item.compliance === '部分符合') { stats.partial++; collectFailCode(item, codeMap, failCodes); }
      else if (item.compliance === '未符合') { stats.nonCompliant++; collectFailCode(item, codeMap, failCodes); }
      else stats.pending++;

      // Per-dimension stats
      if (!dimStats[item.dimension]) dimStats[item.dimension] = {ok:0, fail:0, pending:0, total:0};
      dimStats[item.dimension].total++;
      if (item.compliance === '符合') dimStats[item.dimension].ok++;
      else if (item.compliance === '未符合' || item.compliance === '部分符合') dimStats[item.dimension].fail++;
      else dimStats[item.dimension].pending++;
    });

    result.push({
      systemId: sysId,
      systemName: sys['系統名稱'],
      level: sysLevel,
      stats: stats,
      dimStats: dimStats,
      failCodes: unique(failCodes),
      hasAssessment: items.length > 0,
      packageExempt: isPackageExempt_(sys)
    });
  });

  return result;
}

function unique(arr) {
  var seen = {};
  return arr.filter(function(x) { return seen[x] ? false : (seen[x] = true); });
}

// ===== 不符合代碼計算 =====
function getCodeMap() {
  var config = getRuleConfig_();
  var rows = config.code_map || [];
  var map = {};
  rows.forEach(function(rule) {
    if (rule.enabled && rule.value) map[rule.key] = rule.value;
  });
  return map;
}

function collectFailCode(item, codeMap, arr) {
  var key = item.dimension + '|' + item.category;
  var code = codeMap[key];
  if (code && arr.indexOf(code) === -1) arr.push(code);
}

function getNonComplianceCodes(systemId) {
  var assessment = getAssessment(systemId);
  var sys = getSystems().filter(function(s) { return s['系統ID'] == systemId; })[0];
  if (!sys) return {codes: [], codeString: ''};

  var codeMap = getCodeMap();
  var failCodes = [];

  assessment.forEach(function(item) {
    if (isAssessmentControlApplicable_(item.level, sys['防護需求等級']) && (item.compliance === '未符合' || item.compliance === '部分符合')) {
      collectFailCode(item, codeMap, failCodes);
    }
  });

  failCodes.sort();
  // 同步寫回系統清冊
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sysSheet = ss.getSheetByName('系統清冊');
  if (sysSheet && sys._row) {
    var headers = sysSheet.getRange(1,1,1,sysSheet.getLastColumn()).getValues()[0];
    var codeCol = headers.indexOf('不符合防護基準項目代碼');
    var statusCol = headers.indexOf('是否符合防護基準');
    if (codeCol >= 0) {
      sysSheet.getRange(sys._row, codeCol + 1).setValue(failCodes.join('/'));
    }
    if (statusCol >= 0) {
      var status = failCodes.length === 0 ? '符合' : '部分符合';
      // 檢查是否全部未符合
      var allFail = assessment.filter(function(a) {
        return isAssessmentControlApplicable_(a.level, sys['防護需求等級']) && a.compliance !== getAssessmentApplicabilityConfig_().naLabel;
      }).every(function(a) { return a.compliance === '未符合' || !a.compliance; });
      if (allFail && assessment.length > 0) status = '不符合';
      sysSheet.getRange(sys._row, statusCol + 1).setValue(status);
    }
  }

  return {codes: failCodes, codeString: failCodes.join('/')};
}

// ===== 批次儲存自評 =====
function batchSaveAssessment(items) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('防護基準自評');
  if (!sheet) { initializeSheetsCore_(); sheet = ss.getSheetByName('防護基準自評'); }

  var data = sheet.getDataRange().getValues();
  var now = new Date().toLocaleString('zh-TW');
  var updated = 0;

  items.forEach(function(item) {
    var row = [
      item.systemId, item.systemName, item.index, item.dimension,
      item.category, item.level, item.description, item.compliance || '',
      item.currentStatus || '', item.evidence || '', item.corrective || '',
      item.targetDate || '', item.note || '', now
    ];

    // Find existing row
    var found = false;
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] == item.systemId && data[i][2] == item.index) {
        sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
        found = true;
        updated++;
        break;
      }
    }
    if (!found) {
      sheet.appendRow(row);
      data.push(row); // keep data in sync
      updated++;
    }
  });

  return {success: true, updated: updated};
}

// ===== 匯出自評報告至新工作表 =====
function exportAssessmentReport(systemId) {
  var sys = getSystems().filter(function(s) { return s['系統ID'] == systemId; })[0];
  if (!sys) return {success: false, message: '找不到系統'};

  var assessment = getAssessment(systemId);
  if (assessment.length === 0) return {success: false, message: '尚無自評資料'};

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = '自評報告_' + (sys['系統名稱'] || '').substring(0, 15);
  var existing = ss.getSheetByName(sheetName);
  if (existing) ss.deleteSheet(existing);

  var ws = ss.insertSheet(sheetName);

  // Title
  ws.getRange('A1').setValue('資通系統防護基準檢核表（依據附表十修正規定）');
  ws.getRange('A1:K1').merge().setFontSize(14).setFontWeight('bold').setHorizontalAlignment('center');

  ws.getRange('A2').setValue('機關單位名稱'); ws.getRange('B2').setValue('人體生物資料庫');
  ws.getRange('D2').setValue('檢核日期'); ws.getRange('E2').setValue(new Date().toLocaleDateString('zh-TW'));
  ws.getRange('A3').setValue('資通系統名稱'); ws.getRange('B3').setValue(sys['系統名稱']);
  ws.getRange('D3').setValue('安全等級'); ws.getRange('E3').setValue(sys['防護需求等級']);
  ws.getRange('A2:A3').setFontWeight('bold');
  ws.getRange('D2:D3').setFontWeight('bold');

  // Headers
  var headers = ['構面','類別','項次','最低要求等級','安全控制措施','符合性','現況說明','佐證資料','矯正作為','目標日期','備註'];
  ws.getRange(5, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold').setBackground('#4472C4').setFontColor('#FFFFFF');
  ws.setFrozenRows(5);

  // Data
  var prevDim = '', prevCat = '';

  var rows = assessment.map(function(item) {
    var dim = item.dimension !== prevDim ? item.dimension : '';
    var cat = item.category !== prevCat ? item.category : '';
    prevDim = item.dimension; prevCat = item.category;
    return [dim, cat, item.index, item.level, item.description,
      item.compliance || '', item.currentStatus || '', item.evidence || '',
      item.corrective || '', item.targetDate || '', item.note || ''];
  });

  if (rows.length > 0) {
    ws.getRange(6, 1, rows.length, 11).setValues(rows);
  }

  // Formatting
  ws.setColumnWidth(1, 100); ws.setColumnWidth(2, 130); ws.setColumnWidth(3, 40);
  ws.setColumnWidth(4, 60); ws.setColumnWidth(5, 350); ws.setColumnWidth(6, 60);
  ws.setColumnWidth(7, 250); ws.setColumnWidth(8, 150); ws.setColumnWidth(9, 150);
  ws.setColumnWidth(10, 80); ws.setColumnWidth(11, 80);

  // Color applicable/not-applicable rows
  for (var i = 0; i < assessment.length; i++) {
    var r = i + 6;
    var meta = getAssessmentCompareChangeMeta_(assessment[i].index);
    var applicable = isAssessmentControlApplicable_(assessment[i].level, sys['防護需求等級']);
    if (meta.compareChangeColor) {
      ws.getRange(r, 1, 1, 11).setBackground(meta.compareChangeColor);
      if (!applicable) ws.getRange(r, 1, 1, 11).setFontColor('#7A7A7A');
      else ws.getRange(r, 1, 1, 11).setFontColor('#000000');
    } else if (applicable) {
      ws.getRange(r, 1, 1, 11).setBackground('#FFFFFF').setFontColor('#000000');
    } else {
      ws.getRange(r, 1, 1, 11).setBackground('#F2F2F2').setFontColor('#999999');
    }
    ws.getRange(r, 1, 1, 11).setBorder(true,true,true,true,true,true);
  }

  // Non-compliance summary at bottom
  var summaryRow = 6 + rows.length + 2;
  ws.getRange(summaryRow, 1).setValue('不符合防護基準項目代碼：');
  ws.getRange(summaryRow, 1).setFontWeight('bold');
  var codes = getNonComplianceCodes(systemId);
  ws.getRange(summaryRow, 3).setValue(codes.codeString || '無（全部符合）');

  return {success: true, sheetName: sheetName};
}

// ===== 刪除系統 =====
function deleteSystem(systemId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('系統清冊');
  if (!sheet) return {success: false};

  var data = sheet.getDataRange().getValues();
  for (var i = data.length - 1; i >= 1; i--) {
    if (data[i][0] == systemId) {
      sheet.deleteRow(i + 1);
      break;
    }
  }

  // Also clean up assessment data
  var assessSheet = ss.getSheetByName('防護基準自評');
  if (assessSheet) {
    var aData = assessSheet.getDataRange().getValues();
    for (var j = aData.length - 1; j >= 1; j--) {
      if (aData[j][0] == systemId) assessSheet.deleteRow(j + 1);
    }
  }

  // Clean up rating data
  var ratingSheet = ss.getSheetByName('防護需求分級評估');
  if (ratingSheet) {
    var rData = ratingSheet.getDataRange().getValues();
    for (var k = rData.length - 1; k >= 1; k--) {
      if (rData[k][0] == systemId) ratingSheet.deleteRow(k + 1);
    }
  }

  return {success: true};
}

// ===== 匯入預設系統資料 =====
function importDefaultSystems() {
  assertRuleAdmin_();
  var defaultSystems = [
    {name:"行政管理資訊系統(套裝)", attr:"行政", method:"本機關購置套裝軟體", mgr:"Biobank", user:"Biobank同仁", date:"2021/7", host:"是", core:"否", sensitive:"是", pii:"150", encrypt:"是", sensitiveType:"身分證字號", civil:"否", level:"套裝軟體", isms:"否"},
    {name:"臺灣人體生物資料庫庫存管理系統", attr:"業務", method:"本機關委外開發", mgr:"Biobank", user:"Biobank同仁", date:"2016/7", host:"是", core:"否", sensitive:"否", pii:"0", encrypt:"無機敏資訊", sensitiveType:"無機敏資訊", civil:"否", level:"普", isms:"否"},
    {name:"實驗室資訊管理系統", attr:"業務", method:"本機關委外開發", mgr:"Biobank", user:"Biobank同仁", date:"2016/8", host:"是", core:"否", sensitive:"否", pii:"0", encrypt:"無機敏資訊", sensitiveType:"無機敏資訊", civil:"否", level:"普", isms:"否"},
    {name:"收案系統", attr:"業務", method:"本機關自行開發", mgr:"Biobank", user:"Biobank同仁", date:"2019/3", host:"是", core:"是", sensitive:"是", pii:"203053", encrypt:"是", sensitiveType:"身分證字號", civil:"否", level:"中", isms:"是"},
    {name:"檢體與數位資料釋出管理系統", attr:"兼具行政/業務", method:"本機關委外開發", mgr:"Biobank", user:"Biobank同仁", date:"2019/6", host:"否", core:"否", sensitive:"否", pii:"0", encrypt:"無機敏資訊", sensitiveType:"無機敏資訊", civil:"否", level:"普", isms:"否"},
    {name:"healthy 網站", attr:"業務", method:"本機關自行開發", mgr:"Biobank", user:"Biobank同仁", date:"2023/11", host:"是", core:"否", sensitive:"否", pii:"0", encrypt:"無機敏資訊", sensitiveType:"無機敏資訊", civil:"否", level:"普", isms:"否"},
    {name:"taiwanview 網站", attr:"業務", method:"本機關委外開發", mgr:"Biobank", user:"Biobank同仁", date:"2023/6", host:"是", core:"否", sensitive:"否", pii:"0", encrypt:"無機敏資訊", sensitiveType:"無機敏資訊", civil:"否", level:"普", isms:"否"},
    {name:"台灣人體生物資料庫官網", attr:"業務", method:"本機關委外開發", mgr:"Biobank", user:"Biobank同仁", date:"2022/3", host:"是", core:"否", sensitive:"否", pii:"0", encrypt:"無機敏資訊", sensitiveType:"無機敏資訊", civil:"否", level:"普", isms:"否"},
    {name:"pheweb網站", attr:"業務", method:"本機關委外開發", mgr:"Biobank", user:"Biobank同仁", date:"2023/6", host:"是", core:"否", sensitive:"否", pii:"0", encrypt:"無機敏資訊", sensitiveType:"無機敏資訊", civil:"否", level:"普", isms:"否"},
    {name:"行政管理資訊系統(委外)", attr:"行政", method:"本機關委外開發", mgr:"Biobank", user:"Biobank同仁", date:"2015/6", host:"是", core:"否", sensitive:"是", pii:"150", encrypt:"是", sensitiveType:"身分證字號", civil:"否", level:"普", isms:"否"},
    {name:"差勤系統", attr:"行政", method:"本機關購置套裝軟體", mgr:"Biobank", user:"Biobank同仁", date:"", host:"是", core:"否", sensitive:"否", pii:"0", encrypt:"無機敏資訊", sensitiveType:"無機敏資訊", civil:"否", level:"套裝軟體", isms:"否"}
  ];

  defaultSystems.forEach(function(sys) {
    addSystem({
      '系統名稱': sys.name,
      '系統屬性': sys.attr,
      '建置方式': sys.method,
      '系統管理者(部門/單位)': sys.mgr,
      '系統使用者(部門/單位)': sys.user,
      '系統建置日期': sys.date,
      '主機設置於機關內': sys.host,
      '核心系統': sys.core,
      '含機敏資訊': sys.sensitive,
      '個資數量': sys.pii,
      '機敏資訊以非明文方式儲存': sys.encrypt,
      '機敏資訊類別': sys.sensitiveType,
      '是否與民生權益相關': sys.civil,
      '防護需求等級': sys.level,
      '是否包含於ISMS導入範圍': sys.isms
    });
  });

  return {success: true, count: defaultSystems.length};
}
