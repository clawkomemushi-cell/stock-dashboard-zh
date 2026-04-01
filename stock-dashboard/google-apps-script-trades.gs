const SECRET = 'REPLACE_WITH_YOUR_SECRET';
const SHEET_NAME = 'trades';
const HEADER = ['tradeId','savedAt','date','action','symbol','name','price','unit','qty','note','createdAt','updatedAt'];

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) sheet.appendRow(HEADER);
  const header = sheet.getRange(1, 1, 1, HEADER.length).getValues()[0];
  if (JSON.stringify(header) !== JSON.stringify(HEADER)) {
    sheet.clearContents();
    sheet.getRange(1, 1, 1, HEADER.length).setValues([HEADER]);
  }
  return sheet;
}

function isAuthorized_(e) {
  const p = (e && e.parameter) || {};
  return !!SECRET && p.secret === SECRET;
}

function rowToItem_(row) {
  const item = {};
  HEADER.forEach((key, i) => item[key] = row[i] || '');
  return item;
}

function readItems_() {
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  const values = sheet.getRange(2, 1, lastRow - 1, HEADER.length).getValues();
  return values.map(rowToItem_).filter(item => item.tradeId || item.date || item.symbol);
}

function writeAll_(items) {
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, HEADER.length).clearContent();
  if (!items.length) return;
  const rows = items.map(item => HEADER.map(key => item[key] || ''));
  sheet.getRange(2, 1, rows.length, HEADER.length).setValues(rows);
}

function nowIso_() {
  return new Date().toISOString();
}

function normalizeTrade_(payload) {
  const now = nowIso_();
  return {
    tradeId: payload.tradeId || Utilities.getUuid(),
    savedAt: payload.savedAt || now,
    date: payload.date || '',
    action: payload.action || '',
    symbol: payload.symbol || '',
    name: payload.name || '',
    price: payload.price || '',
    unit: payload.unit || '',
    qty: payload.qty || '',
    note: payload.note || '',
    createdAt: payload.createdAt || now,
    updatedAt: now
  };
}

function listTrades_(date) {
  let items = readItems_();
  if (date) items = items.filter(item => String(item.date) === String(date));
  items.sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.updatedAt || b.savedAt).localeCompare(String(a.updatedAt || a.savedAt)));
  return items;
}

function upsertTrade_(payload) {
  const items = readItems_();
  const next = normalizeTrade_(payload || {});
  const idx = items.findIndex(item => String(item.tradeId) === String(next.tradeId));
  if (idx >= 0) {
    next.savedAt = items[idx].savedAt || next.savedAt;
    next.createdAt = items[idx].createdAt || next.createdAt;
    items[idx] = next;
  } else {
    items.unshift(next);
  }
  writeAll_(items);
  return next;
}

function deleteTrade_(tradeId) {
  if (!tradeId) return 0;
  const items = readItems_();
  const keep = items.filter(item => String(item.tradeId) !== String(tradeId));
  const deleted = items.length - keep.length;
  if (deleted) writeAll_(keep);
  return deleted;
}

function clearDate_(date) {
  if (!date) return 0;
  const items = readItems_();
  const keep = items.filter(item => String(item.date) !== String(date));
  const deleted = items.length - keep.length;
  if (deleted) writeAll_(keep);
  return deleted;
}

function clearAll_() {
  writeAll_([]);
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action === 'meta') return jsonOut({ ok: true, ready: true, sheet: SHEET_NAME, apiVersion: 2, capabilities: ['list','upsert','deleteOne','clearDate','clearAll'] });
  if (!isAuthorized_(e)) return jsonOut({ ok: false, error: 'forbidden' });

  if (p.action === 'clear') {
    clearAll_();
    return jsonOut({ ok: true, cleared: true, count: 0, items: [] });
  }
  if (p.action === 'deleteOne') {
    return jsonOut({ ok: true, deleted: deleteTrade_(p.tradeId || '') });
  }
  if (p.action === 'clearDate') {
    return jsonOut({ ok: true, cleared: clearDate_(p.date || '') });
  }

  const items = listTrades_(p.date || '');
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
  if (payload && payload.action === '__clearDate__') {
    return jsonOut({ ok: true, cleared: clearDate_(payload.date || '') });
  }
  if (payload && payload.action === '__deleteOne__') {
    return jsonOut({ ok: true, deleted: deleteTrade_(payload.tradeId || '') });
  }
  if (payload && payload.action === '__upsert__') {
    const item = upsertTrade_(payload.item || {});
    return jsonOut({ ok: true, item, count: listTrades_('').length, items: listTrades_('') });
  }

  const item = upsertTrade_(payload || {});
  return jsonOut({ ok: true, item, count: listTrades_('').length, items: listTrades_('') });
}
