// Shared helpers + style vocabulary for the notifications module sections.
// Mirrors the conventions of the existing notifications-manager.jsx (axios wrapper,
// routePrefix-based base path, inline-style tokens aligned with the Adminizer UI guide).

export function getBaseAdminPath() {
  if (typeof window !== 'undefined' && typeof window.routePrefix === 'string' && window.routePrefix.trim()) {
    return window.routePrefix.replace(/\/$/, '');
  }
  const pathname = (typeof window !== 'undefined' && window.location.pathname) || '';
  const normalized = pathname.replace(/\/+$/, '');
  return normalized.replace(/\/[^/]*$/, '');
}

// notificationsApi(path, opts) -> { ok, status, payload } on top of window.axios.
export async function notificationsApi(path, options = {}) {
  const axios = window.axios;
  if (!axios) throw new Error('window.axios is not available');
  try {
    const response = await axios({
      url: `${getBaseAdminPath()}${path}`,
      method: options.method || 'GET',
      data: options.body ? JSON.parse(options.body) : undefined,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      withCredentials: true,
    });
    return { ok: true, status: response.status, payload: response.data };
  } catch (error) {
    return {
      ok: false,
      status: error?.response?.status || 500,
      payload: error?.response?.data || { error: error?.message || 'Request failed' },
    };
  }
}

export function formatDateTime(value, language) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat(language, {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(date);
}

export function safeJson(value) {
  try { return JSON.stringify(value, null, 2); } catch { return String(value); }
}

// Toast helper around window.sonner (a mounted <Toaster/> is provided by the host app).
export function toast(kind, message) {
  try {
    const sonner = window.sonner;
    if (sonner && typeof sonner.toast === 'function') {
      if (kind === 'error' && sonner.toast.error) return sonner.toast.error(message);
      if (kind === 'success' && sonner.toast.success) return sonner.toast.success(message);
      return sonner.toast(message);
    }
  } catch { /* sonner unavailable */ }
  return undefined;
}

export const COST_NUM_STYLE = { fontVariantNumeric: 'tabular-nums' };

// Shared inline-style vocabulary (UI guideline tokens via CSS variables).
export const styles = {
  pageShell: { padding: 24, display: 'flex', flexDirection: 'column', gap: 24, color: 'var(--foreground)', background: 'var(--background)', minHeight: '100%' },
  panel: { border: '1px solid var(--border)', borderRadius: 14, background: 'var(--card)', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 },
  subsection: { border: '1px solid var(--border)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 14, background: 'var(--card)' },
  subsectionTitle: { margin: 0, fontSize: 16, lineHeight: '24px', fontWeight: 700 },
  sectionTitle: { margin: 0, fontSize: 20, lineHeight: '28px', fontWeight: 700 },
  sectionDescription: { margin: '4px 0 0', color: 'var(--muted-foreground)', fontSize: 14, lineHeight: '20px', maxWidth: 680 },
  fieldLabel: { fontSize: 13, fontWeight: 600 },
  help: { fontSize: 12, lineHeight: '16px', color: 'var(--muted-foreground)' },
  code: { fontFamily: 'monospace' },
  input: { padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', width: '100%', boxSizing: 'border-box' },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
};

// Locale-code validation used when the configured locale list is empty (§4.5 fallback).
export const LOCALE_CODE_REGEX = /^[a-z]{2}(-[A-Z]{2})?$/;

// snake_case key validation, mirrors NotificationTypeRegistry.validate.
export const TYPE_KEY_REGEX = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;
