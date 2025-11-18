const axios = require('axios');

// Trim to avoid trailing spaces/newlines from .env
const BASE_URL = (process.env.AITYPHON_BASE_URL || '').trim(); // e.g. https://api.opentyphoon.ai
const API_KEY = (process.env.AITYPHON_API_KEY || '').trim();   // Your Typhon API key
const DEFAULT_MODEL = process.env.AITYPHON_MODEL || 'default-model';

function getClient() {
  if (!BASE_URL) throw new Error('AITYPHON_BASE_URL is not set');
  if (!API_KEY) throw new Error('AITYPHON_API_KEY is not set');

  return axios.create({
    baseURL: BASE_URL,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  });
}

// Generic proxy to call arbitrary Typhon API path safely within the configured base URL
async function proxyRequest(method = 'POST', path = '/', data = undefined, params = undefined) {
  const client = getClient();
  try {
    const res = await client.request({ method, url: path, data, params });
    return res.data;
  } catch (err) {
    if (err.response) {
      const { status, data: respData } = err.response;
      const detail = typeof respData === 'string' ? respData : JSON.stringify(respData);
      throw Object.assign(new Error(`Typhon ${status}: ${detail}`), { status, data: respData });
    }
    throw err;
  }
}

// Example: OpenAI-compatible chat completions style (adjust path/shape if Typhon differs)
async function generateText(prompt, options = {}) {
  const client = getClient();
  const {
    model = DEFAULT_MODEL,
    max_tokens = 512,
    temperature = 0.7,
    system = 'You are a helpful assistant.',
    path = '/v1/chat/completions',
  } = options;

  const body = {
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: prompt },
    ],
    max_tokens,
    temperature,
  };

  try {
    const res = await client.post(path, body);
    return res.data;
  } catch (err) {
    if (err.response) {
      const { status, data: respData } = err.response;
      const detail = typeof respData === 'string' ? respData : JSON.stringify(respData);
      throw Object.assign(new Error(`Typhon ${status}: ${detail}`), { status, data: respData });
    }
    throw err;
  }
}

// Flexible chat completions helper that accepts a full chat-style payload from caller
// and attempts fallback paths if the primary path returns 404/405 (method/path not supported)
async function chatCompletions(payload = {}) {
  const client = getClient();
  // Accept either messages[] or a single prompt; if only prompt provided, wrap into messages.
  const {
    model = DEFAULT_MODEL,
    messages,
    prompt,
    temperature = 0.7,
    max_tokens = 1024,
    top_p = 0.9,
    repetition_penalty,
    stream = false,
  } = payload;

  let body = { model, temperature, max_tokens, top_p, stream };
  if (repetition_penalty !== undefined) body.repetition_penalty = repetition_penalty;

  if (Array.isArray(messages) && messages.length) {
    body.messages = messages;
  } else if (prompt) {
    // Fallback: some APIs expect prompt for non-chat endpoint; keep both to be safe
    body.messages = [{ role: 'user', content: prompt }];
    body.prompt = prompt;
  } else {
    throw new Error('Either messages[] or prompt is required');
  }

  // Candidate paths to try in order
  const pathsToTry = ['/v1/chat/completions', '/v1beta/chat/completions', '/v1/completions'];
  const errors = [];

  for (const path of pathsToTry) {
    try {
      const res = await client.post(path, body);
      return { pathUsed: path, data: res.data };
    } catch (err) {
      if (err.response) {
        const status = err.response.status;
        // Collect error info
        errors.push({ path, status, data: err.response.data });
        // Only fallback on 404/405; for others, break early
        if (![404, 405].includes(status)) {
          throw Object.assign(new Error(`Typhon ${status} at ${path}`), { status, data: err.response.data, attempts: errors });
        }
        // else continue to next path
      } else {
        // Network or other error: rethrow
        throw err;
      }
    }
  }

  // If all candidates failed with 404/405
  const finalError = new Error('All candidate chat/completion paths failed (404/405). Provide correct endpoint or update configuration.');
  finalError.attempts = errors;
  throw finalError;
}

module.exports = {
  proxyRequest,
  generateText,
  chatCompletions,
};
