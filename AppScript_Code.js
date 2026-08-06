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
var PAGE_ACCESS_DENIED_MESSAGE = '權限不足，請聯絡負責人員';
var PAGE_PASSCODE_PROPERTY = 'PAGE_ACCESS_PASSCODE';
var PAGE_PASSCODE_CACHE_VERSION_PROPERTY = 'PAGE_PASSCODE_CACHE_VERSION';
var PAGE_PASSCODE_CACHE_PREFIX = 'page_passcode_';
var PAGE_PASSCODE_TTL_SECONDS = 8 * 60 * 60;
var PAGE_PASSCODE_REQUIRED_MESSAGE = '通行碼驗證已逾時，請重新輸入通行碼';
var ADDITIONAL_ORG_ADMIN_EMAILS_PROPERTY = 'ADDITIONAL_ORG_ADMIN_EMAILS';

function doGet(e) {
  var access = getPageAccessStatus_();
  if (!access.allowed) return createAccessDeniedOutput_();
  if (!isPagePasscodeVerified_(access.email)) return createPasscodeOutput_(access);
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('資通系統防護基準管理系統')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function createAccessDeniedOutput_() {
  var html = '<!DOCTYPE html><html><head><base target="_top"><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f8f9fa;color:#202124;font-family:"Microsoft JhengHei","Segoe UI",sans-serif}.access-denied{padding:28px 32px;border:1px solid #dadce0;border-radius:18px;background:#fff;box-shadow:0 16px 40px rgba(15,23,42,.08);font-size:16px;font-weight:700}</style>' +
    '</head><body><div class="access-denied">' + PAGE_ACCESS_DENIED_MESSAGE + '</div></body></html>';
  return HtmlService.createHtmlOutput(html)
    .setTitle('權限不足')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function createPasscodeOutput_(access) {
  var evaluator = getCurrentEvaluatorWithoutPageAccess_();
  var displayName = evaluator.displayName || evaluator.email || access.email || '已授權使用者';
  var html = '<!DOCTYPE html><html><head><base target="_top"><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<style>' +
    ':root{--blue:#174ea6;--ink:#1f2937;--muted:#64748b;--line:#dbe4ee;--soft:#f4f7fb;--danger:#b42318}' +
    '*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at top right,#e8f1ff 0,rgba(232,241,255,0) 42%),linear-gradient(145deg,#f8fafc 0%,#eef4f8 100%);font-family:"Microsoft JhengHei","Segoe UI",sans-serif;color:var(--ink);display:flex;align-items:center;justify-content:center;padding:28px}' +
    '.gate{width:min(460px,100%);position:relative;padding:30px;border-radius:24px;background:rgba(255,255,255,.94);border:1px solid rgba(219,228,238,.92);box-shadow:0 24px 70px rgba(15,23,42,.14),inset 0 1px 0 rgba(255,255,255,.9);overflow:hidden}' +
    '.gate:before{content:"";position:absolute;right:-74px;top:-92px;width:210px;height:210px;border-radius:56px;background:radial-gradient(circle at 38% 38%,rgba(23,78,166,.12),rgba(23,78,166,0) 68%);transform:rotate(16deg)}' +
    '.eyebrow{position:relative;display:inline-flex;align-items:center;gap:8px;padding:5px 10px;border-radius:999px;background:#eef5ff;color:var(--blue);font-size:11px;font-weight:800;letter-spacing:.04em}' +
    'h1{position:relative;margin:18px 0 8px;font-size:24px;line-height:1.25;color:#0f172a}.copy{position:relative;margin:0 0 20px;font-size:13px;line-height:1.8;color:var(--muted)}' +
    '.user{position:relative;margin:0 0 16px;padding:12px 14px;border-radius:16px;background:var(--soft);border:1px solid var(--line);font-size:12px;color:#334155;line-height:1.6}.user strong{display:block;color:#0f172a;font-size:13px}' +
    'label{position:relative;display:block;margin-bottom:8px;font-size:12px;font-weight:800;color:#334155}.field{position:relative;display:flex;gap:8px}' +
    'input{width:100%;height:46px;border:1px solid #cbd5e1;border-radius:14px;padding:0 14px;font-size:15px;outline:none;background:#fff;color:#111827;transition:border-color .16s ease,box-shadow .16s ease}' +
    'input:focus{border-color:var(--blue);box-shadow:0 0 0 4px rgba(23,78,166,.12)}button{height:46px;border:0;border-radius:14px;padding:0 18px;background:var(--blue);color:#fff;font-size:13px;font-weight:800;cursor:pointer;white-space:nowrap;box-shadow:0 12px 24px rgba(23,78,166,.2);transition:transform .16s ease,box-shadow .16s ease,opacity .16s ease}' +
    'button:hover{transform:translateY(-1px);box-shadow:0 16px 30px rgba(23,78,166,.26)}button:disabled{opacity:.62;cursor:not-allowed;transform:none;box-shadow:none}' +
    '.msg{position:relative;min-height:20px;margin-top:12px;font-size:12px;line-height:1.7;color:var(--muted)}.msg.error{color:var(--danger);font-weight:700}.msg.ok{color:#0f7a4f;font-weight:700}' +
    '</style></head><body><main class="gate">' +
    '<div class="eyebrow">SECURE ACCESS</div><h1>輸入通行碼</h1>' +
    '<p class="copy">你已通過人員名單檢查。請輸入通行碼後進入資通系統防護基準管理頁面。</p>' +
    '<div class="user"><strong>' + escapeHtml_(displayName) + '</strong></div>' +
    '<form id="passcode-form"><label for="passcode">通行碼</label><div class="field"><input id="passcode" type="password" autocomplete="current-password"><button id="submit-btn" type="submit">進入</button></div><div id="msg" class="msg"></div></form>' +
    '</main><script>' +
    'var form=document.getElementById("passcode-form"),input=document.getElementById("passcode"),btn=document.getElementById("submit-btn"),msg=document.getElementById("msg");' +
    'function setMsg(t,c){msg.textContent=t||"";msg.className="msg"+(c?" "+c:"");}' +
    'function restore(){btn.disabled=false;input.disabled=false;}' +
    'function focusInput(){try{input.focus();input.select();}catch(e){}}' +
    'form.addEventListener("submit",function(e){e.preventDefault();var v=input.value||"";if(!v.trim()){setMsg("請輸入通行碼。","error");focusInput();return;}btn.disabled=true;input.disabled=true;setMsg("正在驗證通行碼...","");google.script.run.withSuccessHandler(function(res){if(res&&res.success){if(res.appUrl){setMsg("驗證成功，正在進入頁面。","ok");window.open(res.appUrl,"_top");return;}restore();setMsg("無法取得系統網址，請重新開啟部署連結。","error");return;}restore();setMsg((res&&res.message)||"通行碼錯誤，請重新輸入。","error");focusInput();}).withFailureHandler(function(err){restore();setMsg((err&&err.message)||"驗證失敗，請稍後再試。","error");focusInput();}).verifyPagePasscode(v);});' +
    '</script></body></html>';
  return HtmlService.createHtmlOutput(html)
    .setTitle('通行碼驗證')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// 彙整可接受的人員狀態清單（HR_ACTIVE_VALUES），去除空白並去重；未設定時退回預設「在勤」。
function getHrActiveValues_() {
  var raw = (typeof HR_ACTIVE_VALUES !== 'undefined' && Array.isArray(HR_ACTIVE_VALUES)) ? HR_ACTIVE_VALUES : [];
  var seen = {}, out = [];
  raw.forEach(function(v) {
    var s = String(v === null || v === undefined ? '' : v).trim();
    if (s && !seen[s]) { seen[s] = true; out.push(s); }
  });
  if (!out.length) out.push('在勤');
  return out;
}

function getHrConfig_() {
  var activeValues = getHrActiveValues_();
  return {
    spreadsheetId: typeof HR_SPREADSHEET_ID !== 'undefined' ? HR_SPREADSHEET_ID : '',
    sheetName: typeof HR_SHEET_NAME !== 'undefined' ? HR_SHEET_NAME : '人員主檔',
    emailColumn: typeof HR_EMAIL_COLUMN !== 'undefined' ? HR_EMAIL_COLUMN : 1,
    nameColumn: typeof HR_NAME_COLUMN !== 'undefined' ? HR_NAME_COLUMN : 2,
    statusColumn: typeof HR_STATUS_COLUMN !== 'undefined' ? HR_STATUS_COLUMN : 3,
    activeValues: activeValues
  };
}

function getHrOrgTreeConfig_() {
  return {
    spreadsheetId: typeof HR_SPREADSHEET_ID !== 'undefined' ? HR_SPREADSHEET_ID : '',
    sheetName: typeof HR_ORG_TREE_SHEET_NAME !== 'undefined' ? HR_ORG_TREE_SHEET_NAME : '組織架構樹',
    typeColumn: typeof HR_ORG_TYPE_COLUMN !== 'undefined' ? HR_ORG_TYPE_COLUMN : 1,
    levelColumn: typeof HR_ORG_LEVEL_COLUMN !== 'undefined' ? HR_ORG_LEVEL_COLUMN : 2,
    nameColumn: typeof HR_ORG_NAME_COLUMN !== 'undefined' ? HR_ORG_NAME_COLUMN : 4,
    adminEmailColumn: typeof HR_ORG_ADMIN_EMAIL_COLUMN !== 'undefined' ? HR_ORG_ADMIN_EMAIL_COLUMN : 7,
    adminNameColumn: typeof HR_ORG_ADMIN_NAME_COLUMN !== 'undefined' ? HR_ORG_ADMIN_NAME_COLUMN : 8
  };
}

function getHrRoleAssignmentConfig_() {
  var defaultGroups = ['GRP-IT', 'BIOIT', 'GRP-DM'];
  var groups = typeof HR_DEPLOYMENT_MAINTAINER_GROUPS !== 'undefined' ? HR_DEPLOYMENT_MAINTAINER_GROUPS : null;
  if (!groups && typeof HR_DEPLOYMENT_MAINTAINER_GROUP !== 'undefined') groups = [HR_DEPLOYMENT_MAINTAINER_GROUP];
  if (!groups) groups = defaultGroups;
  return {
    spreadsheetId: typeof HR_SPREADSHEET_ID !== 'undefined' ? HR_SPREADSHEET_ID : '',
    sheetName: typeof HR_ROLE_ASSIGNMENT_SHEET_NAME !== 'undefined' ? HR_ROLE_ASSIGNMENT_SHEET_NAME : '人員職務配置',
    emailColumn: typeof HR_ROLE_ASSIGNMENT_EMAIL_COLUMN !== 'undefined' ? HR_ROLE_ASSIGNMENT_EMAIL_COLUMN : 1,
    groupColumn: typeof HR_ROLE_ASSIGNMENT_GROUP_COLUMN !== 'undefined' ? HR_ROLE_ASSIGNMENT_GROUP_COLUMN : 3,
    deploymentMaintainerGroups: normalizeHrRoleGroupList_(groups)
  };
}

function normalizeHrRoleGroupList_(groups) {
  if (typeof groups === 'string') groups = groups.split(',');
  if (!groups || !groups.length) groups = ['GRP-IT', 'BIOIT', 'GRP-DM'];
  var result = [];
  var seen = {};
  for (var i = 0; i < groups.length; i++) {
    var group = String(groups[i] || '').trim();
    if (!group || seen[group]) continue;
    seen[group] = true;
    result.push(group);
  }
  return result.length ? result : ['GRP-IT', 'BIOIT', 'GRP-DM'];
}

function formatEvaluatorDisplayName_(name, email) {
  if (name && email) return name + '（' + email + '）';
  return name || email || '';
}

function normalizeEmail_(email) {
  return String(email || '').trim().toLowerCase();
}

function getScriptPropertyEmailList_(propertyName) {
  var prop = PropertiesService.getScriptProperties().getProperty(propertyName) || '';
  var result = [];
  var seen = {};
  var emails = prop.split(',');
  for (var i = 0; i < emails.length; i++) {
    var email = normalizeEmail_(emails[i]);
    if (!email || seen[email]) continue;
    seen[email] = true;
    result.push(email);
  }
  return result;
}

function escapeHtml_(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
      if (cfg.activeValues.indexOf(status) !== -1) {
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

function loadDeploymentMaintainerEmployees_(hrDirectory) {
  var cfg = getHrRoleAssignmentConfig_();
  var result = {
    employees: [],
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
    if (sheet.getLastRow() <= 1) return result;

    var data = sheet.getDataRange().getDisplayValues();
    var seen = {};
    var directoryMap = hrDirectory && hrDirectory.map ? hrDirectory.map : {};
    var groupMap = {};
    for (var g = 0; g < cfg.deploymentMaintainerGroups.length; g++) {
      groupMap[cfg.deploymentMaintainerGroups[g]] = true;
    }
    for (var i = 1; i < data.length; i++) {
      var group = String(data[i][cfg.groupColumn - 1] || '').trim();
      if (!groupMap[group]) continue;
      var email = normalizeEmail_(data[i][cfg.emailColumn - 1]);
      if (!email || seen[email]) continue;
      seen[email] = true;
      var person = directoryMap[email] || {};
      result.employees.push({
        email: email,
        name: person.name || '',
        displayName: person.name || email
      });
    }
    result.employees.sort(function(a, b) {
      return formatEvaluatorDisplayName_(a.name, a.email).localeCompare(formatEvaluatorDisplayName_(b.name, b.email), 'zh-Hant');
    });
    return result;
  } catch (err) {
    result.warning = '讀取 HR 人員職務配置失敗：' + err.message;
    return result;
  }
}

function getSessionEmail_() {
  try {
    return normalizeEmail_(Session.getActiveUser().getEmail() || '');
  } catch (err) {
    return '';
  }
}

function getPasscodeCacheKey_(email) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, getPasscodeCacheVersion_() + '|' + normalizeEmail_(email));
  var hex = digest.map(function(byte) {
    var value = byte < 0 ? byte + 256 : byte;
    return ('0' + value.toString(16)).slice(-2);
  }).join('');
  return PAGE_PASSCODE_CACHE_PREFIX + hex;
}

function getPasscodeCacheVersion_() {
  return String(PropertiesService.getScriptProperties().getProperty(PAGE_PASSCODE_CACHE_VERSION_PROPERTY) || '1');
}

function getConfiguredPagePasscode_() {
  return String(PropertiesService.getScriptProperties().getProperty(PAGE_PASSCODE_PROPERTY) || '').trim();
}

function isPagePasscodeVerified_(email) {
  var normalized = normalizeEmail_(email);
  if (!normalized) return false;
  var expected = getConfiguredPagePasscode_();
  if (!expected) return false;
  return CacheService.getScriptCache().get(getPasscodeCacheKey_(normalized)) === 'ok';
}

function getPageAccessStatus_() {
  var email = getSessionEmail_();
  var directory = email ? loadHrDirectory_() : {map: {}, warning: ''};
  return {
    allowed: !!(email && directory.map && directory.map[email]),
    email: email,
    warning: directory.warning || ''
  };
}

function assertPageAccess_() {
  var status = getPageAccessStatus_();
  if (!status.allowed) throw new Error(PAGE_ACCESS_DENIED_MESSAGE);
  if (!isPagePasscodeVerified_(status.email)) throw new Error(PAGE_PASSCODE_REQUIRED_MESSAGE);
  return status;
}

function getCurrentEvaluatorWithoutPageAccess_() {
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
  var orgDirectory = loadOrgAdminDirectory_();
  if (!cfg.spreadsheetId) {
    result.warning = '尚未設定 HR_SPREADSHEET_ID，暫時僅帶入帳號。';
    if (orgDirectory.map[normalizeEmail_(email)] && orgDirectory.map[normalizeEmail_(email)].name) {
      result.name = orgDirectory.map[normalizeEmail_(email)].name;
      result.displayName = formatEvaluatorDisplayName_(result.name, email);
      result.source = 'org';
      result.warning = '';
    }
    return result;
  }

  var directory = loadHrDirectory_();
  var person = directory.map[normalizeEmail_(email)];
  if (person) {
    result.name = person.name || '';
    result.displayName = formatEvaluatorDisplayName_(result.name, email);
    result.source = 'hr';
  } else if (orgDirectory.map[normalizeEmail_(email)]) {
    result.name = orgDirectory.map[normalizeEmail_(email)].name || '';
    result.displayName = formatEvaluatorDisplayName_(result.name, email);
    result.source = 'org';
  } else {
    result.warning = directory.warning || '目前帳號未在人員主檔中。';
  }
  return result;
}

function verifyPagePasscode(passcode) {
  var status = getPageAccessStatus_();
  if (!status.allowed) throw new Error(PAGE_ACCESS_DENIED_MESSAGE);

  var expected = getConfiguredPagePasscode_();
  if (!expected) return {success: false, message: '通行碼尚未設定，請聯絡負責人員'};

  var incoming = String(passcode || '').trim();
  if (incoming !== expected) return {success: false, message: '通行碼錯誤，請重新輸入。'};

  CacheService.getScriptCache().put(getPasscodeCacheKey_(status.email), 'ok', PAGE_PASSCODE_TTL_SECONDS);
  return {success: true, appUrl: ScriptApp.getService().getUrl()};
}

function resetPagePasscodeCache() {
  var email = normalizeEmail_(getSessionEmail_());
  var admins = getScriptPropertyEmailList_('RULE_ADMIN_EMAILS');
  if (!email || admins.indexOf(email) === -1) {
    throw new Error('僅 RULE_ADMIN_EMAILS 管理者可清理通行碼認證暫存。');
  }
  var resetAt = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy/MM/dd HH:mm:ss');
  var version = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyyMMddHHmmss') + '_' + Utilities.getUuid().slice(0, 8);
  PropertiesService.getScriptProperties().setProperty(PAGE_PASSCODE_CACHE_VERSION_PROPERTY, version);
  return {
    success: true,
    resetAt: resetAt,
    resetBy: email
  };
}

function getWebAppUrl() {
  return ScriptApp.getService().getUrl();
}

function parseOrgLevel_(raw) {
  var str = String(raw || '').trim();
  if (!str) return null;
  var match = str.match(/\d+/);
  if (!match) return null;
  var level = parseInt(match[0], 10);
  if (isNaN(level)) return null;
  return level;
}

function loadOrgAdminDirectory_() {
  var cfg = getHrOrgTreeConfig_();
  var result = {
    map: {},
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
    if (sheet.getLastRow() <= 1) return result;

    var data = sheet.getDataRange().getDisplayValues();
    for (var i = 1; i < data.length; i++) {
      var orgType = String(data[i][cfg.typeColumn - 1] || '').trim();
      if (orgType !== '行政') continue;
      var level = parseOrgLevel_(data[i][cfg.levelColumn - 1]);
      if (level === null || level < 1 || level > 4) continue;
      var email = normalizeEmail_(data[i][cfg.adminEmailColumn - 1]);
      if (!email) continue;
      var current = result.map[email];
      if (current && current.level <= level) continue;
      result.map[email] = {
        email: email,
        level: level,
        orgType: orgType,
        orgName: String(data[i][cfg.nameColumn - 1] || '').trim(),
        name: String(data[i][cfg.adminNameColumn - 1] || '').trim()
      };
    }
    return result;
  } catch (err) {
    result.warning = '讀取 HR 組織架構樹失敗：' + err.message;
    return result;
  }
}

function getActiveHrEmployees() {
  assertPageAccess_();
  var directory = loadHrDirectory_();
  var deploymentMaintainers = loadDeploymentMaintainerEmployees_(directory);
  var warnings = [];
  if (directory.warning) warnings.push(directory.warning);
  if (deploymentMaintainers.warning && deploymentMaintainers.warning !== directory.warning) warnings.push(deploymentMaintainers.warning);
  return {
    employees: directory.activeEmployees || [],
    deploymentMaintainers: deploymentMaintainers.employees || [],
    warning: warnings.join(' ')
  };
}

function getCurrentEvaluator() {
  assertPageAccess_();
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
  var orgDirectory = loadOrgAdminDirectory_();
  if (!cfg.spreadsheetId) {
    result.warning = '尚未設定 HR_SPREADSHEET_ID，暫時僅帶入帳號。';
    if (orgDirectory.map[normalizeEmail_(email)] && orgDirectory.map[normalizeEmail_(email)].name) {
      result.name = orgDirectory.map[normalizeEmail_(email)].name;
      result.displayName = formatEvaluatorDisplayName_(result.name, email);
      result.source = 'org';
      result.warning = '';
    }
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
    if (!result.name && orgDirectory.map[normalizeEmail_(email)] && orgDirectory.map[normalizeEmail_(email)].name) {
      result.name = orgDirectory.map[normalizeEmail_(email)].name;
      result.source = 'org';
    }
    result.displayName = formatEvaluatorDisplayName_(result.name, email);
    result.source = result.source === 'org' ? 'org' : (result.name ? 'hr' : 'session');
    if (!result.name) result.warning = 'HR 人員主檔找到帳號，但姓名欄為空白。';
    return result;
  }

  var orgPerson = orgDirectory.map[normalizeEmail_(email)];
  if (orgPerson && orgPerson.name) {
    result.name = orgPerson.name;
    result.displayName = formatEvaluatorDisplayName_(result.name, email);
    result.source = 'org';
    result.warning = 'HR 人員主檔查無此帳號對應姓名，已改用組織架構樹姓名。';
    return result;
  }

  result.warning = 'HR 人員主檔查無此帳號對應姓名，暫時僅帶入帳號。';
  return result;
}

var RULE_SETTINGS_SHEET = '規則設定';
var RULE_AUDIT_SHEET = '規則變更紀錄';
var DASHBOARD_SNAPSHOT_SHEET = '儀表板快照';
var SYSTEM_ROLE_ASSIGNMENT_SHEET = '系統角色指派';
var RULE_SETTINGS_HEADERS = ['rule_group', 'rule_key', 'rule_label', 'rule_type', 'rule_value', 'description', 'enabled', 'sort_order'];
var RULE_AUDIT_HEADERS = ['timestamp', 'editor_email', 'editor_name', 'rule_group', 'rule_key', 'old_value', 'new_value', 'change_summary'];
var DASHBOARD_SNAPSHOT_HEADERS = ['快照鍵', '更新時間', '更新人員', '更新人員Email', '資料JSON'];
var SYSTEM_ROLE_ASSIGNMENT_HEADERS = ['系統ID', '系統名稱', '角色名稱', '使用者email', '指派人', '指派時間'];
var SYSTEM_ROLE_NAMES = ['系統承辦窗口', '系統部署維護人員', '開發'];
var SYSTEM_ROLE_LEGACY_NAME_MAP = {'系統使用窗口': '系統承辦窗口', '系統維運人員': '系統部署維護人員', '開發人員': '開發'};

function getEmptySystemRoleAssignmentMap_() {
  var map = {};
  for (var i = 0; i < SYSTEM_ROLE_NAMES.length; i++) map[SYSTEM_ROLE_NAMES[i]] = [];
  return map;
}

function ensureSystemRoleAssignmentSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SYSTEM_ROLE_ASSIGNMENT_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(SYSTEM_ROLE_ASSIGNMENT_SHEET);
    sheet.getRange(1, 1, 1, SYSTEM_ROLE_ASSIGNMENT_HEADERS.length).setValues([SYSTEM_ROLE_ASSIGNMENT_HEADERS]);
    sheet.getRange(1, 1, 1, SYSTEM_ROLE_ASSIGNMENT_HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    return sheet;
  }
  if (sheet.getLastColumn() < SYSTEM_ROLE_ASSIGNMENT_HEADERS.length) {
    sheet.insertColumnsAfter(sheet.getLastColumn(), SYSTEM_ROLE_ASSIGNMENT_HEADERS.length - sheet.getLastColumn());
  }
  sheet.getRange(1, 1, 1, SYSTEM_ROLE_ASSIGNMENT_HEADERS.length).setValues([SYSTEM_ROLE_ASSIGNMENT_HEADERS]);
  sheet.getRange(1, 1, 1, SYSTEM_ROLE_ASSIGNMENT_HEADERS.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
  return sheet;
}

function getSystemRoleAssignmentSheetReadOnly_() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SYSTEM_ROLE_ASSIGNMENT_SHEET);
}

function normalizeSystemRoleName_(roleName) {
  roleName = String(roleName || '').trim();
  return SYSTEM_ROLE_LEGACY_NAME_MAP[roleName] || roleName;
}

function isSystemRoleName_(roleName) {
  return SYSTEM_ROLE_NAMES.indexOf(normalizeSystemRoleName_(roleName)) !== -1;
}

function normalizeSystemRoleAssignments_(roleAssignments) {
  var result = getEmptySystemRoleAssignmentMap_();
  roleAssignments = roleAssignments || {};
  for (var r = 0; r < SYSTEM_ROLE_NAMES.length; r++) {
    var roleName = SYSTEM_ROLE_NAMES[r];
    var rows = roleAssignments[roleName] || [];
    for (var legacyName in SYSTEM_ROLE_LEGACY_NAME_MAP) {
      if (!SYSTEM_ROLE_LEGACY_NAME_MAP.hasOwnProperty(legacyName)) continue;
      if (SYSTEM_ROLE_LEGACY_NAME_MAP[legacyName] === roleName && roleAssignments[legacyName]) {
        rows = rows.concat(roleAssignments[legacyName]);
      }
    }
    var seen = {};
    for (var i = 0; i < rows.length; i++) {
      var raw = rows[i];
      var email = normalizeEmail_(typeof raw === 'string' ? raw : raw.email);
      if (!email || seen[email] || email.indexOf('@') < 0) continue;
      seen[email] = true;
      result[roleName].push({email: email});
    }
  }
  return result;
}

function getRoleAssignmentKey_(systemId, roleName, email) {
  return [String(systemId || ''), String(roleName || ''), normalizeEmail_(email)].join('|');
}

function buildSystemRolePerson_(email, hrDirectory) {
  var normalized = normalizeEmail_(email);
  var person = hrDirectory && hrDirectory.map ? hrDirectory.map[normalized] : null;
  var name = person && person.name ? person.name : '';
  return {
    email: normalized,
    name: name,
    displayName: name ? (name + '（' + normalized + '）') : normalized
  };
}

function getAllSystemRoleAssignments_(hrDirectory) {
  var result = {};
  var sheet = getSystemRoleAssignmentSheetReadOnly_();
  if (!sheet || sheet.getLastRow() <= 1) return result;
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, SYSTEM_ROLE_ASSIGNMENT_HEADERS.length).getDisplayValues();
  var seen = {};
  for (var i = 0; i < data.length; i++) {
    var systemId = String(data[i][0] || '').trim();
    var roleName = normalizeSystemRoleName_(data[i][2]);
    var email = normalizeEmail_(data[i][3]);
    if (!systemId || !isSystemRoleName_(roleName) || !email) continue;
    var key = getRoleAssignmentKey_(systemId, roleName, email);
    if (seen[key]) continue;
    seen[key] = true;
    if (!result[systemId]) result[systemId] = getEmptySystemRoleAssignmentMap_();
    result[systemId][roleName].push(buildSystemRolePerson_(email, hrDirectory));
  }
  return result;
}

function getSystemRoleAssignmentsForSystem_(systemId, hrDirectory) {
  var map = getAllSystemRoleAssignments_(hrDirectory);
  return map[String(systemId || '')] || getEmptySystemRoleAssignmentMap_();
}

function isEmailAssignedToSystemRoles_(systemId, email) {
  var normalized = normalizeEmail_(email);
  if (!systemId || !normalized) return false;
  var roles = getSystemRoleAssignmentsForSystem_(systemId, null);
  for (var r = 0; r < SYSTEM_ROLE_NAMES.length; r++) {
    var list = roles[SYSTEM_ROLE_NAMES[r]] || [];
    for (var i = 0; i < list.length; i++) {
      if (normalizeEmail_(list[i].email) === normalized) return true;
    }
  }
  return false;
}

function getPrimaryOwnerFromRoleAssignments_(roleAssignments) {
  roleAssignments = normalizeSystemRoleAssignments_(roleAssignments);
  var preferred = roleAssignments['系統承辦窗口'] || [];
  if (preferred.length) return preferred[0].email;
  var fallback = roleAssignments['系統部署維護人員'] || [];
  return fallback.length ? fallback[0].email : '';
}

function replaceSystemRoleAssignments_(systemId, systemName, roleAssignments, assigner) {
  var sheet = ensureSystemRoleAssignmentSheet_();
  var normalized = normalizeSystemRoleAssignments_(roleAssignments);
  var now = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy/MM/dd HH:mm:ss');
  var existingMeta = {};
  if (sheet.getLastRow() > 1) {
    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, SYSTEM_ROLE_ASSIGNMENT_HEADERS.length).getDisplayValues();
    for (var i = data.length - 1; i >= 0; i--) {
      if (String(data[i][0] || '') === String(systemId || '')) {
        var key = getRoleAssignmentKey_(data[i][0], normalizeSystemRoleName_(data[i][2]), data[i][3]);
        existingMeta[key] = {assigner: data[i][4] || '', assignedAt: data[i][5] || ''};
        sheet.deleteRow(i + 2);
      }
    }
  }
  var rows = [];
  for (var r = 0; r < SYSTEM_ROLE_NAMES.length; r++) {
    var roleName = SYSTEM_ROLE_NAMES[r];
    var people = normalized[roleName] || [];
    for (var p = 0; p < people.length; p++) {
      var email = people[p].email;
      var meta = existingMeta[getRoleAssignmentKey_(systemId, roleName, email)] || {};
      rows.push([
        systemId,
        systemName || '',
        roleName,
        email,
        meta.assigner || assigner || '',
        meta.assignedAt || now
      ]);
    }
  }
  if (rows.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, SYSTEM_ROLE_ASSIGNMENT_HEADERS.length).setValues(rows);
  }
  SpreadsheetApp.flush();
  return normalized;
}

function migrateLegacyOwnersToSystemRoles_(sysSheet) {
  sysSheet = sysSheet || SpreadsheetApp.getActiveSpreadsheet().getSheetByName('系統清冊');
  if (!sysSheet || sysSheet.getLastRow() <= 1 || sysSheet.getLastColumn() < getSystemMaxColumnNumber_()) return;
  var roleSheet = ensureSystemRoleAssignmentSheet_();
  migrateLegacySystemRoleNames_(roleSheet);
  var existing = {};
  if (roleSheet.getLastRow() > 1) {
    var roleRows = roleSheet.getRange(2, 1, roleSheet.getLastRow() - 1, SYSTEM_ROLE_ASSIGNMENT_HEADERS.length).getDisplayValues();
    for (var r = 0; r < roleRows.length; r++) {
      existing[getRoleAssignmentKey_(roleRows[r][0], normalizeSystemRoleName_(roleRows[r][2]), roleRows[r][3])] = true;
    }
  }
  var data = sysSheet.getRange(2, 1, sysSheet.getLastRow() - 1, getSystemMaxColumnNumber_()).getDisplayValues();
  var idIdx = getSystemColumnIndex_('系統ID');
  var nameIdx = getSystemColumnIndex_('系統名稱');
  var ownerIdx = getSystemColumnIndex_('系統負責人');
  var now = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy/MM/dd HH:mm:ss');
  var rows = [];
  for (var i = 0; i < data.length; i++) {
    var systemId = String(data[i][idIdx] || '').trim();
    var systemName = String(data[i][nameIdx] || '').trim();
    var ownerEmail = normalizeEmail_(data[i][ownerIdx]);
    if (!systemId || !ownerEmail) continue;
    for (var n = 0; n < SYSTEM_ROLE_NAMES.length; n++) {
      var roleName = SYSTEM_ROLE_NAMES[n];
      var key = getRoleAssignmentKey_(systemId, roleName, ownerEmail);
      if (existing[key]) continue;
      existing[key] = true;
      rows.push([systemId, systemName, roleName, ownerEmail, '系統初始化', now]);
    }
  }
  if (rows.length) {
    roleSheet.getRange(roleSheet.getLastRow() + 1, 1, rows.length, SYSTEM_ROLE_ASSIGNMENT_HEADERS.length).setValues(rows);
    SpreadsheetApp.flush();
  }
}

function migrateLegacySystemRoleNames_(roleSheet) {
  roleSheet = roleSheet || ensureSystemRoleAssignmentSheet_();
  if (!roleSheet || roleSheet.getLastRow() <= 1) return;
  var roleRange = roleSheet.getRange(2, 3, roleSheet.getLastRow() - 1, 1);
  var values = roleRange.getDisplayValues();
  var changed = false;
  for (var i = 0; i < values.length; i++) {
    var normalized = normalizeSystemRoleName_(values[i][0]);
    if (normalized !== values[i][0]) {
      values[i][0] = normalized;
      changed = true;
    }
  }
  if (changed) {
    roleRange.setValues(values);
    SpreadsheetApp.flush();
  }
}

function attachSystemRoleMetadata_(system, hrDirectory, assignmentMap) {
  system = system || {};
  var systemId = String(system['系統ID'] || '');
  var roles = assignmentMap && assignmentMap[systemId] ? assignmentMap[systemId] : getSystemRoleAssignmentsForSystem_(systemId, hrDirectory);
  var ownerEmail = normalizeEmail_(system['系統負責人']);
  var ownerInfo = hrDirectory && hrDirectory.map ? hrDirectory.map[ownerEmail] : null;
  system._roleAssignments = roles || getEmptySystemRoleAssignmentMap_();
  system._ownerDisplayName = ownerInfo && ownerInfo.name ? ownerInfo.name : (system['系統負責人'] || '');
  return system;
}

function getSystemColumns_() {
  assertSystemColumnConstantsReady_();
  return [
  {key:'系統ID', label:'系統ID', column:SYSTEM_ID_COLUMN},
  {key:'資產編號', label:'資產編號', column:SYSTEM_ASSET_NO_COLUMN},
  {key:'系統名稱', label:'系統名稱', column:SYSTEM_NAME_COLUMN},
  {key:'系統屬性', label:'系統屬性', column:SYSTEM_ATTRIBUTE_COLUMN},
  {key:'建置方式', label:'建置方式', column:SYSTEM_BUILD_METHOD_COLUMN},
  {key:'建置方式補充說明', label:'建置方式補充說明', column:SYSTEM_BUILD_METHOD_NOTE_COLUMN},
  {key:'系統管理者(部門/單位)', label:'系統管理者(部門/單位)', column:SYSTEM_MANAGER_DEPT_COLUMN},
  {key:'系統使用者(部門/單位)', label:'系統使用者(部門/單位)', column:SYSTEM_USER_DEPT_COLUMN},
  {key:'系統建置日期', label:'系統建置日期', column:SYSTEM_BUILD_DATE_COLUMN},
  {key:'主機設置於機關內', label:'主機設置於機關內', column:SYSTEM_HOST_INTERNAL_COLUMN},
  {key:'核心系統', label:'核心系統', column:SYSTEM_CORE_COLUMN},
  {key:'含機敏資訊', label:'含機敏資訊', column:SYSTEM_HAS_SENSITIVE_COLUMN},
  {key:'個資數量', label:'個資數量', column:SYSTEM_PERSONAL_DATA_COUNT_COLUMN},
  {key:'機敏資訊以非明文方式儲存', label:'機敏資訊以非明文方式儲存', column:SYSTEM_SENSITIVE_ENCRYPTED_COLUMN},
  {key:'機敏資訊類別', label:'機敏資訊類別', column:SYSTEM_SENSITIVE_CATEGORY_COLUMN},
  {key:'是否與民生權益相關', label:'是否與民生權益相關', column:SYSTEM_CIVIL_RIGHTS_COLUMN},
  {key:'防護需求等級', label:'防護需求等級', column:SYSTEM_LEVEL_COLUMN},
  {key:'是否包含於ISMS導入範圍', label:'是否包含於ISMS導入範圍', column:SYSTEM_ISMS_SCOPE_COLUMN},
  {key:'建置廠商', label:'建置廠商', column:SYSTEM_BUILDER_VENDOR_COLUMN},
  {key:'建置廠商統一編號', label:'建置廠商統一編號', column:SYSTEM_BUILDER_VENDOR_TAX_ID_COLUMN},
  {key:'維運廠商', label:'維運廠商', column:SYSTEM_MAINTENANCE_VENDOR_COLUMN},
  {key:'維運廠商統一編號', label:'維運廠商統一編號', column:SYSTEM_MAINTENANCE_VENDOR_TAX_ID_COLUMN},
  {key:'最大可容忍中斷時間', label:'最大可容忍中斷時間', column:SYSTEM_MTPD_COLUMN},
  {key:'是否符合防護基準', label:'是否符合防護基準', column:SYSTEM_COMPLIANCE_STATUS_COLUMN},
  {key:'不符合防護基準項目代碼', label:'不符合防護基準項目代碼', column:SYSTEM_NON_COMPLIANCE_CODES_COLUMN},
  {key:'系統是否對外', label:'系統是否對外', column:SYSTEM_EXTERNAL_COLUMN},
  {key:'系統日誌保存時間是否超過6個月', label:'系統日誌保存時間是否超過6個月', column:SYSTEM_LOG_RETENTION_COLUMN},
  {key:'有無開放遠端連線維護', label:'有無開放遠端連線維護', column:SYSTEM_REMOTE_MAINTENANCE_COLUMN},
  {key:'是否禁用弱密碼', label:'是否禁用弱密碼', column:SYSTEM_WEAK_PASSWORD_DISABLED_COLUMN},
  {key:'系統是否備份', label:'系統是否備份', column:SYSTEM_BACKUP_COLUMN},
  {key:'備妥流量清洗機制', label:'備妥流量清洗機制', column:SYSTEM_TRAFFIC_CLEANING_COLUMN},
  {key:'備妥CDN啟用作業程序', label:'備妥CDN啟用作業程序', column:SYSTEM_CDN_PROCEDURE_COLUMN},
  {key:'備妥靜態網頁', label:'備妥靜態網頁', column:SYSTEM_STATIC_PAGE_COLUMN},
  {key:'10分鐘內切換至靜態網頁', label:'10分鐘內切換至靜態網頁', column:SYSTEM_STATIC_PAGE_SWITCH_COLUMN},
  {key:'備註', label:'備註', column:SYSTEM_NOTE_COLUMN},
  {key:'提供之服務，是否含有人工智慧', label:'提供之服務，是否含有人工智慧', column:SYSTEM_AI_SERVICE_COLUMN},
  {key:'系統負責人', label:'系統負責人', column:SYSTEM_OWNER_COLUMN},
  {key:'系統運作部署在本地機房', label:'系統運作部署在本地機房', column:SYSTEM_LOCAL_DEPLOYMENT_COLUMN},
  {key:'復原目標時間(RTO)', label:'復原目標時間(RTO)', column:SYSTEM_RTO_COLUMN},
  {key:'資料回復點目標(RPO)', label:'資料回復點目標(RPO)', column:SYSTEM_RPO_COLUMN},
  {key:'系統描述', label:'系統描述', column:SYSTEM_DESCRIPTION_COLUMN}
  ];
}

function getSystemColumnConstantDebug_() {
  return {
    SYSTEM_ID_COLUMN: {exists: typeof SYSTEM_ID_COLUMN !== 'undefined', value: typeof SYSTEM_ID_COLUMN !== 'undefined' ? SYSTEM_ID_COLUMN : ''},
    SYSTEM_NAME_COLUMN: {exists: typeof SYSTEM_NAME_COLUMN !== 'undefined', value: typeof SYSTEM_NAME_COLUMN !== 'undefined' ? SYSTEM_NAME_COLUMN : ''},
    SYSTEM_LEVEL_COLUMN: {exists: typeof SYSTEM_LEVEL_COLUMN !== 'undefined', value: typeof SYSTEM_LEVEL_COLUMN !== 'undefined' ? SYSTEM_LEVEL_COLUMN : ''},
    SYSTEM_COMPLIANCE_STATUS_COLUMN: {exists: typeof SYSTEM_COMPLIANCE_STATUS_COLUMN !== 'undefined', value: typeof SYSTEM_COMPLIANCE_STATUS_COLUMN !== 'undefined' ? SYSTEM_COMPLIANCE_STATUS_COLUMN : ''},
    SYSTEM_NON_COMPLIANCE_CODES_COLUMN: {exists: typeof SYSTEM_NON_COMPLIANCE_CODES_COLUMN !== 'undefined', value: typeof SYSTEM_NON_COMPLIANCE_CODES_COLUMN !== 'undefined' ? SYSTEM_NON_COMPLIANCE_CODES_COLUMN : ''},
    SYSTEM_OWNER_COLUMN: {exists: typeof SYSTEM_OWNER_COLUMN !== 'undefined', value: typeof SYSTEM_OWNER_COLUMN !== 'undefined' ? SYSTEM_OWNER_COLUMN : ''},
    SYSTEM_LOCAL_DEPLOYMENT_COLUMN: {exists: typeof SYSTEM_LOCAL_DEPLOYMENT_COLUMN !== 'undefined', value: typeof SYSTEM_LOCAL_DEPLOYMENT_COLUMN !== 'undefined' ? SYSTEM_LOCAL_DEPLOYMENT_COLUMN : ''},
    SYSTEM_RTO_COLUMN: {exists: typeof SYSTEM_RTO_COLUMN !== 'undefined', value: typeof SYSTEM_RTO_COLUMN !== 'undefined' ? SYSTEM_RTO_COLUMN : ''},
    SYSTEM_RPO_COLUMN: {exists: typeof SYSTEM_RPO_COLUMN !== 'undefined', value: typeof SYSTEM_RPO_COLUMN !== 'undefined' ? SYSTEM_RPO_COLUMN : ''},
    SYSTEM_DESCRIPTION_COLUMN: {exists: typeof SYSTEM_DESCRIPTION_COLUMN !== 'undefined', value: typeof SYSTEM_DESCRIPTION_COLUMN !== 'undefined' ? SYSTEM_DESCRIPTION_COLUMN : ''}
  };
}


function assertSystemColumnConstantsReady_() {
  var debug = getSystemColumnConstantDebug_();
  var missing = [];
  for (var name in debug) {
    if (!debug.hasOwnProperty(name)) continue;
    if (!debug[name].exists || typeof debug[name].value !== 'number' || debug[name].value < 1) missing.push(name);
  }
  if (missing.length) {
    throw new Error('系統清冊欄位常數未正確載入，請確認 env.js 已同步部署：' + missing.join(', '));
  }
}

function getSystemMaxColumnNumber_() {
  var maxColumn = 0;
  getSystemColumns_().forEach(function(col) {
    if (col.column > maxColumn) maxColumn = col.column;
  });
  return maxColumn;
}

function getSystemColumnsByPosition_() {
  return getSystemColumns_().slice().sort(function(a, b) { return a.column - b.column; });
}

function getSystemHeaders_() {
  var headers = [];
  getSystemColumnsByPosition_().forEach(function(col) {
    headers[col.column - 1] = col.label;
  });
  return headers;
}

function getSystemColumnDefinition_(key) {
  var columns = getSystemColumns_();
  for (var i = 0; i < columns.length; i++) {
    if (columns[i].key === key) return columns[i];
  }
  throw new Error('找不到系統清冊欄位定義：' + key);
}

function getSystemColumnIndex_(key) {
  return getSystemColumnDefinition_(key).column - 1;
}

function getSystemColumnNumber_(key) {
  return getSystemColumnDefinition_(key).column;
}

function assertSystemSheetColumnCapacity_(sheet) {
  if (!sheet || sheet.getLastColumn() < getSystemMaxColumnNumber_()) {
    throw new Error('系統清冊欄位數不足，請先至「系統設定」重新初始化表頭後再儲存。');
  }
}

function getSystemRowValue_(row, key) {
  var idx = getSystemColumnIndex_(key);
  return row && row[idx] !== undefined ? row[idx] : '';
}

// 將建置日期儲存格的值正規化為 <input type="date"> 接受的 yyyy-MM-dd。
// getDisplayValues 受儲存格格式影響可能只剩年月，故讀取時改用 getValues 的原始值
// （Date 物件仍保留完整日期）再於此格式化，新舊資料一致。
function formatSystemBuildDateValue_(value) {
  if (value === null || value === undefined || value === '') return '';
  if (Object.prototype.toString.call(value) === '[object Date]') {
    return Utilities.formatDate(value, Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy-MM-dd');
  }
  var raw = String(value).trim();
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  var m = raw.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  if (m) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
  return raw;
}

function mapSystemRowToObject_(row, rowNum) {
  var obj = {};
  getSystemColumns_().forEach(function(col) {
    var idx = col.column - 1;
    obj[col.key] = row && row[idx] !== undefined ? row[idx] : '';
  });
  obj._row = rowNum || '';
  return obj;
}

function buildSystemRowFromData_(systemData, existingRow) {
  systemData = systemData || {};
  existingRow = existingRow || [];
  var row = [];
  for (var i = 0; i < getSystemMaxColumnNumber_(); i++) {
    row[i] = existingRow[i] !== undefined ? existingRow[i] : '';
  }
  getSystemColumns_().forEach(function(col) {
    var idx = col.column - 1;
    if (systemData[col.key] !== undefined) row[idx] = systemData[col.key];
  });
  return row;
}

function getLegacySystemValue_(source, row, key) {
  var idx = getSystemColumnIndex_(key);
  if (source && source[key] !== undefined) return source[key];
  return row && row[idx] !== undefined ? row[idx] : '';
}

function debugGetSystemData() {
  assertPageAccess_();
  var result = {
    spreadsheet: null,
    systemColumnConstants: getSystemColumnConstantDebug_(),
    systemColumnConstantsReady: false,
    systemMaxColumn: 0,
    systemSheetExists: false,
    lastRow: 0,
    lastColumn: 0,
    dataRowCount: 0,
    headers: [],
    sampleRow: [],
    sampleMapped: null,
    error: ''
  };

  try {
    assertSystemColumnConstantsReady_();
    result.systemColumnConstantsReady = true;
    result.systemMaxColumn = getSystemMaxColumnNumber_();

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      result.error = 'SpreadsheetApp.getActiveSpreadsheet() 取不到試算表，請確認 Web App 是否綁定在正確的 Google Sheet。';
      return result;
    }

    result.spreadsheet = {
      id: ss.getId(),
      name: ss.getName(),
      url: ss.getUrl()
    };

    var sheet = ss.getSheetByName('系統清冊');
    result.systemSheetExists = !!sheet;
    if (!sheet) return result;

    result.lastRow = sheet.getLastRow();
    result.lastColumn = sheet.getLastColumn();
    result.dataRowCount = Math.max(result.lastRow - 1, 0);
    if (result.lastColumn > 0) result.headers = sheet.getRange(1, 1, 1, result.lastColumn).getDisplayValues()[0];
    if (result.lastRow > 1 && result.lastColumn > 0) {
      result.sampleRow = sheet.getRange(2, 1, 1, result.lastColumn).getDisplayValues()[0];
      result.sampleMapped = mapSystemRowToObject_(result.sampleRow, 2);
    }
  } catch (err) {
    result.error = err && err.message ? err.message : String(err);
  }

  return result;
}

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
    {group:'code_map', key:'系統與資訊完整性|軟體及資訊完整性', label:'系統與資訊完整性 / 軟體及資訊完整性', type:'mapping', value:'C0703', description:'未符合代碼對照。', enabled:true, sort:270},

    {group:'doc_generation', key:'doc_template_transl_center', label:'轉譯中心評估表範本 ID (Doc)', type:'text', value:'', description:'設定用於產出分級評估表的 Google Doc 範本 ID (轉譯中心)', enabled:true, sort:10},
    {group:'doc_generation', key:'doc_template_transl_center_sheet', label:'轉譯中心評估表範本 ID (Sheet)', type:'text', value:'', description:'設定用於產出分級評估表的 Google Sheet 範本 ID (轉譯中心)', enabled:true, sort:11},
    {group:'doc_generation', key:'inventory_sheet_template', label:'資通系統清冊範本 ID (Sheet)', type:'text', value:'', description:'資通系統清冊的 Google Sheet 範本檔案 ID', enabled:true, sort:12},
    {group:'doc_generation', key:'doc_output_folder', label:'文件輸出資料夾 ID', type:'text', value:'', description:'設定產出文件的目標 Google Drive 資料夾 ID', enabled:true, sort:20}
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

function ensureDashboardSnapshotSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(DASHBOARD_SNAPSHOT_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(DASHBOARD_SNAPSHOT_SHEET);
    sheet.getRange(1, 1, 1, DASHBOARD_SNAPSHOT_HEADERS.length).setValues([DASHBOARD_SNAPSHOT_HEADERS]);
    sheet.getRange(1, 1, 1, DASHBOARD_SNAPSHOT_HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.hideSheet();
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
  var rows = [];
  if (sheet.getLastRow() > 1) {
    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, RULE_SETTINGS_HEADERS.length).getDisplayValues();
    rows = data.map(function(row) {
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

  var defaults = getDefaultRuleDefinitions_();
  var existingKeys = {};
  rows.forEach(function(r) { existingKeys[r.group + '|' + r.key] = true; });
  
  defaults.forEach(function(d) {
    if (!existingKeys[d.group + '|' + d.key]) {
      rows.push({
        group: d.group,
        key: d.key,
        label: d.label,
        type: d.type,
        value: d.value,
        description: d.description,
        enabled: d.enabled,
        sort: d.sort
      });
    }
  });

  return rows;
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
  assertPageAccess_();
  var evaluator = getCurrentEvaluator();
  var admins = getScriptPropertyEmailList_('RULE_ADMIN_EMAILS');
  var additionalOrgAdmins = getScriptPropertyEmailList_(ADDITIONAL_ORG_ADMIN_EMAILS_PROPERTY);
  var email = normalizeEmail_(evaluator.email);
  var orgDirectory = loadOrgAdminDirectory_();
  var orgAdmin = orgDirectory.map[email] || null;
  var ownerSystems = getOwnedSystemsByEmail_(email);
  var isAdmin = !!email && admins.indexOf(email) !== -1;
  var isAdditionalOrgAdmin = !!email && additionalOrgAdmins.indexOf(email) !== -1;
  var isOrgAdmin = !!orgAdmin || isAdditionalOrgAdmin;
  var isSystemOwner = ownerSystems.length > 0;
  var roleKey = 'viewer';
  var roleLabel = '一般使用者';

  if (isAdmin) {
    roleKey = 'admin';
    roleLabel = '管理者';
  } else if (isOrgAdmin) {
    roleKey = 'org_admin';
    roleLabel = orgAdmin ? (orgAdmin.orgName || '組織管理者') : '指定組長權限';
  } else if (isSystemOwner) {
    roleKey = 'system_owner';
    roleLabel = '系統角色成員';
  }

  return {
    isAdmin: isAdmin,
    isOrgAdmin: isOrgAdmin,
    isAdditionalOrgAdmin: isAdditionalOrgAdmin,
    isSystemOwner: isSystemOwner,
    roleKey: roleKey,
    roleLabel: roleLabel,
    evaluator: evaluator,
    adminEmailsConfigured: admins.length > 0,
    additionalOrgAdminEmailsConfigured: additionalOrgAdmins.length > 0,
    ownerSystemCount: ownerSystems.length,
    ownerSystemIds: ownerSystems,
    orgAdminInfo: orgAdmin,
    canCreateSystem: isAdmin || isOrgAdmin || isSystemOwner,
    canDeleteSystem: isAdmin,
    canEditAnySystem: isAdmin || isOrgAdmin,
    canAssignOwner: isAdmin || isOrgAdmin
  };
}

function assertRuleAdmin_() {
  var status = getRuleAdminStatus();
  if (!status.isAdmin) throw new Error('僅管理者可修改規則設定，請確認 Script Properties 的 RULE_ADMIN_EMAILS。');
  return status;
}

function isSystemOwnerOrAdmin_(system) {
  var status = getRuleAdminStatus();
  var email = normalizeEmail_(status.evaluator.email);
  if (!email) return false;
  if (status.isAdmin) return true;
  if (!system) return false;
  if (email === normalizeEmail_(system['系統負責人'])) return true;
  return isEmailAssignedToSystemRoles_(system['系統ID'], email);
}

function getOwnedSystemsByEmail_(email) {
  var normalized = normalizeEmail_(email);
  if (!normalized) return [];
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('系統清冊');
  if (!sheet || sheet.getLastRow() <= 1 || sheet.getLastColumn() < getSystemMaxColumnNumber_()) return [];
  var data = sheet.getDataRange().getDisplayValues();
  var idIdx = getSystemColumnIndex_('系統ID');
  var ownerIdx = getSystemColumnIndex_('系統負責人');
  var roleSystemMap = {};
  var roleSheet = getSystemRoleAssignmentSheetReadOnly_();
  if (roleSheet && roleSheet.getLastRow() > 1) {
    var roleRows = roleSheet.getRange(2, 1, roleSheet.getLastRow() - 1, SYSTEM_ROLE_ASSIGNMENT_HEADERS.length).getDisplayValues();
    for (var r = 0; r < roleRows.length; r++) {
      if (normalizeEmail_(roleRows[r][3]) === normalized && roleRows[r][0]) roleSystemMap[String(roleRows[r][0])] = true;
    }
  }
  var result = [];
  var seen = {};
  for (var i = 1; i < data.length; i++) {
    if (normalizeEmail_(data[i][ownerIdx]) === normalized && data[i][idIdx]) {
      roleSystemMap[String(data[i][idIdx])] = true;
    }
  }
  for (var systemId in roleSystemMap) {
    if (!roleSystemMap.hasOwnProperty(systemId) || seen[systemId]) continue;
    seen[systemId] = true;
    result.push(systemId);
  }
  return result;
}

function canEditSystem_(system, status) {
  status = status || getRuleAdminStatus();
  if (!system) return false;
  if (status.isAdmin || status.isOrgAdmin) return true;
  if (!status.isSystemOwner) return false;
  var email = normalizeEmail_(status.evaluator.email);
  if (email === normalizeEmail_(system['系統負責人'])) return true;
  return isEmailAssignedToSystemRoles_(system['系統ID'], email);
}

function assertCanCreateSystem_() {
  var status = getRuleAdminStatus();
  if (!status.canCreateSystem) throw new Error('目前帳號僅可檢視，無法新增系統');
  return status;
}

function assertCanDeleteSystem_() {
  var status = getRuleAdminStatus();
  if (!status.canDeleteSystem) throw new Error('僅管理者可刪除系統');
  return status;
}

function assertCanEditSystem_(systemId) {
  var status = getRuleAdminStatus();
  var system = getSystemById_(systemId);
  if (!system) throw new Error('找不到系統');
  if (!canEditSystem_(system, status)) throw new Error('目前帳號無法編輯此系統');
  return {
    status: status,
    system: system
  };
}

function assertSystemOwnerOrAdmin_(systemId) {
  var system = getSystemById_(systemId);
  if (!system) throw new Error('找不到系統');
  if (!isSystemOwnerOrAdmin_(system)) throw new Error('僅系統角色成員或管理者可更新符合性結果');
  return {
    system: system,
    evaluator: getCurrentEvaluator(),
    adminStatus: getRuleAdminStatus()
  };
}

function getRuleSettings() {
  assertPageAccess_();
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
  assertPageAccess_();
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
  var sysHeaders = getSystemHeaders_();

  ensureRuleSettingsSheet_();
  ensureRuleAuditSheet_();
  ensureDashboardSnapshotSheet_();
  migrateLegacySystemRoleNames_(ensureSystemRoleAssignmentSheet_());

  // 1. 系統清冊
  var sysSheet = ss.getSheetByName('系統清冊');
  if (!sysSheet) {
    sysSheet = ss.insertSheet('系統清冊');
    sysSheet.getRange(1, 1, 1, sysHeaders.length).setValues([sysHeaders]);
    sysSheet.getRange(1, 1, 1, sysHeaders.length).setFontWeight('bold');
    sysSheet.setFrozenRows(1);
  } else {
    var currentHeaders = sysSheet.getRange(1, 1, 1, sysSheet.getLastColumn()).getValues()[0];
    var currentData = sysSheet.getLastRow() > 1 ? sysSheet.getRange(2, 1, sysSheet.getLastRow() - 1, sysSheet.getLastColumn()).getValues() : [];
    var migratedRows = [];
    for (var rowIndex = 0; rowIndex < currentData.length; rowIndex++) {
      var source = {};
      for (var colIndex = 0; colIndex < currentHeaders.length; colIndex++) {
        source[currentHeaders[colIndex]] = currentData[rowIndex][colIndex];
      }

      var legacyAiText = String(getLegacySystemValue_(source, currentData[rowIndex], '提供之服務，是否含有人工智慧') || '').trim();
      var legacyNoteText = String(getLegacySystemValue_(source, currentData[rowIndex], '備註') || '').trim();
      var legacyLocalDeploymentText = String(source['系統運作部署在本地機房'] || '').trim();
      var legacyHostInternalText = String(getLegacySystemValue_(source, currentData[rowIndex], '主機設置於機關內') || '').trim();
      var migratedAiValue = '';
      var noteParts = [];

      if (legacyNoteText) noteParts.push(legacyNoteText);
      if (legacyAiText === '是' || legacyAiText === '否') migratedAiValue = legacyAiText;
      else if (legacyAiText) noteParts.push(legacyAiText);

      migratedRows.push(getSystemColumnsByPosition_().map(function(col) {
        if (col.key === '備註') return noteParts.join('\n');
        if (col.key === '提供之服務，是否含有人工智慧') return migratedAiValue;
        if (col.key === '系統運作部署在本地機房') return legacyLocalDeploymentText || (legacyHostInternalText === '是' ? '是' : '');
        return getLegacySystemValue_(source, currentData[rowIndex], col.key);
      }));
    }

    if (sysSheet.getLastColumn() < sysHeaders.length) {
      sysSheet.insertColumnsAfter(sysSheet.getLastColumn(), sysHeaders.length - sysSheet.getLastColumn());
    } else if (sysSheet.getLastColumn() > sysHeaders.length) {
      sysSheet.deleteColumns(sysHeaders.length + 1, sysSheet.getLastColumn() - sysHeaders.length);
    }

    sysSheet.clearContents();
    sysSheet.getRange(1, 1, 1, sysHeaders.length).setValues([sysHeaders]);
    if (migratedRows.length > 0) {
      sysSheet.getRange(2, 1, migratedRows.length, sysHeaders.length).setValues(migratedRows);
    }
    sysSheet.getRange(1, 1, 1, sysHeaders.length).setFontWeight('bold');
    sysSheet.setFrozenRows(1);
  }
  migrateLegacyOwnersToSystemRoles_(sysSheet);

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
      '矯正作為', '目標日期', '備註', '最後更新時間',
      '開發面', '開發面說明', '部署維運面', '部署維運面說明', '流程面', '流程面說明'
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
        ruleVersion: data[i][11],
        rowNum: i + 1
      });
    }
  }
  return results;
}

function getRatingDetailsReadOnly_(systemId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('防護需求分級評估明細');
  if (!sheet || sheet.getLastRow() <= 1) return [];
  var data = sheet.getDataRange().getDisplayValues();
  var results = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == systemId) {
      results.push({
        assessor: data[i][9],
        assessDate: data[i][10],
        rowNum: i + 1
      });
    }
  }
  return results;
}

function getLatestRatingDetailMeta_(detailRows, summary) {
  var latest = null;
  (detailRows || []).forEach(function(row) {
    if (!row || !row.assessor) return;
    var assessDate = String(row.assessDate || '');
    var rowNum = Number(row.rowNum || 0);
    if (!latest || assessDate > latest.assessDate || (assessDate === latest.assessDate && rowNum > latest.rowNum)) {
      latest = {
        assessor: row.assessor || '',
        assessDate: assessDate,
        rowNum: rowNum
      };
    }
  });
  if (latest) return latest;
  if (summary && (summary.assessor || summary.assessDate)) {
    return {
      assessor: summary.assessor || '',
      assessDate: summary.assessDate || '',
      rowNum: 0
    };
  }
  return {assessor: '', assessDate: '', rowNum: 0};
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
  var latestDetailMeta = getLatestRatingDetailMeta_(detailRows, summary);
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
    previousAssessor: latestDetailMeta.assessor || '',
    previousAssessDate: latestDetailMeta.assessDate || '',
    finalLevel: finalLevel,
    details: details,
    currentEvaluator: currentEvaluator
  };
}

function updateSystemLevel_(systemId, level) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sysSheet = ss.getSheetByName('系統清冊');
  if (!sysSheet || sysSheet.getLastRow() <= 1) return;
  assertSystemSheetColumnCapacity_(sysSheet);
  var sysData = sysSheet.getDataRange().getValues();
  var idCol = getSystemColumnIndex_('系統ID');
  var levelCol = getSystemColumnNumber_('防護需求等級');
  for (var i = 1; i < sysData.length; i++) {
    if (sysData[i][idCol] == systemId) {
      sysSheet.getRange(i + 1, levelCol).setValue(level);
      break;
    }
  }
}

// ===== 控制措施資料 (附表十) =====
function getControlMeasures() {
  assertPageAccess_();
  return [
    {index:1, dimension:"存取控制", category:"帳號管理", level:"普", description:"建立帳號管理機制，包含帳號之申請、建立、修改、啟用、停用及刪除之程序。", aspect:"面向：開發面＋流程面\n開發面：實作帳號 CRUD 與啟用/停用狀態\n流程面：訂定帳號申請/核准/刪除程序"},
    {index:2, dimension:"存取控制", category:"帳號管理", level:"普", description:"已逾期之臨時或緊急帳號應刪除或禁用。", aspect:"面向：開發面＋流程面\n開發面：到期欄位與自動禁用邏輯\n流程面：臨時帳號核發與清查作業"},
    {index:3, dimension:"存取控制", category:"帳號管理", level:"普", description:"資通系統閒置帳號應禁用。", aspect:"面向：開發面"},
    {index:4, dimension:"存取控制", category:"帳號管理", level:"普", description:"定期審核資通系統帳號之申請、建立、修改、啟用、停用及刪除。", aspect:"面向：開發面＋流程面\n開發面：產生帳號異動稽核日誌\n流程面：定期審核帳號異動並留記錄"},
    {index:5, dimension:"存取控制", category:"帳號管理", level:"中", description:"機關應定義各系統之閒置時間或可使用期限與資通系統之使用情況及條件。", aspect:"面向：開發面＋流程面\n開發面：實作 session timeout 設定\n流程面：機關定義閒置時間/可使用期限政策"},
    {index:6, dimension:"存取控制", category:"帳號管理", level:"中", description:"逾越機關所許可之閒置時間或可使用期限時，系統應自動將使用者登出。", aspect:"面向：開發面"},
    {index:7, dimension:"存取控制", category:"帳號管理", level:"高", description:"應依機關規定之情況及條件，使用資通系統。", aspect:"面向：開發面＋流程面\n開發面：實作條件式存取控制\n流程面：訂定系統使用情況與條件規範"},
    {index:8, dimension:"存取控制", category:"帳號管理", level:"高", description:"監控資通系統帳號，如發現帳號違常使用時，回報管理者。", aspect:"面向：開發面＋部署維運面\n開發面：實作違常偵測與告警觸發\n部署維運面：設定通報管道/監控整合"},
    {index:9, dimension:"存取控制", category:"最小權限", level:"普", description:"採最小權限原則，僅允許使用者（或代表使用者行為之程序）依機關任務及業務功能，完成指派任務所需之授權存取。", aspect:"面向：開發面"},
    {index:10, dimension:"存取控制", category:"遠端存取", level:"普", description:"對於每一種允許之遠端存取類型，均應先取得授權，建立使用限制、組態需求、連線需求及文件化。", aspect:"面向：開發面＋流程面\n開發面：管理端點存取限制\n流程面：遠端存取授權核准與文件化"},
    {index:11, dimension:"存取控制", category:"遠端存取", level:"普", description:"使用者之權限檢查作業應於伺服器端完成。", aspect:"面向：開發面"},
    {index:12, dimension:"存取控制", category:"遠端存取", level:"普", description:"應監控遠端存取機關內部網段或資通系統後臺之連線。", aspect:"面向：開發面＋部署維運面\n開發面：記錄後台存取日誌\n部署維運面：監控遠端/後台連線"},
    {index:13, dimension:"存取控制", category:"遠端存取", level:"普", description:"應採用加密機制。", aspect:"面向：開發面＋部署維運面\n開發面：程式強制 HTTPS/HSTS\n部署維運面：安裝設定 TLS 憑證"},
    {index:14, dimension:"存取控制", category:"遠端存取", level:"普", description:"遠端存取之來源應為機關已預先定義及管理之存取控制點。", aspect:"面向：開發面＋部署維運面\n開發面：實作來源檢查\n部署維運面：設定 IP allowlist/跳板/閘道"},
    {index:15, dimension:"事件日誌與可歸責性", category:"記錄事件", level:"普", description:"訂定日誌之記錄時間週期及留存政策，並保留日誌至少六個月。", aspect:"面向：部署維運面＋流程面\n部署維運面：設定日誌留存/輪替與容量\n流程面：訂定日誌留存政策（≥6 個月）"},
    {index:16, dimension:"事件日誌與可歸責性", category:"記錄事件", level:"普", description:"確保資通系統有記錄特定事件之功能，並決定應記錄之特定資通系統事件。", aspect:"面向：開發面＋流程面\n開發面：應用程式產生事件日誌\n流程面：決定應記錄之特定事件"},
    {index:17, dimension:"事件日誌與可歸責性", category:"記錄事件", level:"普", description:"應記錄資通系統管理者帳號所執行之各項功能。", aspect:"面向：開發面"},
    {index:18, dimension:"事件日誌與可歸責性", category:"記錄事件", level:"中", description:"應定期審查機關所保留資通系統產生之日誌。", aspect:"面向：開發面＋流程面\n開發面：提供日誌彙整/查詢介面\n流程面：定期審查日誌並留記錄"},
    {index:19, dimension:"事件日誌與可歸責性", category:"日誌紀錄內容", level:"普", description:"資通系統產生之日誌應包含事件類型、發生時間、發生位置及任何與事件相關之使用者身分識別等資訊，採用單一日誌機制，確保輸出格式之一致性。", aspect:"面向：開發面"},
    {index:20, dimension:"事件日誌與可歸責性", category:"日誌儲存容量", level:"普", description:"依據日誌儲存需求，配置所需之儲存容量。", aspect:"面向：部署維運面"},
    {index:21, dimension:"事件日誌與可歸責性", category:"日誌處理失效之回應", level:"普", description:"資通系統於日誌處理失效時，應採取適當之行動。", aspect:"面向：開發面"},
    {index:22, dimension:"事件日誌與可歸責性", category:"日誌處理失效之回應", level:"高", description:"機關規定需要即時通報之日誌處理失效事件發生時，資通系統應於機關規定之時效內，對特定人員提出警告。", aspect:"面向：開發面＋部署維運面\n開發面：偵測日誌處理失效並觸發警告\n部署維運面：設定即時通報管道與時效"},
    {index:23, dimension:"事件日誌與可歸責性", category:"時戳及校時", level:"普", description:"資通系統應使用系統內部時鐘產生日誌所需時戳，並可以對應到世界協調時間（UTC）或格林威治標準時間（GMT）。", aspect:"面向：開發面"},
    {index:24, dimension:"事件日誌與可歸責性", category:"時戳及校時", level:"普", description:"系統內部時鐘應定期與基準時間源進行同步。", aspect:"面向：部署維運面"},
    {index:25, dimension:"事件日誌與可歸責性", category:"日誌資訊之保護", level:"普", description:"對日誌之存取管理，僅限於有權限之使用者。", aspect:"面向：開發面＋部署維運面\n開發面：日誌查詢介面授權控管\n部署維運面：日誌檔案系統權限設定"},
    {index:26, dimension:"事件日誌與可歸責性", category:"日誌資訊之保護", level:"中", description:"應運用雜湊或其他適當方式之完整性確保機制。", aspect:"面向：開發面＋部署維運面\n開發面：日誌雜湊/簽章機制\n部署維運面：WORM/不可竄改儲存設定"},
    {index:27, dimension:"事件日誌與可歸責性", category:"日誌資訊之保護", level:"高", description:"定期備份日誌至原系統外之其他實體系統。", aspect:"面向：部署維運面"},
    {index:28, dimension:"營運持續計畫", category:"資料備份", level:"普", description:"訂定資料可容忍損失之時間要求。", aspect:"面向：流程面"},
    {index:29, dimension:"營運持續計畫", category:"資料備份", level:"普", description:"執行資料備份。", aspect:"面向：部署維運面"},
    {index:30, dimension:"營運持續計畫", category:"資料備份", level:"中", description:"應定期測試備份資料，以驗證備份媒體之可靠性及資訊之完整性。", aspect:"面向：流程面＋部署維運面\n流程面：訂定備份測試頻率/政策\n部署維運面：定期執行備份測試"},
    {index:31, dimension:"營運持續計畫", category:"資料備份", level:"高", description:"應將備份還原，作為營運持續計畫演練之一部分。", aspect:"面向：流程面＋部署維運面\n流程面：制定演練計劃\n部署維運面：執行演練與備份還原"},
    {index:32, dimension:"營運持續計畫", category:"資料備份", level:"高", description:"應建立資料異地備份機制。", aspect:"面向：部署維運面"},
    {index:33, dimension:"營運持續計畫", category:"系統備援", level:"普", description:"訂定資通系統從中斷後至重新恢復服務之最大可容忍中斷時間要求。", aspect:"面向：流程面"},
    {index:34, dimension:"營運持續計畫", category:"系統備援", level:"中", description:"應定期測試原服務中斷時，於最大可容忍中斷時間內，由備援設備或其他方式取代並提供服務。", aspect:"面向：部署維運面＋流程面\n部署維運面：健康檢查/failover/多副本設定、定期執行備援測試\n流程面：留存測試記錄"},
    {index:35, dimension:"營運持續計畫", category:"系統備援", level:"高", description:"應將備援啟動作為營運持續計畫演練之一部分。", aspect:"面向：流程面"},
    {index:36, dimension:"識別與鑑別", category:"使用者之識別與鑑別", level:"普", description:"資通系統應識別及鑑別使用者，並禁止使用者使用共用帳號。", aspect:"面向：開發面"},
    {index:37, dimension:"識別與鑑別", category:"使用者之識別與鑑別", level:"高", description:"對資通系統之存取採取多因子鑑別技術。", aspect:"面向：開發面"},
    {index:38, dimension:"識別與鑑別", category:"身分驗證管理", level:"普", description:"使用預設密碼初次登入系統時，應於登入後立即變更。", aspect:"面向：開發面"},
    {index:39, dimension:"識別與鑑別", category:"身分驗證管理", level:"普", description:"身分驗證相關資訊不以明文傳輸。", aspect:"面向：開發面＋部署維運面\n開發面：程式強制 HTTPS、不以明文/GET 傳憑證\n部署維運面：TLS 憑證安裝設定"},
    {index:40, dimension:"識別與鑑別", category:"身分驗證管理", level:"普", description:"具備帳戶鎖定機制，帳號登入進行身分驗證失敗達五次後，至少十五分鐘內不允許該帳號繼續嘗試登入或使用機關自建之失敗驗證機制。", aspect:"面向：開發面"},
    {index:41, dimension:"識別與鑑別", category:"身分驗證管理", level:"普", description:"使用密碼進行驗證時，應強制最低密碼複雜度；依機關密碼效期規定變更密碼。", aspect:"面向：開發面"},
    {index:42, dimension:"識別與鑑別", category:"身分驗證管理", level:"普", description:"密碼變更時，至少不可以與前三次使用過之密碼相同。", aspect:"面向：開發面"},
    {index:43, dimension:"識別與鑑別", category:"身分驗證管理", level:"普", description:"第四點及第五點所定措施，對外部使用者，機關得自行規範辦理。", aspect:"面向：流程面\n流程面：第四點、第五點（即項次41 密碼複雜度與效期、42 密碼不可與前三次相同）對外部使用者得由機關自行規範辦理"},
    {index:44, dimension:"識別與鑑別", category:"身分驗證管理", level:"中", description:"身分驗證機制應防範自動化程式之登入或密碼更換嘗試。", aspect:"面向：開發面"},
    {index:45, dimension:"識別與鑑別", category:"身分驗證管理", level:"中", description:"密碼重設機制對使用者重新身分確認後，發送一次性及具有時效性符記。", aspect:"面向：開發面"},
    {index:46, dimension:"識別與鑑別", category:"鑑別資訊保護", level:"普", description:"資通系統應遮蔽鑑別過程中之資訊。", aspect:"面向：開發面"},
    {index:47, dimension:"識別與鑑別", category:"鑑別資訊保護", level:"中", description:"資通系統如以密碼進行鑑別時，該密碼應經雜湊或其他適當方式處理後儲存。", aspect:"面向：開發面"},
    {index:48, dimension:"系統與服務獲得", category:"系統發展生命週期需求階段", level:"普", description:"針對系統安全需求（含機密性、可用性、完整性）進行確認。", aspect:"面向：流程面＋開發面\n流程面：確認並記錄系統安全需求\n開發面：以需求/設計文件或實作佐證"},
    {index:49, dimension:"系統與服務獲得", category:"系統發展生命週期設計階段", level:"中", description:"根據系統功能與要求，識別可能影響系統之威脅，進行風險分析及評估。", aspect:"面向：流程面"},
    {index:50, dimension:"系統與服務獲得", category:"系統發展生命週期設計階段", level:"中", description:"將風險評估結果回饋需求階段之檢核項目，並提出安全需求修正。", aspect:"面向：流程面"},
    {index:51, dimension:"系統與服務獲得", category:"系統發展生命週期開發階段", level:"普", description:"應針對安全需求實作必要控制措施。", aspect:"面向：開發面"},
    {index:52, dimension:"系統與服務獲得", category:"系統發展生命週期開發階段", level:"普", description:"應注意避免軟體常見漏洞及實作必要控制措施。", aspect:"面向：開發面"},
    {index:53, dimension:"系統與服務獲得", category:"系統發展生命週期開發階段", level:"普", description:"發生錯誤時，使用者頁面僅顯示簡短錯誤訊息及代碼，不包含詳細之錯誤訊息。", aspect:"面向：開發面＋部署維運面\n開發面：自訂簡短錯誤頁\n部署維運面：正式環境關閉 debug"},
    {index:54, dimension:"系統與服務獲得", category:"系統發展生命週期開發階段", level:"高", description:"執行「源碼掃描」安全檢測。", aspect:"面向：部署維運面＋開發面\n部署維運面：CI 整合 SAST 源碼掃描\n開發面：執行並追蹤掃描結果"},
    {index:55, dimension:"系統與服務獲得", category:"系統發展生命週期開發階段", level:"高", description:"系統應具備發生嚴重錯誤時之通知機制。", aspect:"面向：開發面＋部署維運面\n開發面：捕捉嚴重錯誤並觸發通知\n部署維運面：整合告警/監控服務"},
    {index:56, dimension:"系統與服務獲得", category:"系統發展生命週期測試階段", level:"普", description:"執行「弱點掃描」安全檢測。", aspect:"面向：部署維運面＋開發面\n部署維運面：CI 整合弱點/相依掃描\n開發面：定期執行並追蹤修補"},
    {index:57, dimension:"系統與服務獲得", category:"系統發展生命週期測試階段", level:"高", description:"執行「滲透測試」安全檢測。", aspect:"面向：流程面"},
    {index:58, dimension:"系統與服務獲得", category:"系統發展生命週期部署與維運階段", level:"普", description:"於部署環境中應針對相關資通安全威脅，進行更新與修補。", aspect:"面向：開發面＋部署維運面\n開發面：定期修補與驗證\n部署維運面：相依/環境自動更新設定、協助確認"},
    {index:59, dimension:"系統與服務獲得", category:"系統發展生命週期部署與維運階段", level:"普", description:"識別並關閉不必要服務及埠口。", aspect:"面向：部署維運面"},
    {index:60, dimension:"系統與服務獲得", category:"系統發展生命週期部署與維運階段", level:"普", description:"資通系統不使用預設密碼。", aspect:"面向：開發面＋部署維運面\n開發面：不在碼中寫死預設密碼、改讀環境變數\n部署維運面：部署時設定強式憑證"},
    {index:61, dimension:"系統與服務獲得", category:"系統發展生命週期部署與維運階段", level:"普", description:"執行系統源碼備份。", aspect:"面向：部署維運面"},
    {index:62, dimension:"系統與服務獲得", category:"系統發展生命週期部署與維運階段", level:"中", description:"於系統發展生命週期之維運階段，應執行版本控制與變更管理。", aspect:"面向：開發面＋部署維運面\n開發面：變更管理與 PR 審查程序\n部署維運面：版本控制系統（git）"},
    {index:63, dimension:"系統與服務獲得", category:"系統發展生命週期委外階段", level:"普", description:"資通系統開發如委外辦理，應將系統發展生命週期各階段依等級將安全需求（含機密性、可用性、完整性）納入委外契約。", aspect:"面向：流程面"},
    {index:64, dimension:"系統與服務獲得", category:"獲得程序", level:"普", description:"識別資通系統使用之第三方軟體、服務、函式庫或其他元件。", aspect:"面向：開發面"},
    {index:65, dimension:"系統與服務獲得", category:"獲得程序", level:"中", description:"開發、測試及正式作業環境應為區隔。", aspect:"面向：開發面＋部署維運面\n開發面：多環境設定/環境變數切換\n部署維運面：實際分離開發/測試/正式部署"},
    {index:66, dimension:"系統與服務獲得", category:"系統文件", level:"普", description:"應儲存與管理系統發展生命週期之相關文件。", aspect:"面向：開發面＋部署維運面＋流程面\n開發面：系統從無到有的安全設計與程式碼品質管控之文件\n部署維運面：上線後組態設定、環境防護及資料可用性之文件\n流程面：定義政策、權責並進行監督量測之文件"},
    {index:67, dimension:"系統與通訊保護", category:"傳輸之機密性與完整性", level:"高", description:"資通系統應採用加密機制，以防止未授權之資訊揭露或偵測資訊之變更。", aspect:"面向：開發面＋部署維運面\n開發面：程式強制全站 HTTPS/HSTS\n部署維運面：TLS 憑證與伺服器加密設定"},
    {index:68, dimension:"系統與通訊保護", category:"傳輸之機密性與完整性", level:"高", description:"使用公開、國際機構驗證且未遭破解之演算法。", aspect:"面向：開發面"},
    {index:69, dimension:"系統與通訊保護", category:"傳輸之機密性與完整性", level:"高", description:"加密金鑰或憑證應定期更換。", aspect:"面向：部署維運面"},
    {index:70, dimension:"系統與通訊保護", category:"傳輸之機密性與完整性", level:"高", description:"伺服器端之金鑰保管應訂定管理規範及實施應有之安全防護措施。", aspect:"面向：開發面＋部署維運面\n開發面：碼中不寫死金鑰、改讀環境變數/KMS\n部署維運面：KMS/Secret Manager 與金鑰保管規範"},
    {index:71, dimension:"系統與通訊保護", category:"資料儲存之安全", level:"高", description:"資通系統重要組態設定檔案及其他具保護需求之資訊應加密或以其他適當方式儲存。", aspect:"面向：開發面＋部署維運面\n開發面：敏感資料/欄位加密實作\n部署維運面：設定檔/密鑰加密儲存"},
    {index:72, dimension:"系統與資訊完整性", category:"漏洞修復", level:"普", description:"系統之漏洞修復應測試有效性及潛在影響，並定期更新。", aspect:"面向：部署維運面＋流程面\n部署維運面：相依更新/CI 測試自動化\n流程面：定期修復並驗證有效性"},
    {index:73, dimension:"系統與資訊完整性", category:"漏洞修復", level:"中", description:"定期確認資通系統相關漏洞修復之狀態。", aspect:"面向：部署維運面＋流程面\n部署維運面：持續弱點掃描整合\n流程面：定期確認修復狀態"},
    {index:74, dimension:"系統與資訊完整性", category:"資通系統監控", level:"普", description:"發現資通系統有被入侵跡象時，應通報機關特定人員。", aspect:"面向：開發面＋部署維運面\n開發面：偵測入侵跡象並觸發告警\n部署維運面：設定通報對象與管道"},
    {index:75, dimension:"系統與資訊完整性", category:"資通系統監控", level:"中", description:"監控資通系統，以偵測攻擊與未授權之連線，並識別資通系統之未授權使用。", aspect:"面向：部署維運面＋開發面\n部署維運面：IDS/WAF/異常監控部署\n開發面：存取監控/記錄"},
    {index:76, dimension:"系統與資訊完整性", category:"資通系統監控", level:"高", description:"資通系統應採用自動化工具監控進出之通信流量，並於發現不尋常或未授權之活動時，針對該事件進行分析。", aspect:"面向：部署維運面"},
    {index:77, dimension:"系統與資訊完整性", category:"軟體及資訊完整性", level:"普", description:"使用者輸入資料合法性檢查應置放於應用系統伺服器端。", aspect:"面向：開發面"},
    {index:78, dimension:"系統與資訊完整性", category:"軟體及資訊完整性", level:"中", description:"使用完整性驗證工具，以偵測未授權變更特定軟體及資訊。", aspect:"面向：部署維運面＋開發面\n部署維運面：部署檔案完整性監控工具\n開發面：完整性校驗實作"},
    {index:79, dimension:"系統與資訊完整性", category:"軟體及資訊完整性", level:"中", description:"發現違反完整性時，資通系統應實施機關指定之安全保護措施。", aspect:"面向：開發面"},
    {index:80, dimension:"系統與資訊完整性", category:"軟體及資訊完整性", level:"高", description:"應定期執行軟體與資訊完整性檢查。", aspect:"面向：部署維運面\n部署維運面：完整性檢查排程/簽章驗證設定、定期執行並留記錄"}
  ];
}

// ===== 系統清冊 CRUD =====
function getAssessmentIssueCounts(systemIds) {
  assertPageAccess_();
  systemIds = Array.isArray(systemIds) ? systemIds : [];
  var wanted = {};
  var result = {};
  for (var i = 0; i < systemIds.length; i++) {
    var id = String(systemIds[i] || '').trim();
    if (!id || wanted[id]) continue;
    wanted[id] = true;
    result[id] = 0;
  }
  if (Object.keys(wanted).length === 0) return result;

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var assessSheet = ss.getSheetByName('防護基準自評');
  if (!assessSheet || assessSheet.getLastRow() <= 1) return result;

  var data = assessSheet.getRange(2, 1, assessSheet.getLastRow() - 1, 8).getDisplayValues();
  for (var r = 0; r < data.length; r++) {
    var systemId = String(data[r][0] || '').trim();
    if (!wanted[systemId]) continue;
    var compliance = String(data[r][7] || '').trim();
    if (compliance === '部分符合' || isAssessmentNonCompliant_(compliance)) result[systemId]++;
  }
  return result;
}

function getSystems() {
  assertPageAccess_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('系統清冊');
  if (!sheet) return [];

  // Use display values so Apps Script does not try to serialize Date objects
  // back to the browser as part of the response payload.
  assertSystemSheetColumnCapacity_(sheet);
  var data = sheet.getDataRange().getDisplayValues();
  if (data.length <= 1) return [];

  // 建置日期改讀原始值（Date 物件保留完整日期），避免 getDisplayValues 受儲存格格式截成年月。
  var buildDateVals = sheet.getRange(2, SYSTEM_BUILD_DATE_COLUMN, data.length - 1, 1).getValues();

  var hrDirectory = loadHrDirectory_();
  var roleAssignmentMap = getAllSystemRoleAssignments_(hrDirectory);
  var systems = [];
  for (var i = 1; i < data.length; i++) {
    if (!getSystemRowValue_(data[i], '系統ID') && !getSystemRowValue_(data[i], '系統名稱')) continue;
    var obj = mapSystemRowToObject_(data[i], i + 1);
    obj['系統建置日期'] = formatSystemBuildDateValue_(buildDateVals[i - 1][0]);
    var level = String(obj['防護需求等級'] || '').trim();
    var needsAssessment = !!level && level !== '套裝軟體' && !isPackageExempt_(obj);
    attachSystemRoleMetadata_(obj, hrDirectory, roleAssignmentMap);
    obj._needsAssessment = needsAssessment;
    obj._showAssessmentInitWarning = false;
    obj._row = i + 1;
    systems.push(obj);
  }
  return systems;
}

function addSystem(systemData) {
  var status = assertCanCreateSystem_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('系統清冊');
  if (!sheet) { initializeSheetsCore_(); sheet = ss.getSheetByName('系統清冊'); }

  assertSystemSheetColumnCapacity_(sheet);
  var id = 'SYS_' + new Date().getTime();
  var requestedOwner = systemData['系統負責人'] || '';
  var requestedRoles = systemData._roleAssignments || {};
  var isLocalDeployment = String(systemData['系統運作部署在本地機房'] || '').trim() === '是';
  systemData['系統ID'] = id;
  if (!status.canAssignOwner) {
    requestedRoles = {
      '系統承辦窗口': [{email: status.evaluator.email || ''}],
      '系統部署維護人員': isLocalDeployment ? [{email: status.evaluator.email || ''}] : []
    };
  } else if (!getPrimaryOwnerFromRoleAssignments_(requestedRoles) && requestedOwner) {
    requestedRoles = {
      '系統承辦窗口': [{email: requestedOwner}],
      '系統部署維護人員': isLocalDeployment ? [{email: requestedOwner}] : []
    };
  }
  systemData['系統負責人'] = getPrimaryOwnerFromRoleAssignments_(requestedRoles);

  var row = buildSystemRowFromData_(systemData, []);
  sheet.appendRow(row);
  SpreadsheetApp.flush();
  var targetRow = sheet.getLastRow();
  var persisted = mapSystemRowToObject_(row, targetRow);
  var assigner = status.evaluator.displayName || status.evaluator.email || '';
  replaceSystemRoleAssignments_(id, persisted['系統名稱'] || '', requestedRoles, assigner);
  attachSystemRoleMetadata_(persisted, loadHrDirectory_(), null);
  return {
    success: true,
    id: id,
    system: persisted,
    persistedOwner: persisted['系統負責人'] || '',
    canAssignOwner: status.canAssignOwner,
    ownerChangeIgnored: !status.canAssignOwner && normalizeEmail_(requestedOwner) !== normalizeEmail_(persisted['系統負責人']),
    message: !status.canAssignOwner ? '目前帳號不可指定系統角色，已自動指派目前帳號。' : ''
  };
}

function updateSystem(rowNum, systemData) {
  var systemId = systemData ? systemData['系統ID'] : '';
  var auth = assertCanEditSystem_(systemId);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('系統清冊');
  assertSystemSheetColumnCapacity_(sheet);
  var targetRow = auth.system && auth.system._row ? auth.system._row : rowNum;
  var requestedOwner = systemData['系統負責人'] || '';
  var requestedRoles = systemData._roleAssignments;
  if (!auth.status.canAssignOwner) {
    systemData['系統負責人'] = auth.system['系統負責人'] || '';
    requestedRoles = getSystemRoleAssignmentsForSystem_(systemId, null);
  } else {
    if (!requestedRoles) requestedRoles = getSystemRoleAssignmentsForSystem_(systemId, null);
    systemData['系統負責人'] = getPrimaryOwnerFromRoleAssignments_(requestedRoles);
  }

  var existingRow = sheet.getRange(targetRow, 1, 1, getSystemMaxColumnNumber_()).getDisplayValues()[0];
  var row = buildSystemRowFromData_(systemData, existingRow);
  sheet.getRange(targetRow, 1, 1, row.length).setValues([row]);
  SpreadsheetApp.flush();
  var persisted = mapSystemRowToObject_(row, targetRow);
  if (auth.status.canAssignOwner) {
    var assigner = auth.status.evaluator.displayName || auth.status.evaluator.email || '';
    replaceSystemRoleAssignments_(systemId, persisted['系統名稱'] || '', requestedRoles, assigner);
  }
  attachSystemRoleMetadata_(persisted, loadHrDirectory_(), null);
  return {
    success: true,
    system: persisted,
    persistedOwner: persisted['系統負責人'] || '',
    canAssignOwner: auth.status.canAssignOwner,
    ownerChangeIgnored: !auth.status.canAssignOwner && normalizeEmail_(requestedOwner) !== normalizeEmail_(persisted['系統負責人']),
    message: !auth.status.canAssignOwner ? '目前帳號不可變更系統角色，已保留原值。' : ''
  };
}

// ===== 防護需求分級評估 =====
function saveRating(ratingData) {
  assertCanEditSystem_(ratingData.systemId);
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
    previousAssessDate: assessDate,
    previousAssessor: assessor,
    currentEvaluator: evaluator
  };
}

function getRating(systemId) {
  assertPageAccess_();
  return buildRatingPayload_(systemId);
}

function getRatingHistoryMeta(systemId) {
  assertPageAccess_();
  var summary = getSummaryRatingRow_(systemId);
  var detailRows = getRatingDetailsReadOnly_(systemId);
  var latestDetailMeta = getLatestRatingDetailMeta_(detailRows, summary);
  return {
    systemId: systemId,
    previousAssessor: latestDetailMeta.assessor || '',
    previousAssessDate: latestDetailMeta.assessDate || '',
    finalLevel: summary ? (summary.finalLevel || '') : ''
  };
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
  var levelChanges = {'2':true,'3':true,'4':true,'5':true,'6':true,'9':true,'12':true,'13':true,'14':true,'24':true,'33':true,'77':true};
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

function getControlMeasureExampleMap_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('控制措施基準');
  var map = {};
  if (!sheet || sheet.getLastRow() <= 1) return map;

  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 9).getDisplayValues();
  for (var i = 0; i < data.length; i++) {
    var index = String(data[i][0] || '').trim();
    if (!index) continue;
    map[index] = {
      currentStatus: data[i][6] || '',
      evidence: data[i][7] || '',
      plainCurrentStatus: data[i][8] || ''
    };
  }
  return map;
}

// 取得各項次的預設面向（由 seed 提供），key 為項次字串
function getControlMeasureAspectMap_() {
  var map = {};
  getControlMeasures().forEach(function(c) {
    map[String(c.index)] = c.aspect || '';
  });
  return map;
}

// 將面向字串（如 "面向：開發面＋流程面\n開發面：…\n流程面：…"）解析為 6 欄展開值。
// 回傳 [devChecked, devDesc, opsChecked, opsDesc, procChecked, procDesc]
function parseAspectToExpandedColumns_(aspectText) {
  var text = String(aspectText || '');
  var devChecked = '', devDesc = '', opsChecked = '', opsDesc = '', procChecked = '', procDesc = '';
  if (!text) return [devChecked, devDesc, opsChecked, opsDesc, procChecked, procDesc];

  var lines = text.split(/\r?\n/);
  var selected = [];
  var details = {};
  lines.forEach(function(line) {
    var trimmed = line.replace(/^\s+|\s+$/g, '');
    if (!trimmed) return;
    var m = trimmed.match(/^面向[：:](.*)$/);
    if (m) {
      m[1].split(/[＋+]/).forEach(function(name) {
        var n = name.replace(/^\s+|\s+$/g, '');
        if (n) selected.push(n);
      });
      return;
    }
    var dm = trimmed.match(/^([^：:]+)[：:](.*)$/);
    if (dm) {
      var key = dm[1].replace(/^\s+|\s+$/g, '');
      details[key] = dm[2].replace(/^\s+|\s+$/g, '');
    }
  });

  if (selected.indexOf('開發面') !== -1) devChecked = 'V';
  devDesc = details['開發面'] || '';
  if (selected.indexOf('部署維運面') !== -1) opsChecked = 'V';
  opsDesc = details['部署維運面'] || '';
  if (selected.indexOf('流程面') !== -1) procChecked = 'V';
  procDesc = details['流程面'] || '';

  return [devChecked, devDesc, opsChecked, opsDesc, procChecked, procDesc];
}

// 將 6 欄展開值還原為前端相容的面向字串。
// 引數：devChecked, devDesc, opsChecked, opsDesc, procChecked, procDesc
function expandedColumnsToAspectText_(devChecked, devDesc, opsChecked, opsDesc, procChecked, procDesc) {
  var ASPECT_OPTIONS = ['開發面', '部署維運面', '流程面'];
  var checkedMap = {'開發面': devChecked === 'V', '部署維運面': opsChecked === 'V', '流程面': procChecked === 'V'};
  var detailMap = {'開發面': devDesc || '', '部署維運面': opsDesc || '', '流程面': procDesc || ''};

  var selOrdered = ASPECT_OPTIONS.filter(function(a) { return checkedMap[a]; });
  var lines = [];
  if (selOrdered.length) lines.push('面向：' + selOrdered.join('＋'));
  ASPECT_OPTIONS.forEach(function(a) {
    var detail = String(detailMap[a] || '').replace(/^\s+|\s+$/g, '');
    if (detail) lines.push(a + '：' + detail);
  });
  return lines.join('\n');
}

// 確保「防護基準自評」表使用展開的 6 欄面向格式。
// 若偵測到舊版單一「面向」欄，自動遷移為展開格式。
function ensureAssessmentExpandedColumns_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('防護基準自評');
  if (!sheet) return;
  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) return;
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

  // 檢查是否已為新版展開格式（第 15 欄為「開發面」）
  if (headers.length >= 20 && String(headers[14]).trim() === '開發面') return;

  // 尋找舊版「面向」欄位置
  var aspectCol = -1;
  for (var c = 0; c < headers.length; c++) {
    if (String(headers[c]).trim() === '面向') { aspectCol = c + 1; break; }
  }

  if (aspectCol === -1) {
    // 既無舊版也無新版 → 直接補上 6 個新欄位標頭
    var startCol = lastCol + 1;
    var newHeaders = ['開發面', '開發面說明', '部署維運面', '部署維運面說明', '流程面', '流程面說明'];
    sheet.getRange(1, startCol, 1, 6).setValues([newHeaders]);
    SpreadsheetApp.flush();
    return;
  }

  // 舊版「面向」欄存在 → 執行遷移
  migrateAspectColumnToExpanded_(sheet, aspectCol);
}

// 內部遷移：將舊版單一「面向」欄拆解為 6 欄展開格式。
function migrateAspectColumnToExpanded_(sheet, aspectCol) {
  var lastRow = sheet.getLastRow();

  // 讀取舊面向資料
  var aspectData = [];
  if (lastRow >= 2) {
    aspectData = sheet.getRange(2, aspectCol, lastRow - 1, 1).getDisplayValues();
  }

  // 在「面向」欄之後插入 5 個新欄位（面向欄本身會變成「開發面」）
  sheet.insertColumnsAfter(aspectCol, 5);

  // 設定新標頭
  var newHeaders = ['開發面', '開發面說明', '部署維運面', '部署維運面說明', '流程面', '流程面說明'];
  sheet.getRange(1, aspectCol, 1, 6).setValues([newHeaders]);

  // 逐列解析舊文字並寫入展開欄位
  if (aspectData.length > 0) {
    var expandedRows = aspectData.map(function(row) {
      return parseAspectToExpandedColumns_(row[0]);
    });
    sheet.getRange(2, aspectCol, expandedRows.length, 6).setValues(expandedRows);
  }

  SpreadsheetApp.flush();
}

// 對外公開的遷移函式：可從 Apps Script 編輯器手動執行。
// 掃描「防護基準自評」表，若為舊版單一「面向」欄格式，自動遷移為 6 欄展開格式。
function migrateAssessmentAspectColumns() {
  assertRuleAdmin_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('防護基準自評');
  if (!sheet) return '找不到「防護基準自評」工作表';

  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) return '工作表無資料';
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

  // 已為新版格式
  if (headers.length >= 20 && String(headers[14]).trim() === '開發面') {
    return '已為展開格式，無需遷移';
  }

  // 尋找舊版「面向」欄
  var aspectCol = -1;
  for (var c = 0; c < headers.length; c++) {
    if (String(headers[c]).trim() === '面向') { aspectCol = c + 1; break; }
  }
  if (aspectCol === -1) return '找不到舊版「面向」欄，無法遷移';

  migrateAspectColumnToExpanded_(sheet, aspectCol);
  return '遷移完成：已將第 ' + aspectCol + ' 欄的面向資料展開為 6 個欄位';
}

function getAssessment(systemId) {
  assertPageAccess_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('防護基準自評');
  if (!sheet) return [];
  ensureAssessmentExpandedColumns_();

  var exampleMap = getControlMeasureExampleMap_();
  var data = sheet.getDataRange().getDisplayValues();
  var results = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == systemId) {
      var meta = getAssessmentCompareChangeMeta_(data[i][2]);
      var examples = exampleMap[String(data[i][2] || '').trim()] || {};
      // 從 6 欄展開格式組裝前端相容的 aspect 字串
      var aspect = expandedColumnsToAspectText_(
        data[i][14] || '', data[i][15] || '',
        data[i][16] || '', data[i][17] || '',
        data[i][18] || '', data[i][19] || ''
      );
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
        aspect: aspect,
        devChecked: data[i][14] || '',
        devDesc: data[i][15] || '',
        opsChecked: data[i][16] || '',
        opsDesc: data[i][17] || '',
        procChecked: data[i][18] || '',
        procDesc: data[i][19] || '',
        compareChangeType: meta.compareChangeType,
        compareChangeLabel: meta.compareChangeLabel,
        compareChangeColor: meta.compareChangeColor,
        exampleCurrentStatus: examples.currentStatus || '',
        exampleEvidence: examples.evidence || '',
        examplePlainCurrentStatus: examples.plainCurrentStatus || '',
        _row: i + 1
      });
    }
  }
  return results;
}

function isAssessmentNonCompliant_(compliance) {
  return compliance === '未符合' || compliance === '不符合';
}

function isAssessmentNa_(item, sysLevel) {
  var naLabel = getAssessmentApplicabilityConfig_().naLabel;
  if (!item) return false;
  if (item.compliance === naLabel) return true;
  return !isAssessmentControlApplicable_(item.level, sysLevel);
}

function saveAssessmentItem_(item) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('防護基準自評');
  if (!sheet) { initializeSheetsCore_(); sheet = ss.getSheetByName('防護基準自評'); }
  ensureAssessmentExpandedColumns_();

  // 將前端傳來的 aspect 字串拆解為 6 欄展開值
  var expanded = parseAspectToExpandedColumns_(item.aspect || '');

  var row = [
    item.systemId, item.systemName, item.index, item.dimension,
    item.category, item.level, item.description, item.compliance || '',
    item.currentStatus || '', item.evidence || '', item.corrective || '',
    item.targetDate || '', item.note || '',
    new Date().toLocaleString('zh-TW'),
    expanded[0], expanded[1], expanded[2], expanded[3], expanded[4], expanded[5]
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

function saveAssessmentItem(item) {
  assertCanEditSystem_(item.systemId);
  return saveAssessmentItem_(item);
}

function initAssessmentForSystem(systemId, systemName, systemLevel) {
  assertCanEditSystem_(systemId);
  var controls = getControlMeasures();
  var existing = getAssessment(systemId);
  var existingIndexes = existing.map(function(e) { return e.index; });
  var appRule = getAssessmentApplicabilityConfig_();
  var count = 0;

  controls.forEach(function(ctrl) {
    if (existingIndexes.indexOf(ctrl.index) === -1) {
      var applicable = isAssessmentControlApplicable_(ctrl.level, systemLevel);
      saveAssessmentItem_({
        systemId: systemId,
        systemName: systemName,
        index: ctrl.index,
        dimension: ctrl.dimension,
        category: ctrl.category,
        level: ctrl.level,
        description: ctrl.description,
        compliance: applicable ? '不符合' : appRule.naLabel,
        currentStatus: '',
        evidence: '',
        corrective: '',
        targetDate: '',
        note: applicable ? '' : appRule.naNote,
        aspect: ctrl.aspect || ''
      });
      count++;
    }
  });

  return {success: true, added: count};
}

// ===== 統計 =====
function getSystemStats(systemId) {
  assertPageAccess_();
  var assessment = getAssessment(systemId);
  if (assessment.length === 0) return null;

  var sys = getSystems().filter(function(s) { return s['系統ID'] == systemId; })[0];
  var sysLevel = sys ? (sys['防護需求等級'] || '') : '';
  var stats = {total: 0, compliant: 0, partial: 0, nonCompliant: 0, na: 0, pending: 0};
  assessment.forEach(function(a) {
    stats.total++;
    if (isAssessmentNa_(a, sysLevel)) stats.na++;
    else if (a.compliance === '符合') stats.compliant++;
    else if (a.compliance === '部分符合') stats.partial++;
    else if (isAssessmentNonCompliant_(a.compliance)) stats.nonCompliant++;
    else stats.pending++;
  });
  return stats;
}

// ===== 全域儀表板統計 =====
function getGlobalDashboard() {
  assertPageAccess_();
  return buildGlobalDashboardPayload_();
}

function buildGlobalDashboardPayload_() {
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
      var isNa = isAssessmentNa_(item, sysLevel);
      var isApplicable = !isNa && isAssessmentControlApplicable_(item.level, sysLevel);
      if (!dimStats[item.dimension]) dimStats[item.dimension] = {ok:0, fail:0, pending:0, na:0, total:0};
      dimStats[item.dimension].total++;
      if (isNa) {
        stats.na++;
        dimStats[item.dimension].na++;
        return;
      }

      stats.applicable++;
      if (item.compliance === '符合') {
        stats.compliant++;
        dimStats[item.dimension].ok++;
      }
      else if (item.compliance === '部分符合') { stats.partial++; collectFailCode(item, codeMap, failCodes); }
      else if (isAssessmentNonCompliant_(item.compliance)) { stats.nonCompliant++; collectFailCode(item, codeMap, failCodes); }
      else {
        stats.pending++;
        dimStats[item.dimension].pending++;
      }

      if (isAssessmentNonCompliant_(item.compliance) || item.compliance === '部分符合') dimStats[item.dimension].fail++;
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
  assertPageAccess_();
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

function computeComplianceResult_(systemId) {
  var assessment = getAssessment(systemId);
  var sys = getSystemById_(systemId);
  if (!sys) return {codes: [], codeString: '', status: '', systemId: systemId, systemName: ''};

  var codeMap = getCodeMap();
  var failCodes = [];
  var applicableItems = [];
  var sysLevel = sys['防護需求等級'] || '';

  assessment.forEach(function(item) {
    if (isAssessmentNa_(item, sysLevel)) return;
    if (isAssessmentControlApplicable_(item.level, sysLevel)) applicableItems.push(item);
    if (isAssessmentControlApplicable_(item.level, sysLevel) && (isAssessmentNonCompliant_(item.compliance) || item.compliance === '部分符合')) {
      collectFailCode(item, codeMap, failCodes);
    }
  });

  failCodes.sort();
  var status = failCodes.length === 0 ? '符合' : '部分符合';
  var allFail = applicableItems.length > 0 && applicableItems.every(function(a) {
    return isAssessmentNonCompliant_(a.compliance) || !a.compliance;
  });
  if (allFail) status = '不符合';

  var evaluator = getCurrentEvaluator();
  var calculatedAt = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy/MM/dd HH:mm:ss');
  return {
    systemId: systemId,
    systemName: sys['系統名稱'] || '',
    status: status,
    codes: failCodes,
    codeString: failCodes.join('/'),
    calculatedAt: calculatedAt,
    calculatedBy: evaluator.displayName || evaluator.email || '',
    calculatedByEmail: evaluator.email || ''
  };
}

function recalculateSystemCompliance(systemId) {
  var auth = assertSystemOwnerOrAdmin_(systemId);
  var result = computeComplianceResult_(systemId);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sysSheet = ss.getSheetByName('系統清冊');
  if (!sysSheet || !auth.system || !auth.system._row) throw new Error('找不到系統清冊資料列');

  assertSystemSheetColumnCapacity_(sysSheet);
  sysSheet.getRange(auth.system._row, getSystemColumnNumber_('不符合防護基準項目代碼')).setValue(result.codeString || '');
  sysSheet.getRange(auth.system._row, getSystemColumnNumber_('是否符合防護基準')).setValue(result.status || '');
  SpreadsheetApp.flush();
  return result;
}

function getNonComplianceCodes(systemId) {
  assertPageAccess_();
  var result = computeComplianceResult_(systemId);
  return {codes: result.codes || [], codeString: result.codeString || '', status: result.status || ''};
}

function buildDashboardSnapshotKey_() {
  var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyyMMddHHmmss');
  var uuid = Utilities.getUuid ? Utilities.getUuid().slice(0, 8) : String(new Date().getTime());
  return 'dash_' + stamp + '_' + uuid;
}

function parseDashboardSnapshotRow_(row) {
  var payload = [];
  try {
    payload = row[4] ? JSON.parse(row[4]) : [];
  } catch (e) {
    payload = [];
  }
  return {
    hasSnapshot: true,
    snapshotKey: row[0] || 'main',
    updatedAt: row[1] || '',
    updatedBy: row[2] || '',
    updatedByEmail: row[3] || '',
    systemCount: Array.isArray(payload) ? payload.length : 0,
    data: Array.isArray(payload) ? payload : []
  };
}

function getDashboardSnapshotRows_() {
  var sheet = ensureDashboardSnapshotSheet_();
  if (sheet.getLastRow() <= 1) return [];
  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, DASHBOARD_SNAPSHOT_HEADERS.length).getDisplayValues();
  var snapshots = [];
  for (var i = 0; i < values.length; i++) {
    if (!values[i][0] && !values[i][4]) continue;
    snapshots.push(parseDashboardSnapshotRow_(values[i]));
  }
  snapshots.sort(function(a, b) {
    return String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''));
  });
  return snapshots;
}

function toDashboardSnapshotMeta_(snapshot) {
  return {
    snapshotKey: snapshot.snapshotKey || '',
    updatedAt: snapshot.updatedAt || '',
    updatedBy: snapshot.updatedBy || '',
    updatedByEmail: snapshot.updatedByEmail || '',
    systemCount: snapshot.systemCount || 0
  };
}

function upsertDashboardSnapshot_(payload, evaluator) {
  var sheet = ensureDashboardSnapshotSheet_();
  var updatedAt = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy/MM/dd HH:mm:ss');
  var row = [
    buildDashboardSnapshotKey_(),
    updatedAt,
    evaluator && (evaluator.displayName || evaluator.email) ? (evaluator.displayName || evaluator.email) : '',
    evaluator && evaluator.email ? evaluator.email : '',
    JSON.stringify(payload || [])
  ];
  sheet.appendRow(row);
  SpreadsheetApp.flush();
  return {
    hasSnapshot: true,
    snapshotKey: row[0],
    updatedAt: row[1],
    updatedBy: row[2],
    updatedByEmail: row[3],
    systemCount: Array.isArray(payload) ? payload.length : 0,
    data: payload || []
  };
}

function getDashboardSnapshot() {
  assertPageAccess_();
  var snapshots = getDashboardSnapshotRows_();
  if (snapshots.length) return snapshots[0];
  return {hasSnapshot: false, data: []};
}

function getDashboardSnapshots() {
  assertPageAccess_();
  var snapshots = getDashboardSnapshotRows_();
  if (!snapshots.length) return {hasSnapshot: false, snapshots: [], selectedSnapshot: null};
  return {
    hasSnapshot: true,
    snapshots: snapshots.map(toDashboardSnapshotMeta_),
    selectedSnapshot: snapshots[0]
  };
}

function getDashboardSnapshotByKey(snapshotKey) {
  assertPageAccess_();
  var target = String(snapshotKey || '');
  var snapshots = getDashboardSnapshotRows_();
  for (var i = 0; i < snapshots.length; i++) {
    if (String(snapshots[i].snapshotKey || '') === target) return snapshots[i];
  }
  return {hasSnapshot: false, data: [], message: '找不到指定的儀表板快照'};
}

function rebuildDashboardSnapshot() {
  assertRuleAdmin_();
  var evaluator = getCurrentEvaluator();
  var payload = buildGlobalDashboardPayload_();
  return upsertDashboardSnapshot_(payload, evaluator);
}

// ===== 批次儲存自評 =====
function batchSaveAssessment(items) {
  assertPageAccess_();
  var checked = {};
  (items || []).forEach(function(item) {
    var systemId = String(item && item.systemId || '');
    if (!systemId || checked[systemId]) return;
    checked[systemId] = true;
    assertCanEditSystem_(systemId);
  });
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('防護基準自評');
  if (!sheet) { initializeSheetsCore_(); sheet = ss.getSheetByName('防護基準自評'); }
  ensureAssessmentExpandedColumns_();

  var data = sheet.getDataRange().getValues();
  var now = new Date().toLocaleString('zh-TW');
  var updated = 0;

  items.forEach(function(item) {
    var expanded = parseAspectToExpandedColumns_(item.aspect || '');
    var row = [
      item.systemId, item.systemName, item.index, item.dimension,
      item.category, item.level, item.description, item.compliance || '',
      item.currentStatus || '', item.evidence || '', item.corrective || '',
      item.targetDate || '', item.note || '', now,
      expanded[0], expanded[1], expanded[2], expanded[3], expanded[4], expanded[5]
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

// ===== 匯入自評報告 =====
var ASSESSMENT_IMPORT_CACHE_PREFIX = 'assessment_import_';
var ASSESSMENT_IMPORT_TTL_SECONDS = 600;
var ASSESSMENT_IMPORT_MAX_BYTES = 5 * 1024 * 1024;
var ASSESSMENT_IMPORT_CACHE_CHUNK_SIZE = 85000;
var ASSESSMENT_IMPORT_EDITABLE_FIELDS = [
  {key:'compliance', label:'符合性'},
  {key:'currentStatus', label:'現況說明'},
  {key:'evidence', label:'佐證資料'},
  {key:'corrective', label:'矯正作為'},
  {key:'targetDate', label:'目標日期'},
  {key:'note', label:'備註'}
];

function putAssessmentImportCache_(token, payload) {
  var cache = CacheService.getScriptCache();
  var text = JSON.stringify(payload);
  var chunks = [];
  for (var i = 0; i < text.length; i += ASSESSMENT_IMPORT_CACHE_CHUNK_SIZE) {
    chunks.push(text.substring(i, i + ASSESSMENT_IMPORT_CACHE_CHUNK_SIZE));
  }
  cache.put(ASSESSMENT_IMPORT_CACHE_PREFIX + token + '_meta', JSON.stringify({chunks:chunks.length}), ASSESSMENT_IMPORT_TTL_SECONDS);
  for (var c = 0; c < chunks.length; c++) {
    cache.put(ASSESSMENT_IMPORT_CACHE_PREFIX + token + '_' + c, chunks[c], ASSESSMENT_IMPORT_TTL_SECONDS);
  }
}

function getAssessmentImportCache_(token) {
  var cache = CacheService.getScriptCache();
  var metaText = cache.get(ASSESSMENT_IMPORT_CACHE_PREFIX + token + '_meta');
  if (!metaText) return null;
  var meta = JSON.parse(metaText);
  var text = '';
  for (var i = 0; i < meta.chunks; i++) {
    var part = cache.get(ASSESSMENT_IMPORT_CACHE_PREFIX + token + '_' + i);
    if (part === null) return null;
    text += part;
  }
  return JSON.parse(text);
}

function parseCsvRows_(text) {
  var src = String(text || '').replace(/^\ufeff/, '');
  var rows = [];
  var row = [];
  var cell = '';
  var inQuotes = false;
  for (var i = 0; i < src.length; i++) {
    var ch = src.charAt(i);
    if (inQuotes) {
      if (ch === '"') {
        if (src.charAt(i + 1) === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (ch === '\r') {
      if (src.charAt(i + 1) === '\n') continue;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  row.push(cell);
  rows.push(row);
  return rows;
}

function getXmlText_(files, name) {
  for (var i = 0; i < files.length; i++) {
    if (files[i].getName() === name) return files[i].getDataAsString('UTF-8');
  }
  return '';
}

function getXmlChildrenByName_(node, name) {
  var list = [];
  var children = node ? node.getChildren() : [];
  for (var i = 0; i < children.length; i++) {
    if (children[i].getName() === name) list.push(children[i]);
  }
  return list;
}

function getXmlChildText_(node, name) {
  var child = node ? node.getChild(name, node.getNamespace()) : null;
  return child ? child.getText() : '';
}

function columnNameToIndex_(ref) {
  var letters = String(ref || '').replace(/[^A-Z]/gi, '').toUpperCase();
  var idx = 0;
  for (var i = 0; i < letters.length; i++) idx = idx * 26 + letters.charCodeAt(i) - 64;
  return idx - 1;
}

function parseXlsxSharedStrings_(xmlText) {
  if (!xmlText) return [];
  var root = XmlService.parse(xmlText).getRootElement();
  var items = getXmlChildrenByName_(root, 'si');
  var strings = [];
  for (var i = 0; i < items.length; i++) {
    var textParts = [];
    var direct = items[i].getChild('t', items[i].getNamespace());
    if (direct) {
      textParts.push(direct.getText());
    } else {
      var runs = getXmlChildrenByName_(items[i], 'r');
      for (var j = 0; j < runs.length; j++) {
        var t = runs[j].getChild('t', runs[j].getNamespace());
        if (t) textParts.push(t.getText());
      }
    }
    strings.push(textParts.join(''));
  }
  return strings;
}

function parseXlsxRows_(blob) {
  // XLSX 本質上是 ZIP 封裝（OOXML/OPC）。Utilities.unzip() 只接受 ContentType 為
  // application/zip 的 blob，而前端上傳帶的是瀏覽器 MIME
  // （application/vnd.openxmlformats-officedocument.spreadsheetml.sheet），
  // 故先複製並覆寫 ContentType 再解壓，避免「以下引數無效：ContentType」錯誤。
  var zipBlob = blob.copyBlob().setContentType('application/zip');
  var files = Utilities.unzip(zipBlob);
  var sharedStrings = parseXlsxSharedStrings_(getXmlText_(files, 'xl/sharedStrings.xml'));
  var sheetXml = '';
  for (var i = 0; i < files.length; i++) {
    var name = files[i].getName();
    if (/^xl\/worksheets\/sheet\d+\.xml$/.test(name)) {
      sheetXml = files[i].getDataAsString('UTF-8');
      break;
    }
  }
  if (!sheetXml) throw new Error('找不到 XLSX 工作表內容');

  var root = XmlService.parse(sheetXml).getRootElement();
  var sheetData = root.getChild('sheetData', root.getNamespace());
  var rowNodes = getXmlChildrenByName_(sheetData, 'row');
  var rows = [];
  for (var r = 0; r < rowNodes.length; r++) {
    var cells = getXmlChildrenByName_(rowNodes[r], 'c');
    var row = [];
    for (var c = 0; c < cells.length; c++) {
      var cell = cells[c];
      var refAttr = cell.getAttribute('r');
      var colIndex = columnNameToIndex_(refAttr ? refAttr.getValue() : '');
      if (colIndex < 0) colIndex = row.length;
      var typeAttr = cell.getAttribute('t');
      var type = typeAttr ? typeAttr.getValue() : '';
      var value = '';
      if (type === 's') {
        var sidx = parseInt(getXmlChildText_(cell, 'v'), 10);
        value = sharedStrings[sidx] || '';
      } else if (type === 'inlineStr') {
        var inline = cell.getChild('is', cell.getNamespace());
        value = inline ? getXmlChildText_(inline, 't') : '';
      } else {
        value = getXmlChildText_(cell, 'v');
      }
      row[colIndex] = value;
    }
    rows.push(row);
  }
  return rows;
}

function parseAssessmentImportRows_(filePayload) {
  if (!filePayload || !filePayload.base64) throw new Error('請選擇要匯入的檔案');
  var fileName = String(filePayload.fileName || '').toLowerCase();
  var bytes = Utilities.base64Decode(filePayload.base64);
  if (bytes.length > ASSESSMENT_IMPORT_MAX_BYTES) throw new Error('匯入檔案過大，請使用 5MB 以下的 CSV 或 XLSX');
  var mimeType = String(filePayload.mimeType || '');
  var blob = Utilities.newBlob(bytes, mimeType || 'application/octet-stream', filePayload.fileName || 'assessment-import');
  if (/\.xlsx$/.test(fileName) || mimeType.indexOf('spreadsheetml.sheet') !== -1) return parseXlsxRows_(blob);
  if (/\.csv$/.test(fileName) || mimeType.indexOf('csv') !== -1 || mimeType.indexOf('text/plain') !== -1) {
    return parseCsvRows_(blob.getDataAsString('UTF-8'));
  }
  throw new Error('目前僅支援匯入 CSV 或 XLSX 檔案');
}

function findAssessmentImportHeader_(rows) {
  var required = {'項次':true,'符合性':true,'現況說明':true,'佐證資料':true,'矯正作為':true,'目標日期':true,'備註':true};
  for (var i = 0; i < rows.length; i++) {
    var map = {};
    var hits = 0;
    for (var c = 0; c < rows[i].length; c++) {
      var label = String(rows[i][c] || '').trim();
      if (required[label] && map[label] === undefined) {
        map[label] = c;
        hits++;
      }
    }
    if (map['項次'] !== undefined && hits >= 4) return {rowIndex:i, columnMap:map};
  }
  return null;
}

function normalizeImportCompliance_(value, naLabel) {
  var raw = String(value || '').trim();
  if (!raw) return '';
  if (raw === '未符合') return '不符合';
  var allowed = {'符合':true,'部分符合':true,'不符合':true};
  allowed[naLabel] = true;
  if (allowed[raw]) return raw;
  return null;
}

// 項次為數字識別碼；XLSX 經 Google Sheets 匯出往返後整數字串可能變成 "1.0"，
// 而現況自評的項次來自 getDisplayValues 為 "1"，精確字串比對會全數對不上。
// 故將可解析為數字者正規化為標準數字字串（"1.0" / " 1 " / "01" → "1"），
// 非數字（如「不符合防護基準」摘要列）保持原樣。
function normalizeAssessmentIndexKey_(value) {
  var raw = String(value === null || value === undefined ? '' : value).trim();
  if (!raw) return '';
  if (/^-?\d+(\.\d+)?$/.test(raw)) {
    var num = Number(raw);
    if (!isNaN(num) && isFinite(num)) return String(num);
  }
  return raw;
}

function buildAssessmentImportPreview_(systemId, filePayload) {
  var sys = getSystems().filter(function(s) { return s['系統ID'] == systemId; })[0];
  if (!sys) throw new Error('找不到系統');
  var assessment = getAssessment(systemId);
  if (!assessment.length) throw new Error('此系統尚無自評資料，請先初始化自評項目');

  var rows = parseAssessmentImportRows_(filePayload);
  var header = findAssessmentImportHeader_(rows);
  if (!header) throw new Error('找不到可匯入的自評欄位，請使用本系統匯出的 CSV 或 XLSX 檔案');

  var currentMap = {};
  for (var i = 0; i < assessment.length; i++) currentMap[normalizeAssessmentIndexKey_(assessment[i].index)] = assessment[i];

  var naLabel = getAssessmentApplicabilityConfig_().naLabel;
  var sysLevel = sys['防護需求等級'] || '';
  var changes = [];
  var warnings = [];
  var errors = [];
  var unchangedCount = 0;
  var skippedCount = 0;
  var totalRows = 0;
  var seen = {};
  var col = header.columnMap;

  for (var r = header.rowIndex + 1; r < rows.length; r++) {
    var row = rows[r] || [];
    var index = normalizeAssessmentIndexKey_(row[col['項次']]);
    if (!index) continue;
    if (index.indexOf('不符合防護基準') !== -1) continue;
    totalRows++;
    if (seen[index]) {
      warnings.push({row:r + 1, index:index, message:'重複項次已略過'});
      skippedCount++;
      continue;
    }
    seen[index] = true;
    var current = currentMap[index];
    if (!current) {
      errors.push({row:r + 1, index:index, message:'此項次不存在於目前系統的自評項目'});
      continue;
    }
    if (isAssessmentNa_(current, sysLevel)) {
      warnings.push({row:r + 1, index:index, message:'此項目不適用於目前防護需求等級，已略過'});
      skippedCount++;
      continue;
    }

    var imported = {};
    for (var f = 0; f < ASSESSMENT_IMPORT_EDITABLE_FIELDS.length; f++) {
      var field = ASSESSMENT_IMPORT_EDITABLE_FIELDS[f];
      var cellIndex = col[field.label];
      imported[field.key] = cellIndex === undefined ? '' : String(row[cellIndex] || '').trim();
    }
    var normalizedCompliance = normalizeImportCompliance_(imported.compliance, naLabel);
    if (normalizedCompliance === null) {
      errors.push({row:r + 1, index:index, message:'符合性只能為符合、部分符合、不符合或' + naLabel});
      continue;
    }
    imported.compliance = normalizedCompliance;

    var changedFields = [];
    for (var cf = 0; cf < ASSESSMENT_IMPORT_EDITABLE_FIELDS.length; cf++) {
      var editable = ASSESSMENT_IMPORT_EDITABLE_FIELDS[cf];
      var oldValue = String(current[editable.key] || '').trim();
      var newValue = String(imported[editable.key] || '').trim();
      if (oldValue !== newValue) {
        changedFields.push({
          key: editable.key,
          label: editable.label,
          newValue: newValue
        });
      }
    }
    if (!changedFields.length) {
      unchangedCount++;
      continue;
    }
    changes.push({
      index: index,
      dimension: current.dimension || '',
      category: current.category || '',
      description: current.description || '',
      fields: changedFields
    });
  }

  return {
    systemId: systemId,
    fileName: filePayload.fileName || '',
    totalRows: totalRows,
    updateCount: changes.length,
    unchangedCount: unchangedCount,
    skippedCount: skippedCount,
    errorCount: errors.length,
    warningCount: warnings.length,
    canApply: changes.length > 0 && errors.length === 0,
    changes: changes,
    warnings: warnings,
    errors: errors
  };
}

function previewAssessmentImport(systemId, filePayload) {
  assertCanEditSystem_(systemId);
  var preview = buildAssessmentImportPreview_(systemId, filePayload);
  var token = Utilities.getUuid();
  var cacheChanges = preview.changes.map(function(change) {
    return {
      index: change.index,
      fields: change.fields.map(function(field) {
        return {key:field.key, newValue:field.newValue};
      })
    };
  });
  var cachePayload = {
    systemId: preview.systemId,
    changes: cacheChanges,
    errorCount: preview.errorCount,
    warningCount: preview.warningCount,
    errors: preview.errors
  };
  putAssessmentImportCache_(token, cachePayload);
  preview.success = true;
  preview.importToken = token;
  preview.previewChanges = preview.changes.slice(0, 30);
  delete preview.changes;
  return preview;
}

function applyAssessmentImport(systemId, importToken) {
  assertCanEditSystem_(systemId);
  var preview = getAssessmentImportCache_(String(importToken || ''));
  if (!preview) return {success:false, message:'匯入預覽已逾時，請重新選擇檔案檢查'};
  if (preview.systemId != systemId) return {success:false, message:'匯入資料與目前系統不一致'};
  if (preview.errors && preview.errors.length) return {success:false, message:'匯入內容仍有錯誤，請修正後重新檢查'};
  if (!preview.changes || !preview.changes.length) return {success:false, message:'沒有可套用的變更'};

  var assessment = getAssessment(systemId);
  var currentMap = {};
  for (var i = 0; i < assessment.length; i++) currentMap[normalizeAssessmentIndexKey_(assessment[i].index)] = assessment[i];
  var updates = [];
  for (var c = 0; c < preview.changes.length; c++) {
    var change = preview.changes[c];
    var item = currentMap[normalizeAssessmentIndexKey_(change.index)];
    if (!item) continue;
    for (var f = 0; f < change.fields.length; f++) {
      item[change.fields[f].key] = change.fields[f].newValue;
    }
    updates.push(item);
  }
  var result = batchSaveAssessment(updates);
  return {
    success: true,
    updated: result.updated || updates.length,
    warningCount: preview.warningCount || 0
  };
}

// ===== 匯出自評報告 =====
function buildAssessmentReportPayload_(systemId) {
  var sys = getSystems().filter(function(s) { return s['系統ID'] == systemId; })[0];
  if (!sys) return {success: false, message: '找不到系統'};

  var assessment = getAssessment(systemId);
  if (assessment.length === 0) return {success: false, message: '尚無自評資料'};

  var headers = ['構面','類別','項次','最低要求等級','安全控制措施','符合性','現況說明','佐證資料','矯正作為','目標日期','備註','開發面','開發面說明','部署維運面','部署維運面說明','流程面','流程面說明'];
  var rows = assessment.map(function(item) {
    var expanded = parseAspectToExpandedColumns_(item.aspect || '');
    var devChecked = item.devChecked !== undefined ? item.devChecked : expanded[0];
    var devDesc = item.devDesc !== undefined ? item.devDesc : expanded[1];
    var opsChecked = item.opsChecked !== undefined ? item.opsChecked : expanded[2];
    var opsDesc = item.opsDesc !== undefined ? item.opsDesc : expanded[3];
    var procChecked = item.procChecked !== undefined ? item.procChecked : expanded[4];
    var procDesc = item.procDesc !== undefined ? item.procDesc : expanded[5];
    return [item.dimension, item.category, item.index, item.level, item.description,
      item.compliance || '', item.currentStatus || '', item.evidence || '',
      item.corrective || '', item.targetDate || '', item.note || '',
      devChecked, devDesc, opsChecked, opsDesc, procChecked, procDesc];
  });

  return {
    success: true,
    system: sys,
    assessment: assessment,
    headers: headers,
    rows: rows,
    title: '資通系統防護基準檢核表（依據附表十修正規定）',
    agencyName: '人體生物資料庫',
    checkDate: Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy/MM/dd'),
    nonComplianceCodes: sys['不符合防護基準項目代碼'] || '無（全部符合）'
  };
}

function populateAssessmentReportSheet_(ws, report) {
  var sys = report.system;
  var rows = report.rows;
  var headers = report.headers;
  var assessment = report.assessment;

  var colCount = headers.length;
  ws.getRange('A1').setValue('資通系統防護基準檢核表（依據附表十修正規定）');
  ws.getRange(1, 1, 1, colCount).merge().setFontSize(14).setFontWeight('bold').setHorizontalAlignment('center');

  ws.getRange('A2').setValue('機關單位名稱'); ws.getRange('B2').setValue(report.agencyName);
  ws.getRange('D2').setValue('檢核日期'); ws.getRange('E2').setValue(report.checkDate);
  ws.getRange('A3').setValue('資通系統名稱'); ws.getRange('B3').setValue(sys['系統名稱']);
  ws.getRange('D3').setValue('安全等級'); ws.getRange('E3').setValue(sys['防護需求等級']);
  ws.getRange('A2:A3').setFontWeight('bold');
  ws.getRange('D2:D3').setFontWeight('bold');

  ws.getRange(5, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold').setBackground('#4472C4').setFontColor('#FFFFFF');
  ws.setFrozenRows(5);

  if (rows.length > 0) {
    ws.getRange(6, 1, rows.length, colCount).setValues(rows);
  }

  // Formatting（欄序：構面/類別/項次/等級/安全控制措施/符合性/現況說明/佐證資料/矯正作為/目標日期/備註/開發面/開發面說明/部署維運面/部署維運面說明/流程面/流程面說明）
  ws.setColumnWidth(1, 100); ws.setColumnWidth(2, 130); ws.setColumnWidth(3, 40);
  ws.setColumnWidth(4, 60); ws.setColumnWidth(5, 350);
  ws.setColumnWidth(6, 60); ws.setColumnWidth(7, 250); ws.setColumnWidth(8, 150); // 符合性, 現況說明, 佐證資料
  ws.setColumnWidth(9, 150); ws.setColumnWidth(10, 80); ws.setColumnWidth(11, 80); // 矯正作為, 目標日期, 備註
  ws.setColumnWidth(12, 60); ws.setColumnWidth(13, 180); // 開發面, 開發面說明
  ws.setColumnWidth(14, 80); ws.setColumnWidth(15, 180); // 部署維運面, 部署維運面說明
  ws.setColumnWidth(16, 60); ws.setColumnWidth(17, 180); // 流程面, 流程面說明

  // Color applicable/not-applicable rows
  for (var i = 0; i < assessment.length; i++) {
    var r = i + 6;
    var meta = getAssessmentCompareChangeMeta_(assessment[i].index);
    var applicable = isAssessmentControlApplicable_(assessment[i].level, sys['防護需求等級']);
    if (meta.compareChangeColor) {
      ws.getRange(r, 1, 1, colCount).setBackground(meta.compareChangeColor);
      if (!applicable) ws.getRange(r, 1, 1, colCount).setFontColor('#7A7A7A');
      else ws.getRange(r, 1, 1, colCount).setFontColor('#000000');
    } else if (applicable) {
      ws.getRange(r, 1, 1, colCount).setBackground('#FFFFFF').setFontColor('#000000');
    } else {
      ws.getRange(r, 1, 1, colCount).setBackground('#F2F2F2').setFontColor('#999999');
    }
    ws.getRange(r, 1, 1, colCount).setBorder(true,true,true,true,true,true);
  }

  // Non-compliance summary at bottom
  var summaryRow = 6 + rows.length + 2;
  ws.getRange(summaryRow, 1).setValue('不符合防護基準項目代碼：');
  ws.getRange(summaryRow, 1).setFontWeight('bold');
  ws.getRange(summaryRow, 3).setValue(report.nonComplianceCodes);
}

function getAssessmentReportFileName_(systemName, extension) {
  var base = String(systemName || '未命名系統').replace(/[\\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim();
  if (!base) base = '未命名系統';
  if (base.length > 48) base = base.substring(0, 48);
  var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyyMMdd_HHmm');
  return '防護基準自評_' + base + '_' + stamp + '.' + extension;
}

function escapeCsvCell_(value) {
  var text = String(value === null || value === undefined ? '' : value);
  if (/[",\r\n]/.test(text)) text = '"' + text.replace(/"/g, '""') + '"';
  return text;
}

function buildAssessmentReportCsv_(report) {
  var csvRows = [
    [report.title],
    [],
    ['機關單位名稱', report.agencyName, '', '檢核日期', report.checkDate],
    ['資通系統名稱', report.system['系統名稱'] || '', '', '安全等級', report.system['防護需求等級'] || ''],
    [],
    report.headers
  ];
  report.rows.forEach(function(row) { csvRows.push(row); });
  csvRows.push([]);
  csvRows.push(['不符合防護基準項目代碼：', '', report.nonComplianceCodes]);
  return '\ufeff' + csvRows.map(function(row) {
    return row.map(escapeCsvCell_).join(',');
  }).join('\r\n');
}

function exportSpreadsheetAsXlsxBlob_(spreadsheetId, fileName) {
  var exportMimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  var url = 'https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(spreadsheetId) +
    '/export?mimeType=' + encodeURIComponent(exportMimeType);
  var response = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: {
      Authorization: 'Bearer ' + ScriptApp.getOAuthToken()
    },
    muteHttpExceptions: true
  });
  var code = response.getResponseCode();
  if (code < 200 || code >= 300) {
    var body = response.getContentText() || '';
    var message = body;
    try {
      var parsed = JSON.parse(body);
      if (parsed && parsed.error && parsed.error.message) message = parsed.error.message;
    } catch (err) {
      // Keep the raw response text when Drive does not return JSON.
    }
    throw new Error('Drive API 匯出 XLSX 失敗（HTTP ' + code + '）：' + message);
  }
  return response.getBlob().setName(fileName);
}

function exportAssessmentFile(systemId, format) {
  assertPageAccess_();
  var fileFormat = String(format || '').toLowerCase();
  if (fileFormat !== 'csv' && fileFormat !== 'xlsx') return {success: false, message: '不支援的匯出格式'};

  var report = buildAssessmentReportPayload_(systemId);
  if (!report.success) return report;

  if (fileFormat === 'csv') {
    var csvName = getAssessmentReportFileName_(report.system['系統名稱'], 'csv');
    var csvBlob = Utilities.newBlob(buildAssessmentReportCsv_(report), 'text/csv;charset=utf-8', csvName);
    return {
      success: true,
      fileName: csvName,
      mimeType: 'text/csv;charset=utf-8',
      base64: Utilities.base64Encode(csvBlob.getBytes())
    };
  }

  var tempSpreadsheet = SpreadsheetApp.create(getAssessmentReportFileName_(report.system['系統名稱'], 'xlsx').replace(/\.xlsx$/, ''));
  var tempFile = DriveApp.getFileById(tempSpreadsheet.getId());
  try {
    var ws = tempSpreadsheet.getSheets()[0];
    ws.setName('自評報告');
    populateAssessmentReportSheet_(ws, report);
    SpreadsheetApp.flush();
    var xlsxName = getAssessmentReportFileName_(report.system['系統名稱'], 'xlsx');
    var xlsxBlob = exportSpreadsheetAsXlsxBlob_(tempSpreadsheet.getId(), xlsxName);
    return {
      success: true,
      fileName: xlsxName,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      base64: Utilities.base64Encode(xlsxBlob.getBytes())
    };
  } finally {
    tempFile.setTrashed(true);
  }
}

function exportAssessmentReport(systemId) {
  assertPageAccess_();
  var report = buildAssessmentReportPayload_(systemId);
  if (!report.success) return report;

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = '自評報告_' + (report.system['系統名稱'] || '').substring(0, 15);
  var existing = ss.getSheetByName(sheetName);
  if (existing) ss.deleteSheet(existing);

  var ws = ss.insertSheet(sheetName);
  populateAssessmentReportSheet_(ws, report);

  return {success: true, sheetName: sheetName};
}

// ===== 刪除系統 =====
function deleteSystem(systemId) {
  assertCanDeleteSystem_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('系統清冊');
  if (!sheet) return {success: false};

  assertSystemSheetColumnCapacity_(sheet);
  var data = sheet.getDataRange().getValues();
  var idCol = getSystemColumnIndex_('系統ID');
  for (var i = data.length - 1; i >= 1; i--) {
    if (data[i][idCol] == systemId) {
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

  var roleSheet = getSystemRoleAssignmentSheetReadOnly_();
  if (roleSheet) {
    var roleData = roleSheet.getDataRange().getValues();
    for (var m = roleData.length - 1; m >= 1; m--) {
      if (roleData[m][0] == systemId) roleSheet.deleteRow(m + 1);
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

// ===== 文件產出功能 (Document Generation) =====

function buildCheckboxString_(selectedValue, options) {
  var CHECKED = '■';
  var UNCHECKED = '□';
  return options.map(function(opt) {
    return (opt === selectedValue ? CHECKED : UNCHECKED) + opt;
  }).join(' / ');
}

var cachedHRData_ = null;
var cachedRolesData_ = null;
var cachedAppendix9Data_ = null;

function getSystemRolesData_(systemId) {
  var hrDirectory = loadHrDirectory_();
  if (!cachedRolesData_) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SYSTEM_ROLE_ASSIGNMENT_SHEET);
    if (!sheet) return [];
    cachedRolesData_ = sheet.getDataRange().getValues();
  }
  var data = cachedRolesData_;
  var roles = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === systemId) {
      var email = String(data[i][3] || '').trim();
      var userInfo = hrDirectory.map && hrDirectory.map[normalizeEmail_(email)] || {};
      roles.push({
        roleName: data[i][2],
        email: email,
        name: userInfo.name || email
      });
    }
  }
  return roles;
}

function getManagerFromHR_(userEmail) {
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
      var email = data[i][0]; // A欄
      var group = data[i][2]; // C欄
      var mgrName = data[i][6]; // G欄 (index 6)
      if (email === userEmail && group && group.toString().indexOf('GRP-') === 0) {
        return mgrName || '';
      }
    }
  } catch(e) {
    console.error("HR Lookup failed", e);
  }
  return '';
}

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

function getAppendix9Description_(dimension, level) {
  if (!cachedAppendix9Data_) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('附表9說明');
    if (!sheet) return '';
    cachedAppendix9Data_ = sheet.getDataRange().getValues();
  }
  var data = cachedAppendix9Data_;
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === dimension && data[i][1] === level) {
      return data[i][2] || '';
    }
  }
  return '';
}

function generateAssessmentDoc(systemId, templateKey) {
  assertPageAccess_();
  var rules = getRuleConfig_();
  var templateId = getRuleValue_(rules, 'doc_generation', templateKey || 'doc_template_transl_center', '');
  var folderId = getRuleValue_(rules, 'doc_generation', 'doc_output_folder', '');
  
  if (!templateId || !folderId) throw new Error('尚未設定範本 ID 或輸出資料夾 ID。');
  
  var system = getSystemById_(systemId);
  if (!system) throw new Error('找不到系統資料：' + systemId);
  
  var summary = getSummaryRatingRow_(systemId);
  if (!summary) throw new Error('該系統尚未完成評估。');
  
  var details = getRatingDetails_(systemId);
  var detailMap = {};
  for (var i = 0; i < details.length; i++) {
    detailMap[details[i].field] = details[i];
  }
  
  // 1 & 2. 填表人與日期
  var evaluator = getCurrentEvaluator();
  var evaluatorName = evaluator.name || evaluator.email || '';
  var d = new Date();
  var tzDateStr = Utilities.formatDate(d, 'Asia/Taipei', 'yyyy-MM-dd');
  var dateParts = tzDateStr.split('-');
  var rocYear = String(parseInt(dateParts[0], 10) - 1911);
  var monthStr = String(parseInt(dateParts[1], 10)); // 不補零
  var dayStr = String(parseInt(dateParts[2], 10));   // 不補零
  
  // 4. 系統管理人
  var roles = getSystemRolesData_(systemId);
  var sysManager = roles.filter(function(r) { return r.roleName === '系統部署維護人員'; })[0] 
                || roles.filter(function(r) { return r.roleName === '系統承辦窗口'; })[0];
  var sysManagerName = sysManager ? sysManager.name : '';
  var sysManagerEmail = sysManager ? sysManager.email : '';
  
  // 5. 系統開發型態
  var devType = '';
  if (system['建置方式'] === '本機關購置套裝軟體') devType = '套裝軟硬體';
  else if (system['建置方式'] === '本機關委外開發') devType = '委外開發';
  else if (system['建置方式'] === '本機關自行開發') devType = '自行開發';
  var devTypeStr = buildCheckboxString_(devType, ['自行開發', '委外開發', '套裝軟硬體']);
  
  // 6 & 7. 廠商與單位人員
  var vendorContact = roles.filter(function(r) { return r.roleName === '開發'; })[0]
                   || roles.filter(function(r) { return r.roleName === '系統部署維護人員'; })[0]
                   || roles.filter(function(r) { return r.roleName === '系統承辦窗口'; })[0];
  var contactStr = vendorContact ? vendorContact.name : '';
  
  // 14. 系統管理人主管
  var sysManagerBoss = getManagerFromHR_(sysManagerEmail);
  
  try {
    var templateFile = DriveApp.getFileById(templateId);
    var targetFolder = DriveApp.getFolderById(folderId);
    var newFileName = '轉譯中心資通系統防護需求分級評估表_' + (system['系統名稱'] || '') + '_' + tzDateStr;
    var newFile = templateFile.makeCopy(newFileName, targetFolder);
    
    var mapping = {
      '{{填表人}}': evaluatorName,
      '{{填表日期_民國年}}': rocYear,
      '{{填表日期_月}}': monthStr,
      '{{填表日期_日}}': dayStr,
      '{{資通系統名稱}}': system['系統名稱'] || '',
      '{{系統管理人}}': sysManagerName,
      '{{系統開發型態}}': devTypeStr,
      '{{建置單位／廠商}}': (system['建置廠商'] || '') + (contactStr ? ' - ' + contactStr : ''),
      '{{維運單位／廠商}}': (system['維運廠商'] || '') + (contactStr ? ' - ' + contactStr : ''),
      '{{MTPD}}': system['最大可容忍中斷時間'] != null ? system['最大可容忍中斷時間'] : '',
      '{{RTO}}': system['復原目標時間(RTO)'] != null ? system['復原目標時間(RTO)'] : '',
      '{{RPO}}': system['資料回復點目標(RPO)'] != null ? system['資料回復點目標(RPO)'] : '',
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
        ss.createTextFinder(key).replaceAllWith(replacement);
      }
    } else {
      throw new Error('不支援的範本格式。請使用 Google Doc 或 Google Sheet。');
    }
    
    return { success: true, url: newFile.getUrl(), name: newFileName };
  } catch (err) {
    throw new Error('產出文件失敗：' + err.toString());
  }
}

/**
 * 取得可供批次產出勾選的系統清單。
 * @param {string} mode - 'assessment' (評估表) 或 'inventory' (清冊)
 * @return {Array<{systemId:string, systemName:string, protectionLevel:string, assessmentStatus:string}>}
 */
function getSystemsForBatchSelection(mode) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var result = [];

  if (mode === 'assessment') {
    var ratingSheet = ss.getSheetByName('防護需求分級評估');
    if (!ratingSheet) return result;
    var ratingData = ratingSheet.getDataRange().getValues();

    // 一次讀取系統清冊，同時建立名稱與等級對照
    var sysSheet = ss.getSheetByName('系統清冊');
    var sysNameMap = {};
    var sysLevelMap = {};
    if (sysSheet) {
      var sysData = sysSheet.getDataRange().getDisplayValues();
      for (var s = 1; s < sysData.length; s++) {
        var sObj = mapSystemRowToObject_(sysData[s], s + 1);
        if (sObj['系統ID']) {
          sysNameMap[sObj['系統ID']] = sObj['系統名稱'] || '';
          sysLevelMap[sObj['系統ID']] = sObj['防護需求等級'] || '未評估';
        }
      }
    }

    for (var i = 1; i < ratingData.length; i++) {
      var systemId = ratingData[i][0];
      if (!systemId) continue;
      systemId = String(systemId);

      var assessmentStatus = '未完成';
      try {
        var dets = getRatingDetails_(systemId);
        if (dets && dets.length > 0) assessmentStatus = '已完成';
      } catch (e) { /* 取得明細失敗視為未完成 */ }

      result.push({
        systemId: systemId,
        systemName: sysNameMap[systemId] || systemId,
        protectionLevel: sysLevelMap[systemId] || '未評估',
        assessmentStatus: assessmentStatus
      });
    }

  } else if (mode === 'inventory') {
    var sysSheet2 = ss.getSheetByName('系統清冊');
    if (!sysSheet2) return result;
    var sysData2 = sysSheet2.getDataRange().getDisplayValues();

    // 建立已評估 systemId 集合
    var ratingSheet2 = ss.getSheetByName('防護需求分級評估');
    var ratedIds = {};
    if (ratingSheet2) {
      var rData2 = ratingSheet2.getDataRange().getValues();
      for (var ri = 1; ri < rData2.length; ri++) {
        if (rData2[ri][0]) ratedIds[String(rData2[ri][0])] = true;
      }
    }

    for (var j = 1; j < sysData2.length; j++) {
      var obj = mapSystemRowToObject_(sysData2[j], j + 1);
      if (!obj['系統ID'] && !obj['系統名稱']) continue;
      var sId = obj['系統ID'] ? String(obj['系統ID']) : '';
      result.push({
        systemId: sId,
        systemName: obj['系統名稱'] || sId,
        protectionLevel: obj['防護需求等級'] || '未評估',
        assessmentStatus: ratedIds[sId] ? '已評估' : '未評估'
      });
    }
  }

  return result;
}

function batchGenerateAssessmentDocs(templateKey, selectedSystemIds) {
  assertRuleAdmin_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ratingSheet = ss.getSheetByName('防護需求分級評估');
  if (!ratingSheet) throw new Error('無評估資料');
  
  var data = ratingSheet.getDataRange().getValues();
  var results = [];
  var errors = [];
  
  for (var i = 1; i < data.length; i++) {
    var systemId = data[i][0];
    if (!systemId) continue;
    systemId = String(systemId);
    if (selectedSystemIds && selectedSystemIds.length > 0 && selectedSystemIds.indexOf(systemId) === -1) continue;
    try {
      var res = generateAssessmentDoc(systemId, templateKey);
      results.push(res);
    } catch (e) {
      errors.push({ systemId: systemId, error: e.toString() });
    }
  }
  return { results: results, errors: errors };
}

/**
 * 產出資通系統清冊：將所有系統彙整至一份 Google Sheet 範本中。
 * @param {string} templateKey - 規則設定中的範本 key，預設 'inventory_sheet_template'
 * @param {Array<string>} [selectedSystemIds] - 可選的勾選系統ID陣列
 * @return {{success:boolean, url:string, name:string}}
 */
function generateInventorySheet(templateKey, selectedSystemIds) {
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
    var newName = '轉譯中心資通系統清冊_' + dateStr;
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

    // ---- 3.5 提取填表單位 ----
    var b2Value = String(tplData[1] && tplData[1][1] ? tplData[1][1] : '').trim();
    var unitName = b2Value.replace(/^.*填表單位[：:]\s*/, '').trim();
    if (unitName === b2Value) {
      unitName = ''; 
    }

    for (var r = 0; r < tplData.length; r++) {
      for (var c = 0; c < tplData[r].length; c++) {
        if (String(tplData[r][c]).replace(/\s+/g, '') === '資通系統名稱') {
          headerRowIdx = r;
          for (var cc = 0; cc < tplData[r].length; cc++) {
            var h = String(tplData[r][cc]).replace(/\s+/g, '');
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
      var obj = mapSystemRowToObject_(sysData[i], i + 1);
      // Fallback for any dynamic headers not defined in getSystemColumns_()
      for (var j = 0; j < sysHeaders.length; j++) {
        if (sysHeaders[j] && obj[sysHeaders[j]] === undefined) {
          obj[sysHeaders[j]] = sysData[i][j];
        }
      }
      if (obj['系統ID'] || obj['系統名稱']) systems.push(obj);
    }

    // 依據使用者勾選過濾
    if (selectedSystemIds && selectedSystemIds.length > 0) {
      systems = systems.filter(function(sys) {
        return selectedSystemIds.indexOf(String(sys['系統ID'])) !== -1;
      });
    }
    if (systems.length === 0) throw new Error('所選系統無資料可產出。');

    // ---- 5. 確保輸出表有足夠列數並清空可能殘留的範例資料 ----
    var dataStartRow = headerRowIdx + 2; // Sheet 行號 1-based
    var availRows = outSheet.getMaxRows() - dataStartRow + 1;
    if (availRows > 0) {
      outSheet.getRange(dataStartRow, 1, availRows, outSheet.getMaxColumns()).clearContent();
    }
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
      } catch(e) { console.warn('System ' + sysId + ' rating details lookup failed:', e); }

      // 管理人
      var mgrName = '';
      try {
        var roles = getSystemRolesData_(sysId);
        var mgr = roles.filter(function(r){ return r.roleName === '系統部署維護人員'; })[0]
               || roles.filter(function(r){ return r.roleName === '系統承辦窗口'; })[0];
        mgrName = mgr ? mgr.name : '';
      } catch(e) { console.warn('System ' + sysId + ' roles lookup failed:', e); }

      // 是否含個人資料
      var piiCount = parseInt(sys['個資數量'] || '0', 10);
      var hasPII = isNaN(piiCount) || piiCount <= 0 ? '否' : '是';

      // 開發型態轉換
      var rawDevType = sys['建置方式'] || '';
      var mappedDevType = rawDevType;
      if (rawDevType === '本機關購置套裝軟體' || rawDevType === '本機關建置套裝軟體' || rawDevType === '機關購置套裝軟體') mappedDevType = '套裝軟硬體';
      else if (rawDevType === '本機關委外開發') mappedDevType = '委外開發';
      else if (rawDevType === '本機關自行開發') mappedDevType = '自行開發';

      var vals = {
        '資通系統名稱':     sys['系統名稱'] || '',
        '資通系統描述':     sys['系統描述'] || '',
        '管理單位':         unitName,
        '管理人':           mgrName,
        '使用單位':         unitName,
        '開發型態':         mappedDevType,
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

/**
 * 測試用函式：驗證是否能從 HR 表格正確抓取主管姓名。
 * 使用方法：
 * 1. 將 targetEmail 替換為您想要測試的信箱
 * 2. 在 GAS 編輯器上方的下拉選單選擇 debugGetManagerFromHR
 * 3. 點擊「執行」，並在下方的「執行記錄」查看結果
 */
function debugGetManagerFromHR() {
  // 請在這裡填寫您想要測試的信箱
  var targetEmail = 'test@example.com'; 
  
  console.log('開始測試查詢主管姓名...');
  console.log('目標信箱: ' + targetEmail);
  
  var managerName = getManagerFromHR_(targetEmail);
  
  if (managerName) {
    console.log('✅ 查詢成功！主管姓名為: ' + managerName);
  } else {
    console.log('❌ 查詢不到主管姓名。請確認 HR 表格中是否有該信箱，且 C 欄 (群組) 為 grp- 開頭。');
  }
}
