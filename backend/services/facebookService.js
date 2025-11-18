const axios = require('axios');

function getConfig() {
  const PAGE_ID = (process.env.FACEBOOK_PAGE_ID || '').trim();
  const ACCESS_TOKEN = (process.env.FACEBOOK_ACCESS_TOKEN || '').trim();
  const GRAPH_VERSION = (process.env.FACEBOOK_GRAPH_VERSION || 'v19.0').trim();
  if (!PAGE_ID) throw new Error('FACEBOOK_PAGE_ID is not set');
  if (!ACCESS_TOKEN) throw new Error('FACEBOOK_ACCESS_TOKEN is not set');
  return { PAGE_ID, ACCESS_TOKEN, GRAPH_VERSION };
}

async function postToPageFeed(message, link) {
  const { PAGE_ID, ACCESS_TOKEN, GRAPH_VERSION } = getConfig();
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(PAGE_ID)}/feed`;
  const params = { message, access_token: ACCESS_TOKEN };
  if (link) params.link = link;
  try {
    const { data } = await axios.post(url, null, { params, timeout: 20000 });
    return data; // { id: 'PAGE_POST_ID' }
  } catch (err) {
    const status = err.response?.status;
    const data = err.response?.data;
    const msg = data?.error?.message || err.message;
    const code = data?.error?.code;
    const type = data?.error?.type;
    const fbtrace_id = data?.error?.fbtrace_id;
    const error = new Error(`Facebook Graph API error (${status || 'n/a'}): ${msg}`);
    error.status = status || 500;
    error.details = { code, type, fbtrace_id, data, requestUrl: url, graphVersion: GRAPH_VERSION };
    throw error;
  }
}

// Simple verifier to check page access & token permissions
async function verifyPageAccess(overrides) {
  const base = getConfig();
  const PAGE_ID = String((overrides && overrides.PAGE_ID) || base.PAGE_ID).trim();
  const ACCESS_TOKEN = String((overrides && overrides.ACCESS_TOKEN) || base.ACCESS_TOKEN).trim();
  const GRAPH_VERSION = String((overrides && overrides.GRAPH_VERSION) || base.GRAPH_VERSION).trim();
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(PAGE_ID)}`;
  const params = { access_token: ACCESS_TOKEN, fields: 'id,name' };
  try {
    const { data } = await axios.get(url, { params, timeout: 10000 });
    return { ok: true, data, graphVersion: GRAPH_VERSION, used: { pageId: PAGE_ID, graphVersion: GRAPH_VERSION } };
  } catch (err) {
    const status = err.response?.status;
    const data = err.response?.data;
    return { ok: false, status, error: data?.error || { message: err.message }, requestUrl: url, graphVersion: GRAPH_VERSION };
  }
}

module.exports = { postToPageFeed, verifyPageAccess };
