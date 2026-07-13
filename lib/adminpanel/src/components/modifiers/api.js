// Shared admin API helpers for the modifiers editor + preview popup.

export function getBaseAdminPath() {
  if (typeof window !== 'undefined' && typeof window.routePrefix === 'string' && window.routePrefix.trim()) {
    return window.routePrefix.replace(/\/$/, '');
  }
  const pathname = (typeof window !== 'undefined' && window.location.pathname) || '';
  const normalized = pathname.replace(/\/+$/, '');
  return normalized.replace(/\/[^/]*$/, '') || '/admin';
}

export async function apiGet(path) {
  // Prefer the shared admin fetcher when present; fall back to plain fetch.
  const base = getBaseAdminPath();
  const url = `${base}${path}`;
  if (typeof window !== 'undefined' && typeof window.adminApi === 'function') {
    return window.adminApi(url);
  }
  const res = await fetch(url, { headers: { Accept: 'application/json' }, credentials: 'same-origin' });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

/** multipart/form-data POST (option photo upload). Returns parsed JSON, throws on error. */
export async function apiPostForm(path, formData) {
  const base = getBaseAdminPath();
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    body: formData,
    headers: { Accept: 'application/json' },
    credentials: 'same-origin',
  });
  let payload = null;
  try { payload = await res.json(); } catch { /* non-json error body */ }
  if (!res.ok) throw new Error(payload?.error || `Request failed: ${res.status}`);
  return payload;
}
