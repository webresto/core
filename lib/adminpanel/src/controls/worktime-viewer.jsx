import React, { useCallback, useMemo } from 'react';
import { usePage } from '@inertiajs/react';
import WorktimeEditor from '../components/WorktimeView';

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

function WorktimeViewer({ initialValue, onChange }) {
  const pageProps = useOptionalPageProps();
  const locale = useMemo(() => normalizeLocale(pageProps?.locale), [pageProps?.locale]);
  const messages = useMemo(() => pageProps?.messages || pageProps?.uiMessages || {}, [pageProps?.messages, pageProps?.uiMessages]);
  const t = useMemo(() => createT(messages), [messages, locale]);

  // The adminizer jsonEditor field reads the new value from `event.json`, so
  // wrap the editor's plain WorkTime[] output to match that contract.
  const handleChange = useCallback(
    (worktime) => {
      if (typeof onChange === 'function') onChange({ json: worktime });
    },
    [onChange],
  );

  return <WorktimeEditor value={initialValue} onChange={handleChange} t={t} />;
}

export default WorktimeViewer;
