require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT || 3000; // พอร์ตที่เซิร์ฟเวอร์จะรัน

app.use(express.json());

// CORS (อนุญาตให้ frontend เรียก backend)
const allowOrigins = new Set(
  String(process.env.ALLOW_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
);
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!allowOrigins.size) {
    // ไม่ได้ตั้งค่า -> เปิดกว้างสำหรับ dev
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (origin && allowOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With, x-auth-token'
  );
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// เส้นทางพื้นฐาน
app.get('/', (req, res) => {
  res.send('Google Sheets API Server - ใช้งานได้แล้ว!');
});

// ติดตั้ง Routers
const healthRouter = require('./routes/health');
const sheetsRouter = require('./routes/sheets');
const aiTyphonRouter = require('./routes/aiTyphon');
const authRouter = require('./routes/auth');
const chatLogRouter = require('./routes/chatLog');
const facebookRouter = require('./routes/facebook');

app.use('/', healthRouter);
app.use('/', sheetsRouter); // คง path เดิม เช่น /read, /write, /append, /test-connection
app.use('/ai-typhon', aiTyphonRouter); // กลุ่มเส้นทางของ Typhon AI
app.use('/auth', authRouter); // ระบบ PIN Login
app.use('/chat', chatLogRouter); // log แชทแบบ pair
app.use('/facebook', facebookRouter); // Facebook Graph API integration

// Alias เส้นทางสำหรับ frontend (เชื่อมให้ตรงกับ URL ใน ChatView.vue)
// - /api/chat/ai-typhon/*  -> aiTyphonRouter
// - /api/login/auth/*       -> authRouter
// - /api/chat/log           -> chatLogRouter (มีอยู่แล้วด้านบนที่ /chat/log)
app.use('/api/chat/ai-typhon', aiTyphonRouter);
app.use('/api/login/auth', authRouter);
app.use('/api/chat', chatLogRouter);
app.use('/api/facebook', facebookRouter);

// สั่งให้เซิร์ฟเวอร์เริ่มทำงาน
app.listen(port, () => {
  console.log(`\n🚀 เซิร์ฟเวอร์กำลังรันที่ http://localhost:${port}\n`);
  console.log('📋 API Endpoints:');
  console.log('  GET  /health          - ตรวจสุขภาพเซิร์ฟเวอร์');
  console.log('  GET  /test-connection - ทดสอบการเชื่อมต่อ Google Sheets');
  console.log('  GET  /read            - อ่านข้อมูลจาก Google Sheets');
  console.log('  POST /write           - เขียนข้อมูลลง Google Sheets');
  console.log('  POST /append          - เพิ่มข้อมูลต่อท้าย Google Sheets');
  console.log('  GET  /ai-typhon/ping  - ตรวจ config ของ Typhon AI');
  console.log('  POST /ai-typhon/generate - ตัวอย่าง generate ข้อความ');
  console.log('  POST /ai-typhon/proxy - Proxy เรียก Typhon API ใดๆ');
  console.log('  POST /ai-typhon/chat  - Chat completions (payload ตรง)');
  console.log('  POST /ai-typhon/session/:id/message - ส่งข้อความเข้า session แล้วให้ AI ตอบ');
  console.log('  GET  /ai-typhon/session/:id/history - ดูประวัติแชท');
  console.log('  DELETE /ai-typhon/session/:id       - ล้างประวัติแชท');
  console.log('  POST /auth/pin/login     - เข้าสู่ระบบด้วย PIN 6 หลักจาก Google Sheet');
  console.log('  GET  /auth/me            - ดูข้อมูลผู้ใช้จาก token');
  console.log('  POST /auth/logout        - ออกจากระบบ (revoke token)');
  console.log('  POST /chat/log           - บันทึกคู่สนทนาลง Sheet3 (player, userMsg, times, botReply)');
  console.log('');
  console.log('🔁 Aliases for frontend:');
  console.log('  POST /api/chat/ai-typhon/chat -> /ai-typhon/chat');
  console.log('  GET  /api/login/auth/me       -> /auth/me');
  console.log('  POST /api/login/auth/logout   -> /auth/logout');
  console.log('  POST /api/chat/log            -> /chat/log');
  console.log('\n💡 เริ่มต้นทดสอบที่: http://localhost:' + port + '/test-connection\n');
});