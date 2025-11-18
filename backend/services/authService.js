const { randomUUID } = require('crypto');

// Very simple in-memory token store. For production, move to Redis/DB.
const tokens = new Map(); // token -> { user, expiresAt }

function nowMs() {
  return Date.now();
}

function minutes(n) {
  return n * 60 * 1000;
}

function getTtlMinutes() {
  const n = parseInt(process.env.AUTH_TOKEN_TTL_MINUTES || '1440', 10);
  return Number.isFinite(n) && n > 0 ? n : 1440; // default 24h
}

function issueToken(user) {
  const token = randomUUID();
  const ttlMs = minutes(getTtlMinutes());
  const expiresAt = nowMs() + ttlMs;
  tokens.set(token, { user, expiresAt });
  return { token, expiresAt };
}

function verifyToken(token) {
  if (!token) return null;
  const entry = tokens.get(token);
  if (!entry) return null;
  if (entry.expiresAt <= nowMs()) {
    tokens.delete(token);
    return null;
  }
  return entry.user;
}

function revokeToken(token) {
  return tokens.delete(token);
}

module.exports = {
  issueToken,
  verifyToken,
  revokeToken,
};
