import React, { useCallback, useMemo } from 'react';
import { usePage } from '@inertiajs/react';
import ModifiersEditor from '../components/ModifiersEditor';

function normalizeLocale(rawLocale) {
  const normalized = String(rawLocale || '').trim().toLowerCase().replace(/_/g, '-');
  if (!normalized) return 'en';
  const base = normalized.split('-')[0];
  return base === 'uk' ? 'ua' : (base || normalized);
}

function createT(messages) {
  const dictionary = messages || {};
  return (key) => dictionary[key] || key;
}

function useOptionalPageProps() {
  try {
    const page = usePage();
    return page?.props || {};
  } catch {
    return {};
  }
}

function ModifiersEditorControl({ initialValue, onChange }) {
  const pageProps = useOptionalPageProps();
  const locale = useMemo(() => normalizeLocale(pageProps?.locale), [pageProps?.locale]);
  const messages = useMemo(() => pageProps?.messages || pageProps?.uiMessages || {}, [pageProps?.messages, pageProps?.uiMessages]);
  const t = useMemo(() => createT(messages), [messages, locale]);

  // adminizer's jsonEditor field reads the new value from `event.json`.
  const handleChange = useCallback(
    (modifiers) => {
      if (typeof onChange === 'function') onChange({ json: modifiers });
    },
    [onChange],
  );

  return <ModifiersEditor value={initialValue} onChange={handleChange} t={t} />;
}

export default ModifiersEditorControl;
