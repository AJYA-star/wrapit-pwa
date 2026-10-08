/* WrapIt shared setup - loaded by every page BEFORE its own script.
   Change the live API address in ONE place: PRODUCTION_API below. */
const PRODUCTION_API = 'https://wrapit-backend-salar.onrender.com/api';
const LOCAL_API = 'http://localhost:5000/api';

const API_URL = (['localhost', '127.0.0.1'].includes(location.hostname) && !location.search.includes('prod'))
  ? LOCAL_API
  : PRODUCTION_API;

/* Order statuses - these MUST match the backend (models/order.js) */
const ORDER_STATUS_LABELS = {
  pending: 'Pending',
  accepted: 'Accepted',
  in_progress: 'Wrapping',
  ready: 'Ready',
  out_for_delivery: 'Out for delivery',
  completed: 'Completed',
  cancelled: 'Cancelled',
  rejected: 'Rejected'
};

/* What a shop owner may do next from each status (backend enforces the same rules) */
const ORDER_NEXT_STEPS = {
  pending: ['accepted', 'rejected'],
  accepted: ['in_progress', 'cancelled'],
  in_progress: ['ready', 'cancelled'],
  ready: ['out_for_delivery', 'completed'],
  out_for_delivery: ['completed'],
  completed: [],
  cancelled: [],
  rejected: []
};

/* Escape text before putting it in innerHTML (stops injected HTML/scripts) */
function esc(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function getToken() {
  try { return localStorage.getItem('token') || ''; } catch (e) { return ''; }
}

function getUser() {
  try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch (e) { return null; }
}

function logout() {
  try { localStorage.removeItem('token'); localStorage.removeItem('user'); } catch (e) {}
  window.location.href = 'index.html';
}

/* Only allow redirects to pages on this site (stops open-redirect tricks) */
function safeNext(value) {
  if (!value || /^[a-z]+:/i.test(value) || value.startsWith('//') || value.startsWith('\\')) return null;
  return value;
}

/* fetch wrapper: adds the token, 60s timeout (Render free tier cold starts), readable errors.
   Throws Error with .status when the request fails. Returns parsed JSON. */
async function api(path, options = {}) {
  const headers = { Accept: 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = 'Bearer ' + token;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(API_URL + path, {
      ...options,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal
    });

    let data = null;
    try { data = await response.json(); } catch (e) { /* not JSON */ }

    if (!response.ok || (data && data.success === false)) {
      const error = new Error((data && data.message) || ('Request failed (' + response.status + ')'));
      error.status = response.status;
      throw error;
    }
    return data || {};
  } catch (error) {
    if (error.name === 'AbortError') {
      const e = new Error('The server is taking too long to respond. It may be waking up - please try again in a moment.');
      e.status = 0;
      throw e;
    }
    if (error instanceof TypeError) {
      const e = new Error('Could not connect to the server. Check your internet connection and try again.');
      e.status = 0;
      throw e;
    }
    throw error;
  }
}

/* Register the service worker on every page that loads this file */
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  });
}
