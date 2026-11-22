import { useEffect, useMemo, useState } from 'react';
import { apiGet } from '../components/modifiers/api';

// The core's controls are drawn on the panel's own model forms. The props of those pages do not carry
// the admin dictionary (Adminizer binds its model routes without the panel's middlewares), so the
// controls ask the core for it: once per page load, shared by every control of the page.
let loaded = null;
let request = null;

function load() {
  request ??= apiGet('/core/i18n/messages').then(
    (messages) => (loaded = messages || {}),
    // without the dictionary a control still works, in the keys (English)
    () => (loaded = {}),
  );
  return request;
}

/** `t` of the admin dictionary; `null` until it is loaded, so that a control is not drawn in English first. */
export function useAdminTranslation() {
  const [messages, setMessages] = useState(loaded);
  useEffect(() => {
    if (!messages) load().then(setMessages);
  }, [messages]);
  return useMemo(() => messages && ((key) => messages[key] || key), [messages]);
}
