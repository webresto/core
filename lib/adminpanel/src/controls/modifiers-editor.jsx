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

// Edited-dish context for the preview popup (spec §5.2): id from the edit-form URL,
// name/price/description from the inertia form fields (these are the SAVED values —
// the preview reflects unsaved edits of the `modifiers` field only).
function extractDishMeta(pageProps) {
  const pathname = (typeof window !== 'undefined' && window.location.pathname) || '';
  const idMatch = pathname.match(/\/model\/dish\/edit\/([^/?#]+)/i);
  const id = idMatch ? decodeURIComponent(idMatch[1]) : null;

  const fields = Array.isArray(pageProps?.fields) ? pageProps.fields : [];
  const fieldValue = (name) => {
    const field = fields.find((f) => f && f.name === name);
    return field ? field.value : undefined;
  };
  const rawPrice = fieldValue('price');
  const price = rawPrice === undefined || rawPrice === null || rawPrice === '' ? null : Number(rawPrice);

  return {
    id,
    name: typeof fieldValue('name') === 'string' ? fieldValue('name') : null,
    price: Number.isFinite(price) ? price : null,
    description: typeof fieldValue('description') === 'string' ? fieldValue('description') : null,
  };
}

function ModifiersEditorControl({ initialValue, onChange }) {
  const pageProps = useOptionalPageProps();
  const locale = useMemo(() => normalizeLocale(pageProps?.locale), [pageProps?.locale]);
  const messages = useMemo(() => pageProps?.messages || pageProps?.uiMessages || {}, [pageProps?.messages, pageProps?.uiMessages]);
  const t = useMemo(() => createT(messages), [messages, locale]);
  const dishMeta = useMemo(() => extractDishMeta(pageProps), [pageProps]);

  // adminizer's jsonEditor field reads the new value from `event.json`.
  const handleChange = useCallback(
    (modifiers) => {
      if (typeof onChange === 'function') onChange({ json: modifiers });
    },
    [onChange],
  );

  return <ModifiersEditor value={initialValue} onChange={handleChange} t={t} dishMeta={dishMeta} />;
}

export default ModifiersEditorControl;
