import { auth } from '../config/firebase-config';
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

export async function apiFetchJson(path, { method = 'GET', headers = {}, body } = {}) {
  const token = await auth.currentUser?.getIdToken?.();
  const finalHeaders = {
    ...(body != null ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  };
  const res = await fetch(apiUrl(path), {
    method,
    headers: finalHeaders,
    credentials: 'include',
    body: body != null ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status} ${path}: ${text}`);
  }
  return res.json().catch(() => ({}));
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


