// Centralized API URL and helpers for frontend fetch calls
const RAW_BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'https://pac-pro-197980862836.us-west2.run.app';

export function getBackendUrl() {
  // Ensure no trailing slash
  return RAW_BACKEND_URL.replace(/\/+$/, '');
}

export function apiUrl(path) {
  let p = path.startsWith('/') ? path : `/${path}`;
  p = p.replace(/^\/api\/api(\/|$)/, '/api$1');

  const base = (process.env.REACT_APP_API_BASE || '').trim();
  if (process.env.NODE_ENV === 'production' || !base) return p; // keep relative in prod
  return `${base}${p}`;
}

export async function apiFetch(path, options = {}) {
  const url = apiUrl(path);
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`API ${res.status} ${url}`);
  return res;
}


// Optional helper: JSON fetch with sensible defaults
export async function fetchJson(path, options = {}) {
  const url = apiUrl(path);
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`HTTP ${res.status}: ${text || res.statusText}`);
    err.status = res.status;
    err.body = text;
    throw err;
  }
  // Some endpoints may return no content
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) return null;
  return res.json();
}


