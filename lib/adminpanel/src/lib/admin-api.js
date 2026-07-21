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
