import { google } from 'googleapis';

const SHEET_ID = process.env.GOOGLE_SHEET_ID;

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  return new google.auth.JWT(email, null, key, ['https://www.googleapis.com/auth/spreadsheets']);
}

async function getSheetsClient() {
  const auth = getAuth();
  await auth.authorize();
  return google.sheets({ version: 'v4', auth });
}

/**
 * Lee una pestaña completa y la devuelve como array de objetos, usando la
 * primera fila como encabezados de columna. Cada objeto incluye _rowIndex
 * (número de fila real en la hoja, 1-indexed, para poder actualizarla después).
 */
export async function readSheet(tabName) {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${tabName}!A1:Z10000`
  });
  const rows = res.data.values || [];
  if (rows.length === 0) return [];
  const headers = rows[0];
  return rows.slice(1).map((row, i) => {
    const obj = { _rowIndex: i + 2 }; // +2: fila 1 es el encabezado, y es 1-indexed
    headers.forEach((h, idx) => { obj[h] = row[idx] !== undefined ? row[idx] : ''; });
    return obj;
  });
}

/** Agrega una fila nueva al final de la pestaña. `valoresPorColumna` es un objeto {NombreColumna: valor}. */
export async function appendRow(tabName, valoresPorColumna) {
  const sheets = await getSheetsClient();
  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${tabName}!A1:Z1`
  });
  const headers = (headerRes.data.values || [[]])[0];
  const fila = headers.map((h) => valoresPorColumna[h] ?? '');
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${tabName}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [fila] }
  });
}

/** Actualiza una fila existente (por su _rowIndex) con los valores dados. */
export async function updateRow(tabName, rowIndex, valoresPorColumna) {
  const sheets = await getSheetsClient();
  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${tabName}!A1:Z1`
  });
  const headers = (headerRes.data.values || [[]])[0];
  const fila = headers.map((h) => (h in valoresPorColumna ? valoresPorColumna[h] : ''));
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${tabName}!A${rowIndex}:Z${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [fila] }
  });
}

/** Actualiza solo algunas columnas de una fila, dejando el resto intacto (lee antes de escribir). */
export async function patchRow(tabName, rowIndex, cambios) {
  const filas = await readSheet(tabName);
  const actual = filas.find((f) => f._rowIndex === rowIndex) || {};
  await updateRow(tabName, rowIndex, { ...actual, ...cambios });
}
