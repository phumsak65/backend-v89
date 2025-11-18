const express = require('express');
const router = express.Router();
const {
  readSheetData,
  writeSheetData,
  appendSheetData,
} = require('../services/sheetsService');

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const USERS_SHEET_NAME = (process.env.USERS_SHEET_NAME || 'Sheet2').trim();
const CHAT_SHEET3_NAME = (process.env.CHAT_SHEET3_NAME || 'Sheet3').trim();
// เพิ่มรายการชีตต้องห้ามอ่านโดยตรง (คั่นด้วยจุลภาคใน .env: PROTECT_SHEETS=Sheet2,Secrets)
const PROTECT_SHEETS = new Set([
  USERS_SHEET_NAME,CHAT_SHEET3_NAME,
  ...String(process.env.PROTECT_SHEETS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
].map((s) => s.toLowerCase()));

function extractSheetName(range) {
  if (!range || typeof range !== 'string') return '';
  const head = range.split('!')[0];
  // รองรับชื่อชีตมีช่องว่างและถูกหุ้มด้วย single quote เช่น 'My Sheet'!A1:B
  return head.replace(/^'/, '').replace(/'$/, '').trim();
}

// ทดสอบการเชื่อมต่อ Google Sheets
router.get('/test-connection', async (req, res) => {
  try {
    if (!SPREADSHEET_ID) {
      return res.status(400).json({
        success: false,
        message: '❌ ยังไม่ได้ตั้งค่า GOOGLE_SPREADSHEET_ID ใน .env',
        instruction: 'กรุณาเพิ่ม GOOGLE_SPREADSHEET_ID ในไฟล์ .env',
      });
    }

    const data = await readSheetData(SPREADSHEET_ID, 'Sheet1!A1:C10');
    return res.json({
      success: true,
      message: '✅ เชื่อมต่อ Google Sheets สำเร็จ!',
      spreadsheetId: SPREADSHEET_ID,
      dataPreview: Array.isArray(data) ? data.slice(0, 3) : [],
      totalRows: Array.isArray(data) ? data.length : 0,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: '❌ เชื่อมต่อไม่สำเร็จ',
      error: error.message,
      possibleReasons: [
        'ตรวจว่าได้ตั้งค่า GOOGLE_CLIENT_EMAIL และ GOOGLE_PRIVATE_KEY ใน .env แล้ว',
        'ตรวจว่า GOOGLE_PRIVATE_KEY แทนบรรทัดใหม่ด้วย \\n อย่างถูกต้อง',
        'ตรวจสอบว่าได้แชร์ Google Sheet ให้กับ Service Account (อีเมลจาก GOOGLE_CLIENT_EMAIL) แล้ว',
        'ตรวจสอบว่า Spreadsheet ID ถูกต้อง',
        'ตรวจสอบว่าชื่อ Sheet เป็น "Sheet1" หรือแก้ไข range ให้ตรงกับชื่อ Sheet',
      ],
    });
  }
});

// อ่านข้อมูลจาก Google Sheets
router.get('/read', async (req, res) => {
  try {
    const { spreadsheetId, range } = req.query;
    const sheetId = spreadsheetId || SPREADSHEET_ID;

    if (!sheetId) {
      return res.status(400).json({
        error: 'กรุณาตั้งค่า GOOGLE_SPREADSHEET_ID ใน .env หรือส่ง spreadsheetId ใน query',
      });
    }
    if (!range) {
      return res.status(400).json({ error: 'กรุณาระบุ range' });
    }

    // กันไม่ให้อ่านชีตที่ต้องห้ามโดยตรง เช่น Sheet2 สำหรับ PIN
    const sheetName = extractSheetName(range).toLowerCase();
    if (PROTECT_SHEETS.has(sheetName)) {
      // ตอบเป็น 404 เพื่อไม่เปิดเผยการมีอยู่ของชีตที่ถูกป้องกัน
      return res.status(404).json({ success: false, error: 'Not Found' });
    }

    const data = await readSheetData(sheetId, range);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// เขียนข้อมูลลง Google Sheets
router.post('/write', async (req, res) => {
  try {
    const { spreadsheetId, range, values } = req.body;
    const sheetId = spreadsheetId || SPREADSHEET_ID;

    if (!sheetId) {
      return res.status(400).json({
        error: 'กรุณาตั้งค่า GOOGLE_SPREADSHEET_ID ใน .env หรือส่ง spreadsheetId ใน body',
      });
    }
    if (!range || !values) {
      return res.status(400).json({ error: 'กรุณาระบุ range และ values' });
    }

    const result = await writeSheetData(sheetId, range, values);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// เพิ่มข้อมูลต่อท้าย Google Sheets
router.post('/append', async (req, res) => {
  try {
    const { spreadsheetId, range, values } = req.body;
    const sheetId = spreadsheetId || SPREADSHEET_ID;

    if (!sheetId) {
      return res.status(400).json({
        error: 'กรุณาตั้งค่า GOOGLE_SPREADSHEET_ID ใน .env หรือส่ง spreadsheetId ใน body',
      });
    }
    if (!range || !values) {
      return res.status(400).json({ error: 'กรุณาระบุ range และ values' });
    }

    const result = await appendSheetData(sheetId, range, values);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
