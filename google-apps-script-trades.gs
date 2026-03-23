const SECRET = 'REPLACE_WITH_YOUR_SECRET';
const SHEET_NAME = 'trades';
const HEADER = ['savedAt','date','action','symbol','name','price','unit','qty','note','createdAt'];

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) sheet.appendRow(HEADER);
  return sheet;
}

function isAuthorized_(e) {
  const p = (e && e.parameter) || {};
  return !!SECRET && p.secret === SECRET;
}

function readItems_() {
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();
  const lastCol = HEADER.length;
  if (lastRow <= 1) return [];
  const values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  return values
    .map(row => Object.fromEntries(HEADER.map((key, i) => [key, row[i]])))
    .filter(item => item.savedAt || item.date || item.symbol);
}

function appendItem_(payload) {
  const sheet = getSheet_();
  const row = [
    new Date().toISOString(),
    payload.date || '',
    payload.action || '',
    payload.symbol || '',
    payload.name || '',
    payload.price || '',
    payload.unit || '',
    payload.qty || '',
    payload.note || '',
    payload.createdAt || ''
  ];
  sheet.appendRow(row);
}

function clearAll_() {
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheet.getMaxColumns()).clearContent();
  }
}

function deleteBySavedAt_(savedAt) {
  if (!savedAt) return 0;
  const sheet = getSheet_();
  const items = readItems_();
  const keep = items.filter(item => String(item.savedAt) !== String(savedAt));
  clearAll_();
  if (keep.length) {
    const rows = keep.map(item => HEADER.map(key => item[key] || ''));
    sheet.getRange(2, 1, rows.length, HEADER.length).setValues(rows);
  }
  return items.length - keep.length;
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action === 'meta') return jsonOut({ ok: true, ready: true, sheet: SHEET_NAME });
  if (!isAuthorized_(e)) return jsonOut({ ok: false, error: 'forbidden' });

  if (p.action === 'clear') {
    clearAll_();
    return jsonOut({ ok: true, cleared: true, count: 0, items: [] });
  }

  if (p.action === 'deleteOne') {
    const deleted = deleteBySavedAt_(p.savedAt || '');
    return jsonOut({ ok: true, deleted });
  }

  const items = readItems_().sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
  return jsonOut({ ok: true, count: items.length, items });
}

function doPost(e) {
  const p = (e && e.parameter) || {};
  if (!isAuthorized_(e)) return jsonOut({ ok: false, error: 'forbidden' });

  let payload = {};
  try {
    payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return jsonOut({ ok: false, error: 'bad_json', message: String(err) });
  }

  if (payload && payload.action === '__clear__') {
    clearAll_();
    return jsonOut({ ok: true, cleared: true, count: 0, items: [] });
  }

  if (payload && payload.action === '__deleteOne__') {
    const deleted = deleteBySavedAt_(payload.savedAt || '');
    return jsonOut({ ok: true, deleted });
  }

  appendItem_(payload || {});
  const items = readItems_().sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
  return jsonOut({ ok: true, count: items.length, items });
}
