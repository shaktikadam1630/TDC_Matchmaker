/**
 * Thin fetch wrapper: JSON in/out, bearer token, consistent errors, global 401 handling.
 * Token lives in localStorage for simplicity; production hardening = httpOnly cookie + CSRF token.
 */
const BASE = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '');
const TOKEN_KEY = 'tdc_token';

export class ApiError extends Error {
  constructor(message, status, code, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const tokenStore = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: (t) => { try { localStorage.setItem(TOKEN_KEY, t); } catch { /* private mode */ } },
  clear: () => { try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } },
};

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

async function request(path, { method = 'GET', body, signal } = {}) {
  const token = tokenStore.get();
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      signal,
      headers: {
        ...(body && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0, 'NETWORK');
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const e = data?.error;
    // Expired/invalid session on an authenticated call -> force sign-out (not for the login call itself).
    if (res.status === 401 && token && path !== '/auth/login') onUnauthorized();
    throw new ApiError(e?.message ?? `Request failed (${res.status})`, res.status, e?.code, e?.details);
  }
  return data;
}

const qs = (params) => {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v !== undefined && v !== '' && v !== null && sp.set(k, v));
  const s = sp.toString();
  return s ? `?${s}` : '';
};

export const api = {
  login: (username, password) => request('/auth/login', { method: 'POST', body: { username, password } }),
  me: (signal) => request('/auth/me', { signal }),
  customers: (params, signal) => request(`/customers${qs(params)}`, { signal }),
  stats: (signal) => request('/customers/stats', { signal }),
  customer: (id, signal) => request(`/customers/${id}`, { signal }),
  setStatus: (id, status) => request(`/customers/${id}/status`, { method: 'PATCH', body: { status } }),
  addNote: (id, text) => request(`/customers/${id}/notes`, { method: 'POST', body: { text } }),
  deleteNote: (id, noteId) => request(`/customers/${id}/notes/${noteId}`, { method: 'DELETE' }),
  matches: (id, params, signal) => request(`/customers/${id}/matches${qs(params)}`, { signal }),
  ask: (id, question, verifiedOnly) => request(`/customers/${id}/matches/ask`, { method: 'POST', body: { question, verifiedOnly } }),
  draftIntro: (id, profileId, signal) => request(`/customers/${id}/matches/${profileId}/intro`, { method: 'POST', signal }),
  sendMatch: (id, profileId, subject, body) =>
    request(`/customers/${id}/matches/${profileId}/send`, { method: 'POST', body: { subject, body } }),
  sent: (id, signal) => request(`/customers/${id}/sent`, { signal }),
};
