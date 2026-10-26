const SPREADSHEET_ID = '1twxvkyu9jIyLQrYy5H9UvJ79tXWfIoYfd__jXcppCUI';
const ADMIN_READ_TOKEN = 'CAMBIA_ESTE_TOKEN_POR_UNO_SEGURO';

function doGet(e) {
  if (e && e.parameter && e.parameter.action === 'leads') {
    if (e.parameter.token !== ADMIN_READ_TOKEN) {
      return jsonResponse({ ok: false, error: 'unauthorized' });
    }

    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheets()[0];
    const rows = sheet.getDataRange().getValues();
    const leads = rows.slice(1).map((row) => ({
      id: row[10] || `sheet_${row[0].getTime ? row[0].getTime() : Date.now()}`,
      createdAt: row[0],
      formattedDate: row[0],
      whatsapp: row[1],
      couponCode: row[2],
      status: row[3] || 'pendiente',
      benefit: row[4],
      dinnerPreference: row[5],
      otherDinner: row[6],
      budget: row[7],
      trySushi: row[8],
      ingredients: String(row[9] || '').split(' | ').filter(Boolean),
    }));

    return jsonResponse({ ok: true, leads: leads.reverse() });
  }

  return jsonResponse({ ok: true, service: 'baku-baku-survey' });
}

function doPost(e) {
  const data = e && e.parameter ? e.parameter : {};
  const whatsapp = normalizePhone(data.whatsapp);

  if (!whatsapp) {
    return jsonResponse({ ok: false, error: 'whatsapp_required' });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheets()[0];
    ensureHeader(sheet);
    const values = sheet.getDataRange().getValues();
    const whatsappColumn = 2;
    const duplicate = values.slice(1).some((row) => normalizePhone(row[whatsappColumn]) === whatsapp);

    if (duplicate) {
      return jsonResponse({ ok: false, error: 'duplicate_whatsapp' });
    }

    sheet.appendRow([
      new Date(),
      whatsapp,
      data.couponCode || '',
      data.status || 'pendiente',
      data.benefit || '',
      data.dinnerPreference || '',
      data.otherDinner || '',
      data.budget || '',
      data.trySushi || '',
      data.ingredients || '',
      data.id || '',
    ]);

    return jsonResponse({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

function ensureHeader(sheet) {
  if (sheet.getLastRow() !== 0) return;

  sheet.appendRow([
    'Fecha',
    'WhatsApp',
    'Codigo_Cupon',
    'Estado',
    'Beneficio',
    'Cena_Frecuente',
    'Otro_Antojo',
    'Presupuesto',
    'Interes_Probar',
    'Ingredientes_Favoritos',
    'ID',
  ]);
}

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '').slice(-10);
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
