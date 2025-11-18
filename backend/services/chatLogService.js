const { appendSheetData, ensureSheetExists } = require('./sheetsService');

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const CHAT_SHEET_NAME = process.env.CHAT_SHEET_NAME || 'Chats';
// สำหรับ requirement ใหม่: เก็บลงชีต "Sheet3" โดยดีฟอลต์
const CHAT_SHEET3_NAME = process.env.CHAT_SHEET3_NAME || 'Sheet3';

function ensureConfigured() {
  if (!SPREADSHEET_ID) throw new Error('GOOGLE_SPREADSHEET_ID is not set in .env');
}

// entry: { timestamp, sessionId, userId, role, content, model, pathUsed }
async function appendChatEntries(entries = []) {
  ensureConfigured();
  if (!Array.isArray(entries) || entries.length === 0) return { appended: 0 };
  await ensureSheetExists(SPREADSHEET_ID, CHAT_SHEET_NAME);
  const values = entries.map(e => [
    e.timestamp || new Date().toISOString(),
    e.sessionId || '',
    e.userId || '',
    e.role || '',
    e.content || '',
    e.model || '',
    e.pathUsed || '',
  ]);
  // ใช้ชื่อชีตตรง ๆ สำหรับ append เพื่อหลีกเลี่ยงปัญหา parse ของช่วงคอลัมน์
  const range = `${CHAT_SHEET_NAME}`;
  const result = await appendSheetData(SPREADSHEET_ID, range, values);
  return { appended: values.length, result };
}

// บันทึกแบบเป็นคู่ (ข้อความผู้ใช้ + เวลาที่ส่ง, คำตอบบอท + เวลาที่ตอบ, และชื่อผู้เล่น) ลง Sheet3
// pair: { playerName, userMessage, userSentAt, botReply, botRepliedAt }
async function appendChatPair(pair) {
  ensureConfigured();
  if (!pair) return { appended: 0 };
  await ensureSheetExists(SPREADSHEET_ID, CHAT_SHEET3_NAME);
  const {
    playerName = '',
    userMessage = '',
    userSentAt = new Date().toISOString(),
    botReply = '',
    botRepliedAt = new Date().toISOString(),
  } = pair;

  const values = [[
    playerName,
    userMessage,
    userSentAt,
    botReply,
    botRepliedAt,
  ]];
  // ใช้ชื่อชีตตรง ๆ เช่นกัน
  const range = `${CHAT_SHEET3_NAME}`;
  const result = await appendSheetData(SPREADSHEET_ID, range, values);
  return { appended: 1, result };
}

module.exports = {
  appendChatEntries,
  appendChatPair,
};
