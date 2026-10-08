// adminizer 5 moved the shared axios-like client from `window.adminApi` to
// `window.JSComponents.adminApi`. Read both so one bundle serves 4.x and 5.x.
export function getAdminApi() {
  if (typeof window === 'undefined') return null;
  return window.JSComponents?.adminApi || window.adminApi || null;
}

export function requireAdminApi() {
  const adminApi = getAdminApi();
  if (!adminApi) throw new Error('adminApi is not available');
  return adminApi;
}

/**
 * The message the server actually sent, or null when there is nothing usable.
 *
 * adminApi is not axios: its XHR client parses JSON only on a successful response, so on
 * 4xx/5xx `error.response.data` is the raw responseText and `error.message` is the generic
 * "Request failed with status NNN (url)". Reading only `response.data.error` — the axios
 * shape — therefore drops every explanation the API takes the trouble to send.
 */
export function extractApiErrorMessage(error) {
  const fromObject = (payload) => (
    payload && typeof payload === 'object' ? (payload.error || payload.message || null) : null
  );

  const data = error?.response?.data;
  if (typeof data === 'string') {
    const text = data.trim();
    // An HTML body is an error page (usually the login page after the session expired),
    // not a message meant for the user.
    if (text && !text.startsWith('<')) {
      try {
        const parsed = JSON.parse(text);
        const message = fromObject(parsed) || (typeof parsed === 'string' ? parsed : null);
        if (message) return String(message);
      } catch {
        // Not JSON — a short plain-text body is still worth showing as is.
        if (text.length <= 300) return text;
      }
    }
  }

  return fromObject(data) || error?.message || null;
}
