const { google } = require('googleapis');

// ตั้งค่า Google Sheets API client จากตัวแปรแวดล้อม (.env)
// ต้องกำหนดค่า:
// - GOOGLE_CLIENT_EMAIL
// - GOOGLE_PRIVATE_KEY (ใช้รูปแบบมี \n แทนบรรทัดใหม่)
const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const PRIVATE_KEY = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

if (!CLIENT_EMAIL || !PRIVATE_KEY) {
  throw new Error('Missing Google credentials in .env (GOOGLE_CLIENT_EMAIL / GOOGLE_PRIVATE_KEY)');
}

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: CLIENT_EMAIL,
    private_key: PRIVATE_KEY,
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

// ฟังก์ชันอ่านข้อมูลจาก Google Sheets
async function readSheetData(spreadsheetId, range) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });
  return response.data.values;
}

// ฟังก์ชันเขียนข้อมูลลง Google Sheets
async function writeSheetData(spreadsheetId, range, values) {
  const response = await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    resource: { values },
  });
  return response.data;
}

// ฟังก์ชันเพิ่มข้อมูลต่อท้าย Google Sheets
async function appendSheetData(spreadsheetId, range, values) {
  const response = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    resource: { values },
  });
  return response.data;
}

module.exports = {
  readSheetData,
  writeSheetData,
  appendSheetData,
  // utilities exported below
};

// -------------
// Extra helpers
// -------------
async function sheetExists(spreadsheetId, sheetName) {
  const resp = await sheets.spreadsheets.get({ spreadsheetId });
  const list = resp.data.sheets || [];
  return list.some((s) => s?.properties?.title === sheetName);
}

async function addSheet(spreadsheetId, sheetName) {
  return sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        { addSheet: { properties: { title: sheetName } } },
      ],
    },
  });
}

async function ensureSheetExists(spreadsheetId, sheetName) {
  if (!sheetName) return;
  const exists = await sheetExists(spreadsheetId, sheetName);
  if (!exists) {
    await addSheet(spreadsheetId, sheetName);
  }
}

module.exports.ensureSheetExists = ensureSheetExists;
