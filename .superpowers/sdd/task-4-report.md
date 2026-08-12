# Task 4 Report: Backend API and Zero-Trust Validation

## Summary of Implementation

1. **Zero-Trust Backend API (`applyAssessmentImportChanges`)**:
   - Implemented `applyAssessmentImportChanges(systemId, changes)` in `AppScript_Code.js`.
   - Validates user edit permissions via `assertCanEditSystem_(systemId)`.
   - Re-verifies system existence and protection level (`sysLevel`).
   - Restricts updates strictly to allowed editable fields (`ASSESSMENT_IMPORT_EDITABLE_FIELDS`: `['符合性', '現況說明', '佐證資料', '矯正作為', '目標日期', '備註']`).
   - Validates compliance options via `normalizeImportCompliance_` against the persisted `na_label` config.
   - Ignores items marked N/A (`isAssessmentNa_`).
   - Filters unchanged fields and returns `{ success: true, updated: savedCount, rejected: rejectedCount }`.

2. **Removal of Legacy Backend Code**:
   - Removed dead legacy functions and cache helpers in `AppScript_Code.js`:
     - `previewAssessmentImport`
     - `applyAssessmentImport`
     - `parseXlsxRows_`
     - `parseCsvRows_`
     - `putAssessmentImportCache_`
     - `getAssessmentImportCache_`
     - `buildAssessmentImportPreview_`
     - XML helper functions for backend XLSX parsing (`getXlsxNs_`, `getXmlText_`, `getXmlChildrenByName_`, `getXmlChildText_`, `getImportRowMaxColumnIndex_`, `columnNameToIndex_`, `parseXlsxSharedStrings_`, `parseXlsxSheetRows_`, `parseAssessmentImportRows_`, `findAssessmentImportHeader_`).

3. **Test Harness (`test_backend_validation.js`)**:
   - Created isolated Node test environment that evaluates `AppScript_Code.js` with mock spreadsheet dependencies and tests `applyAssessmentImportChanges`.

## TDD Evidence

### RED Phase
- **Command:** `node test_backend_validation.js`
- **Output:**
  ```text
  /Users/kih/Desktop/防護基準/test_backend_validation.js:17
  var res = applyAssessmentImportChanges('SYS1', changes);
            ^

  ReferenceError: applyAssessmentImportChanges is not defined
      at Object.<anonymous> (/Users/kih/Desktop/防護基準/test_backend_validation.js:17:11)
  ```
- **Explanation:** Failed as expected before `applyAssessmentImportChanges` was defined in `AppScript_Code.js`.

### GREEN Phase
- **Command:** `node test_backend_validation.js`
- **Output:**
  ```text
  PASS: applyAssessmentImportChanges
  ```
- **Explanation:** Passed cleanly after implementing `applyAssessmentImportChanges` and zero-trust validation logic in `AppScript_Code.js`.

### Full Test Suite Execution
- **Command 1:** `node test_backend_validation.js`
  - Result: `PASS: applyAssessmentImportChanges`
- **Command 2:** `node test_frontend_diff.js`
  - Result: `PASS: buildAssessmentImportPreviewClient`, `PASS: applyAssessmentImportPreview`

## Files Changed

- `AppScript_Code.js` (modified: added `applyAssessmentImportChanges`, updated `ASSESSMENT_IMPORT_EDITABLE_FIELDS`, removed legacy XLSX parsing/caching functions)
- `test_backend_validation.js` (created: unit test harness for backend API)
- `test_frontend_diff.js` (modified: fixed global scope test variables for Node test run)

## Self-Review Findings

- **Completeness:** `applyAssessmentImportChanges` implemented according to spec with zero-trust validation. All specified legacy functions deleted.
- **Quality:** Clean ES5-compatible code adhering to codebase standard.
- **Discipline:** No extraneous dependencies added.
- **Testing:** 100% passing unit tests without warnings or errors.

## Issues or Concerns

None.

---

# Review Findings Fix Report

## Summary of Fixes Applied

1. **`AppScript_Code.js` Index Lookup (`item.index`)**:
   - Fixed `applyAssessmentImportChanges` index key lookup from `item['項次']` to `item.index` to match the object schema returned by `getAssessment()`.

2. **`AppScript_Code.js` Field Mapping (`ASSESSMENT_IMPORT_FIELD_MAP`)**:
   - Added `ASSESSMENT_IMPORT_FIELD_MAP` dictionary mapping Chinese form keys (`'符合性'`, `'現況說明'`, `'佐證資料'`, `'矯正作為'`, `'目標日期'`, `'備註'`) to English property names (`'compliance'`, `'currentStatus'`, `'evidence'`, `'corrective'`, `'targetDate'`, `'note'`) on `currentItem` objects returned by `getAssessment()`.

3. **`AppScript_Code.js` Batch Update Structure**:
   - Fixed `applyAssessmentImportChanges` to update properties directly on `currentItem` and push the updated full assessment item object to `updates` array before invoking `batchSaveAssessment(updates)`. This prevents line matching failures and corrupt row appends in `batchSaveAssessment`.

4. **`test_backend_validation.js` Mock Accuracy**:
   - Updated test mock context for `getAssessment` to output realistic objects with English properties (`systemId`, `index`, `compliance`, etc.).
   - Updated `batchSaveAssessment` mock to simulate row construction and verify that updated values and row structures match expected output schema.

5. **`test_frontend_diff.js` Variable Qualifications**:
   - Explicitly qualified global test variables (`global.applyCalledWith`, `global.currentSystem`, `global.assessmentImportSubmitting`, `global.assessmentImportPreview`) with `global.` prefix to ensure strict quality standards in Node environment.

## Re-Run Test Evidence

- **Command 1:** `node test_backend_validation.js`
  - Output: `PASS: applyAssessmentImportChanges`
- **Command 2:** `node test_frontend_diff.js`
  - Output: `PASS: buildAssessmentImportPreviewClient`, `PASS: applyAssessmentImportPreview`

## Status & Conclusion
All 5 code review findings (4 Critical, 1 Minor) have been fully resolved, verified, and re-tested.
