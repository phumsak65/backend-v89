const express = require('express');
const router = express.Router();
const { appendChatPair } = require('../services/chatLogService');
const { verifyToken } = require('../services/authService');

function getAuthToken(req) {
  const h = req.headers['authorization'] || req.headers['Authorization'];
  if (h && typeof h === 'string' && h.startsWith('Bearer ')) return h.substring(7).trim();
  if (req.headers['x-auth-token']) return String(req.headers['x-auth-token']).trim();
  return null;
}

// POST /chat/log
// Body: { userMessage, botReply, userSentAt?, botRepliedAt?, playerName? }
router.post('/log', async (req, res) => {
  try {
    const { userMessage, botReply, userSentAt, botRepliedAt, playerName } = req.body || {};
    if (!userMessage || typeof userMessage !== 'string') {
      return res.status(400).json({ success: false, error: 'userMessage is required (string)' });
    }
    if (!botReply || typeof botReply !== 'string') {
      return res.status(400).json({ success: false, error: 'botReply is required (string)' });
    }

    // Attempt to resolve playerName from token when not provided
    let resolvedName = playerName;
    if (!resolvedName) {
      const token = getAuthToken(req);
      const user = verifyToken(token);
      if (user) {
        resolvedName = user.name || user.id || `User-${user.pin || ''}`;
      }
    }

    const result = await appendChatPair({
      playerName: resolvedName || '',
      userMessage,
      userSentAt: userSentAt || new Date().toISOString(),
      botReply,
      botRepliedAt: botRepliedAt || new Date().toISOString(),
    });

    res.json({ success: true, appended: result.appended });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
