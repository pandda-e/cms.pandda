// public/js/services/api.js
import { getToken, getAdminId, onChange } from '/js/auth/session.js';

const DEFAULT_HEADERS = { 'Content-Type': 'application/json' };

export async function request(path, opts = {}) {
  const token = getToken();
  const headers = { ...DEFAULT_HEADERS, ...(opts.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const adminId = getAdminId();
  if (adminId) headers['X-Admin-Id'] = adminId;

  const res = await fetch(path, { ...opts, headers, credentials: 'same-origin' });
  if (res.status === 401) {
    const err = new Error('Unauthorized');
    err.status = 401;
    throw err;
  }
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return res.json();
  return res.text();
}

onChange(() => { /* clear caches if needed */ });
