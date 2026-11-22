import React, { useCallback, useMemo } from 'react';
import { usePage } from '@inertiajs/react';
import VariantsEditor from '../components/VariantsEditor';

function useOptionalPageProps() {
  try {
    const page = usePage();
    return page?.props || {};
  } catch {
    return {};
  }
}

function VariantsEditorControl({ initialValue, onChange }) {
  const pageProps = useOptionalPageProps();
  const messages = useMemo(() => pageProps?.messages || pageProps?.uiMessages || {}, [pageProps?.messages, pageProps?.uiMessages]);
  const t = useCallback((key) => messages[key] || key, [messages]);

  // adminizer's jsonEditor field reads the new value from `event.json`.
  const handleChange = useCallback(
    (variants) => {
      if (typeof onChange === 'function') onChange({ json: variants });
    },
    [onChange],
  );

  return <VariantsEditor value={initialValue} onChange={handleChange} t={t} />;
}

export default VariantsEditorControl;
