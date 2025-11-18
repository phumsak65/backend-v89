const express = require('express');
const router = express.Router();
const { readSheetData } = require('../services/sheetsService');
const { issueToken, verifyToken, revokeToken } = require('../services/authService');

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
// ดึงจาก Sheet2 ตามที่ร้องขอ (สามารถ override ด้วย .env USERS_SHEET_NAME)
const USERS_SHEET_NAME = process.env.USERS_SHEET_NAME || 'Sheet2';

function getAuthToken(req) {
  const h = req.headers['authorization'] || req.headers['Authorization'];
  if (h && typeof h === 'string' && h.startsWith('Bearer ')) return h.substring(7).trim();
  if (req.headers['x-auth-token']) return String(req.headers['x-auth-token']).trim();
  return null;
}

// POST /auth/pin/login { pin: "123456" }
router.post('/pin/login', async (req, res) => {
  try {
    const { pin } = req.body || {};
    if (!pin || !/^\d{6}$/.test(String(pin))) {
      return res.status(400).json({ success: false, error: 'PIN ต้องเป็นตัวเลข 6 หลัก' });
    }
    if (!SPREADSHEET_ID) {
      return res.status(500).json({ success: false, error: 'ยังไม่ได้ตั้งค่า GOOGLE_SPREADSHEET_ID ใน .env' });
    }

    // อ่าน Users sheet: คาดว่า คอลัมน์ A = PIN, คอลัมน์ B = Name/ID
    const range = `${USERS_SHEET_NAME}!A:B`;
    const rows = (await readSheetData(SPREADSHEET_ID, range)) || [];
    const found = rows.find(r => String(r[0] || '').trim() === String(pin));
    if (!found) {
      return res.status(401).json({ success: false, error: 'PIN ไม่ถูกต้อง' });
    }
    const name = String(found[1] || `User-${String(pin).slice(-4)}`);
    const user = { id: name, name, pin: String(pin) };
    const { token, expiresAt } = issueToken(user);
    res.json({ success: true, token, expiresAt, user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /auth/me
router.get('/me', (req, res) => {
  const token = getAuthToken(req);
  const user = verifyToken(token);
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
  res.json({ success: true, user });
});

// POST /auth/logout
router.post('/logout', (req, res) => {
  const token = getAuthToken(req);
  if (!token) return res.json({ success: true, revoked: false });
  const revoked = revokeToken(token);
  res.json({ success: true, revoked });
});

module.exports = router;
