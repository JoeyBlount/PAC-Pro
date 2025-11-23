// Centralized API URL and helpers for frontend fetch calls
const RAW_BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'https://pac-pro-197980862836.us-west2.run.app';

export function getBackendUrl() {
  // Ensure no trailing slash
  return RAW_BACKEND_URL.replace(/\/+$/, '');
}

export function apiUrl(path) {
  const cleaned = path.startsWith('/') ? path : `/${path}`;

  // In dev, use relative path so CRA dev server proxies to pac-pro-api:8080
  if (process.env.NODE_ENV !== 'production') {
    return cleaned; // -> "/api/..." goes to http://localhost:3000/api/... and proxy forwards it
  }

  // In prod, use explicit base; allow override by env
  const base = process.env.REACT_APP_API_BASE || window.__API_BASE__ || '';
  return `${base}${cleaned}`;
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


