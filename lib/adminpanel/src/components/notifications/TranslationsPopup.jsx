import React, { useMemo, useState } from 'react';
import { styles, LOCALE_CODE_REGEX } from './shared';
import { TemplateFields, VariablesHint, localeCompleteness } from './TemplateFields';

const { Input, Label, Badge, Button } = window.UIComponents;

/**
 * Translations popup (modal). Edits per-locale translations for the notification rule's
 * template — they live in the rule's `templates.locales` (NotificationRules model) and are
 * persisted together with the rule on save, then applied by the renderer at send time.
 *
 * Controlled component: `value` is the templates.locales object, `onChange(next)` writes it
 * back into the draft. Empty fields inherit from the base template. Initially empty.
 */
export default function TranslationsPopup({
  isOpen, onClose, value, onChange, t, locales, defaultLocale, contextKeys, contextPaths,
}) {
  const localesValue = value && typeof value === 'object' ? value : {};

  const localeList = useMemo(() => {
    const configured = Array.isArray(locales) ? locales : [];
    const existing = Object.keys(localesValue);
    return Array.from(new Set([...configured, ...existing])).filter(Boolean);
  }, [locales, localesValue]);

  const [activeLocale, setActiveLocale] = useState(() => {
    const existing = Object.keys(localesValue);
    return existing[0] || (Array.isArray(locales) ? locales.find((l) => l !== defaultLocale) : '') || '';
  });
  const [newLocale, setNewLocale] = useState('');

  if (!isOpen) return null;

  const setLocaleContent = (loc, content) => {
    onChange({ ...localesValue, [loc]: content });
  };

  const addLocale = () => {
    const code = String(newLocale || '').trim();
    if (!code || !LOCALE_CODE_REGEX.test(code)) return;
    if (!localesValue[code]) setLocaleContent(code, {});
    setActiveLocale(code);
    setNewLocale('');
  };

  const removeLocale = (loc) => {
    const next = { ...localesValue };
    delete next[loc];
    onChange(next);
    if (activeLocale === loc) setActiveLocale(Object.keys(next)[0] || '');
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
      <div style={{
        position: 'relative', background: 'var(--card)', color: 'var(--foreground)', border: '1px solid var(--border)',
        borderRadius: 14, boxShadow: 'var(--shadow, 0 10px 40px rgba(0,0,0,0.3))', width: 'min(720px, 94vw)',
        maxHeight: '90vh', overflow: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <h2 style={{ ...styles.sectionTitle, fontSize: 18 }}>{t('Translations')}</h2>
            <p style={{ ...styles.help, margin: '2px 0 0' }}>
              {t('Per-locale overrides for this notification. Empty fields inherit from the base template.')}
            </p>
          </div>
          <VariablesHint contextKeys={contextKeys} contextPaths={contextPaths} t={t} />
        </div>

        {/* Locale picker */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {localeList.map((loc) => {
            const status = localeCompleteness(localesValue?.[loc]);
            const active = loc === activeLocale;
            return (
              <button key={loc} type="button" onClick={() => setActiveLocale(loc)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 9,
                  border: active ? '1px solid var(--primary)' : '1px solid var(--border)',
                  background: active ? 'var(--accent)' : 'var(--card)', color: 'var(--foreground)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                }}>
                <span style={styles.code}>{loc}</span>
                {loc === defaultLocale && <Badge variant="secondary">{t('Default')}</Badge>}
                {status === 'done' && <Badge variant="secondary">{t('Complete')}</Badge>}
                {status === 'partial' && <Badge variant="outline">{t('Missing fields')}</Badge>}
              </button>
            );
          })}
          <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            <Input value={newLocale} onChange={(e) => setNewLocale(e.target.value)} placeholder={t('Add locale (e.g. ru)')} style={{ width: 150 }} />
            <Button variant="outline" size="sm" type="button" onClick={addLocale} disabled={!LOCALE_CODE_REGEX.test(String(newLocale || '').trim())}>+ {t('Add')}</Button>
          </div>
        </div>

        {/* Active locale editor */}
        {activeLocale ? (
          <div style={{ ...styles.subsection }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Label style={styles.fieldLabel}>{t('Locale')}: <code style={styles.code}>{activeLocale}</code></Label>
              <Button variant="ghost" size="sm" type="button" onClick={() => removeLocale(activeLocale)}>{t('Remove')}</Button>
            </div>
            <TemplateFields content={localesValue?.[activeLocale] || {}} onChange={(c) => setLocaleContent(activeLocale, c)} t={t} contextPaths={contextPaths} basePlaceholder />
          </div>
        ) : (
          <p style={styles.help}>{t('Add a locale to start translating.')}</p>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <Button type="button" onClick={onClose}>{t('Close')}</Button>
        </div>
      </div>
    </div>
  );
}
