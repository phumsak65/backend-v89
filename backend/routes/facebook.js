const express = require('express');
const router = express.Router();
const { postToPageFeed, verifyPageAccess } = require('../services/facebookService');
const { verifyToken } = require('../services/authService');
const fs = require('fs');
const path = require('path');

function requireAuth(req, res, next) {
  const h = req.headers['authorization'] || req.headers['Authorization'];
  let token = null;
  if (h && typeof h === 'string' && h.startsWith('Bearer ')) token = h.substring(7).trim();
  if (!token && req.headers['x-auth-token']) token = String(req.headers['x-auth-token']).trim();
  const user = verifyToken(token);
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
  req.user = user;
  next();
}

function maskToken(token) {
  if (!token) return '';
  if (token.length <= 8) return '********';
  return token.slice(0, 4) + '...' + token.slice(-4);
}

// POST /facebook/post { message, link? }
router.post('/post', requireAuth, async (req, res) => {
  try {
    const { message, link } = req.body || {};
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, error: 'message is required' });
    }
    const result = await postToPageFeed(message.trim(), link);
    res.json({ success: true, result });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message, details: err.details || null });
  }
});

// GET /facebook/token -> return masked token and page id for UI display
router.get('/token', requireAuth, (req, res) => {
  const pageId = (process.env.FACEBOOK_PAGE_ID || '').trim();
  const token = (process.env.FACEBOOK_ACCESS_TOKEN || '').trim();
  const graphVersion = (process.env.FACEBOOK_GRAPH_VERSION || 'v19.0').trim();
  res.json({ success: true, pageId, accessTokenMasked: maskToken(token), graphVersion });
});

// PATCH /facebook/token { pageId?, accessToken? } -> update .env values
router.patch('/token', requireAuth, async (req, res) => {
  try {
    const { pageId, accessToken } = req.body || {};
    if (!pageId && !accessToken) {
      return res.status(400).json({ success: false, error: 'Nothing to update' });
    }

    const envPath = path.resolve(process.cwd(), '.env');
    let envContent = '';
    try { envContent = fs.readFileSync(envPath, 'utf8'); } catch (_) { envContent = ''; }

    const lines = envContent.split(/\r?\n/);
    const setOrAdd = (key, value) => {
      const idx = lines.findIndex(l => l.startsWith(key + '='));
      const val = String(value ?? '').replace(/\n/g, '\\n');
      if (idx >= 0) {
        lines[idx] = `${key}=${val}`;
      } else {
        lines.push(`${key}=${val}`);
      }
    };

    if (pageId !== undefined) setOrAdd('FACEBOOK_PAGE_ID', pageId);
    if (accessToken !== undefined) setOrAdd('FACEBOOK_ACCESS_TOKEN', accessToken);
  // preserve version; allow update if passed
  if (req.body && req.body.graphVersion) setOrAdd('FACEBOOK_GRAPH_VERSION', req.body.graphVersion);

    const newContent = lines.join('\n');
    fs.writeFileSync(envPath, newContent, 'utf8');

    // Reflect into process.env for current process (no restart needed for runtime usage here)
    if (pageId !== undefined) process.env.FACEBOOK_PAGE_ID = String(pageId);
    if (accessToken !== undefined) process.env.FACEBOOK_ACCESS_TOKEN = String(accessToken);

    if (req.body && req.body.graphVersion) process.env.FACEBOOK_GRAPH_VERSION = String(req.body.graphVersion);

    res.json({ success: true, pageId: process.env.FACEBOOK_PAGE_ID, graphVersion: process.env.FACEBOOK_GRAPH_VERSION, accessTokenMasked: maskToken(process.env.FACEBOOK_ACCESS_TOKEN) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /facebook/verify -> ตรวจสอบว่า token และ page ใช้งานได้ (อนุญาต override ผ่าน query)
router.get('/verify', requireAuth, async (req, res) => {
  try {
    const { pageId, accessToken, graphVersion } = req.query || {};
    const ov = {};
    if (pageId) ov.PAGE_ID = String(pageId).trim();
    if (accessToken) ov.ACCESS_TOKEN = String(accessToken).trim();
    if (graphVersion) ov.GRAPH_VERSION = String(graphVersion).trim();
    const result = await verifyPageAccess(Object.keys(ov).length ? ov : undefined);
    if (!result.ok) {
      return res.status(result.status || 500).json({ success: false, error: result.error?.message || 'verify failed', details: result });
    }
    res.json({ success: true, data: result.data, graphVersion: result.graphVersion, used: result.used || null, override: !!Object.keys(ov).length });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /facebook/verify -> ตรวจสอบด้วยค่า override ที่ส่งมาใน body โดยไม่บันทึกถาวร
router.post('/verify', requireAuth, async (req, res) => {
  try {
    const { pageId, accessToken, graphVersion } = req.body || {};
    const ov = {};
    if (pageId) ov.PAGE_ID = String(pageId).trim();
    if (accessToken) ov.ACCESS_TOKEN = String(accessToken).trim();
    if (graphVersion) ov.GRAPH_VERSION = String(graphVersion).trim();
    const result = await verifyPageAccess(Object.keys(ov).length ? ov : undefined);
    if (!result.ok) {
      return res.status(result.status || 500).json({ success: false, error: result.error?.message || 'verify failed', details: result });
    }
    res.json({ success: true, data: result.data, graphVersion: result.graphVersion, used: result.used || null, override: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
