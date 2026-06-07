import React from 'react';
import { styles } from './shared';
import TemplateEditor from './TemplateEditor';

const { Label, Button, Popover, PopoverTrigger, PopoverContent } = window.UIComponents;

export const TEMPLATE_FIELDS = [
  { key: 'title', kind: 'input' },
  { key: 'subject', kind: 'input' },
  { key: 'body', kind: 'textarea' },
  { key: 'clickUrl', kind: 'input' },
];

export const FIELD_LABELS = { title: 'Title', subject: 'Subject', body: 'Body', clickUrl: 'Click URL' };

// One template layer's field set (title/subject/body/clickUrl). content is a plain object,
// onChange receives the next object. Empty fields fall back to the base template on the server.
// Each field is a CodeMirror TemplateEditor with {{path}} highlight/autocomplete/linting
// driven by `contextPaths` (the event's flattened context schema + recipient.*).
export function TemplateFields({ content, onChange, t, basePlaceholder, contextPaths }) {
  const value = content && typeof content === 'object' ? content : {};
  const setField = (field, fieldValue) => {
    const next = { ...value };
    if (!fieldValue) delete next[field];
    else next[field] = fieldValue;
    onChange(next);
  };
  return (
    <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))' }}>
      {TEMPLATE_FIELDS.map((f) => (
        <div key={f.key} style={{ ...styles.field, gridColumn: f.key === 'body' ? '1 / -1' : 'auto' }}>
          <Label style={styles.fieldLabel}>{t(FIELD_LABELS[f.key])}</Label>
          <TemplateEditor
            value={value[f.key] || ''}
            onChange={(next) => setField(f.key, next)}
            contextPaths={contextPaths}
            singleLine={f.kind !== 'textarea'}
            placeholder={basePlaceholder ? t('Inherited from base') : (f.key === 'body' ? '{{order.shortId}}' : '')}
          />
        </div>
      ))}
    </div>
  );
}

// Read-only hint of the {{path}} variables available for this type's event. When the event
// exposes a typed context schema (`contextPaths`), shows the full field tree with types and
// descriptions; otherwise falls back to listing the top-level branches (legacy behaviour).
export function VariablesHint({ contextKeys, contextPaths, t }) {
  const paths = Array.isArray(contextPaths) ? contextPaths.filter((p) => p && p.path) : [];

  if (paths.length === 0) {
    const branches = [...(Array.isArray(contextKeys) ? contextKeys : []), 'recipient'];
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" type="button">ⓘ {t('Variables')}</Button>
        </PopoverTrigger>
        <PopoverContent style={{ maxWidth: 320 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <strong style={{ fontSize: 13 }}>{t('Available variables')}</strong>
            <p style={{ ...styles.help, margin: 0 }}>{t('Insert as {{path}}. Unknown paths render as empty.')}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
              {branches.map((b) => (
                <code key={b} style={{ ...styles.code, fontSize: 12, padding: '2px 6px', borderRadius: 6, background: 'var(--muted)' }}>{`{{ ${b}.* }}`}</code>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // Group leaf/field paths by their top-level branch for a readable tree.
  const groups = {};
  for (const p of paths) {
    const branch = p.path.split('.')[0];
    (groups[branch] = groups[branch] || []).push(p);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" type="button">ⓘ {t('Variables')}</Button>
      </PopoverTrigger>
      <PopoverContent style={{ maxWidth: 380, maxHeight: 420, overflow: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <strong style={{ fontSize: 13 }}>{t('Available variables')}</strong>
            <p style={{ ...styles.help, margin: '2px 0 0' }}>{t('Insert as {{path}}. Autocomplete appears inside {{ }}.')}</p>
          </div>
          {Object.keys(groups).map((branch) => (
            <div key={branch} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <code style={{ ...styles.code, fontSize: 12, fontWeight: 700 }}>{branch}</code>
              {groups[branch].map((p) => (
                <div key={p.path} style={{ display: 'flex', flexDirection: 'column', paddingLeft: 8 }}>
                  <span>
                    <code style={{ ...styles.code, fontSize: 12, padding: '1px 5px', borderRadius: 5, background: 'var(--muted)' }}>{`{{ ${p.path} }}`}</code>
                    <span style={{ ...styles.help, marginLeft: 6 }}>{p.type}{p.example !== undefined ? ` · e.g. ${p.example}` : ''}</span>
                  </span>
                  {p.description && <span style={{ ...styles.help, paddingLeft: 4 }}>{p.description}</span>}
                </div>
              ))}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// 'empty' | 'partial' | 'done' — used to badge per-locale completeness.
export function localeCompleteness(content) {
  const c = content && typeof content === 'object' ? content : {};
  if (!c.title && !c.body && !c.subject && !c.clickUrl) return 'empty';
  if (c.title && c.body) return 'done';
  return 'partial';
}
