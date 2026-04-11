import React, { useState, useEffect, useRef } from 'react';

const APPEARANCE_KEY = 'adminizer-appearance';

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = e => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);
  return isMobile;
}

function isDarkAppearance() {
  const stored = localStorage.getItem(APPEARANCE_KEY) || 'system';
  if (stored === 'dark') return true;
  if (stored === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function useDarkMode() {
  const [dark, setDark] = useState(isDarkAppearance);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setDark(isDarkAppearance());
    mq.addEventListener('change', handler);
    window.addEventListener('storage', handler);
    return () => {
      mq.removeEventListener('change', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);
  return dark;
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function getAdminPrefix() {
  // Derive routePrefix from current pathname: /admin/settings-manager → /admin
  const parts = window.location.pathname.split('/');
  // parts = ['', 'admin', 'settings-manager', ...]
  return '/' + (parts[1] || 'admin');
}

async function apiGet(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function apiPost(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

function typeLabel(type) {
  return { string: 'String', boolean: 'Boolean', number: 'Number', json: 'JSON' }[type] || type;
}

function typeColor(type) {
  return {
    string: '#3b82f6',
    boolean: '#10b981',
    number: '#f59e0b',
    json: '#8b5cf6',
  }[type] || '#6b7280';
}

// ──────────────────────────────────────────────────────────────────────────────
// Field editors
// ──────────────────────────────────────────────────────────────────────────────

function StringEditor({ value, onChange, readOnly, st }) {
  const inputStyle = st?.inputStyle || {};
  const base = { ...inputStyle, resize: 'vertical', fontFamily: 'inherit' };
  return (
    <textarea
      readOnly={readOnly}
      value={value == null ? '' : String(value)}
      onChange={e => onChange(e.target.value)}
      rows={4}
      style={readOnly ? { ...base, opacity: 0.7 } : base}
    />
  );
}

function NumberEditor({ value, onChange, readOnly, st }) {
  const inputStyle = st?.inputStyle || {};
  return (
    <input
      type="number"
      readOnly={readOnly}
      value={value == null ? '' : value}
      onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))}
      style={readOnly ? { ...inputStyle, opacity: 0.7 } : inputStyle}
    />
  );
}

function BooleanEditor({ value, onChange, readOnly, st }) {
  const inputStyle = st?.inputStyle || {};
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 4 }}>
      {[true, false].map(opt => (
        <label key={String(opt)} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: readOnly ? 'default' : 'pointer', fontSize: 14, color: inputStyle.color }}>
          <input
            type="radio"
            disabled={readOnly}
            checked={value === opt}
            onChange={() => onChange(opt)}
          />
          {opt ? 'true' : 'false'}
        </label>
      ))}
    </div>
  );
}

function JsonEditor({ value, schema, onChange, readOnly, st }) {
  const inputStyle = st?.inputStyle || {};
  const [raw, setRaw] = useState('');
  const [parseError, setParseError] = useState(null);
  const [schemaErrors, setSchemaErrors] = useState([]);

  useEffect(() => {
    try {
      setRaw(value == null ? '' : JSON.stringify(value, null, 2));
      setParseError(null);
    } catch {
      setRaw('');
    }
  }, [value]);

  function handleChange(text) {
    setRaw(text);
    try {
      const parsed = JSON.parse(text);
      setParseError(null);
      const errs = schema ? validateAgainstSchema(parsed, schema) : [];
      setSchemaErrors(errs);
      onChange(parsed);
    } catch (e) {
      setParseError(e.message);
    }
  }

  const taStyle = {
    ...inputStyle,
    resize: 'vertical',
    fontFamily: 'monospace',
    fontSize: 13,
    border: parseError ? '1.5px solid #ef4444' : inputStyle.border,
    ...(readOnly ? { opacity: 0.7 } : {}),
  };

  return (
    <div>
      {schema && <div style={{ marginBottom: 8 }}><SchemaHint schema={schema} st={st} /></div>}
      <textarea
        readOnly={readOnly}
        value={raw}
        onChange={e => handleChange(e.target.value)}
        rows={14}
        spellCheck={false}
        style={taStyle}
      />
      {parseError && (
        <div style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>Parse error: {parseError}</div>
      )}
      {schemaErrors.map((e, i) => (
        <div key={i} style={{ color: '#f59e0b', fontSize: 12, marginTop: 2 }}>Schema: {e}</div>
      ))}
    </div>
  );
}

// Very minimal JSON Schema validation (top-level type, required, enum)
function validateAgainstSchema(value, schema) {
  const errors = [];
  if (!schema || typeof schema !== 'object') return errors;
  const { type, required, enum: enumVals, minimum, maximum, minLength, maxLength } = schema;

  if (type) {
    const actual = Array.isArray(value) ? 'array' : typeof value;
    const expected = Array.isArray(type) ? type : [type];
    if (!expected.includes(actual) && !(actual === 'number' && expected.includes('integer'))) {
      errors.push(`Expected type ${expected.join('|')}, got ${actual}`);
    }
  }
  if (enumVals && !enumVals.includes(value)) {
    errors.push(`Value must be one of: ${enumVals.join(', ')}`);
  }
  if (typeof value === 'number') {
    if (minimum != null && value < minimum) errors.push(`Minimum is ${minimum}`);
    if (maximum != null && value > maximum) errors.push(`Maximum is ${maximum}`);
  }
  if (typeof value === 'string') {
    if (minLength != null && value.length < minLength) errors.push(`Min length is ${minLength}`);
    if (maxLength != null && value.length > maxLength) errors.push(`Max length is ${maxLength}`);
  }
  if (required && typeof value === 'object' && value !== null && !Array.isArray(value)) {
    for (const key of required) {
      if (!(key in value)) errors.push(`Missing required field: ${key}`);
    }
  }
  return errors;
}

function SchemaHint({ schema, st }) {
  const lines = [];
  if (schema.description) lines.push(schema.description);
  if (schema.type) lines.push(`Type: ${Array.isArray(schema.type) ? schema.type.join(' | ') : schema.type}`);
  if (schema.enum) lines.push(`Enum: ${schema.enum.join(', ')}`);
  if (schema.properties) lines.push('Fields: ' + Object.keys(schema.properties).join(', '));
  if (!lines.length) return null;
  return (
    <div style={st.schemaHint}>
      <div style={{ fontWeight: 600, marginBottom: 4, color: '#8b5cf6' }}>JSON Schema</div>
      {lines.map((l, i) => <div key={i}>{l}</div>)}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────────────────────────────────────

export default function SettingsManager() {
  const prefix = getAdminPrefix();
  const apiBase = `${prefix}/core/settings-manager`;
  const isMobile = useIsMobile();
  const dark = useDarkMode();
  const st = makeStyles(dark);

  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [editValue, setEditValue] = useState(undefined);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [mobileListOpen, setMobileListOpen] = useState(false);
  const searchRef = useRef(null);

  // ── Load all settings ──────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    apiGet(`${apiBase}/list`)
      .then(data => {
        setSettings(data);
        setLoading(false);
      })
      .catch(e => {
        setError(e.message);
        setLoading(false);
      });
  }, [apiBase]);

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filtered = settings.filter(s => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      s.key.toLowerCase().includes(q) ||
      (s.name || '').toLowerCase().includes(q) ||
      (s.module || '').toLowerCase().includes(q)
    );
  });

  // ── Select setting ─────────────────────────────────────────────────────────
  function selectSetting(s) {
    setSelected(s);
    setEditValue(s.value !== undefined && s.value !== null ? s.value : s.defaultValue);
    setSaveError(null);
    setSaveSuccess(false);
    if (isMobile) {
      setMobileListOpen(false);
      setSearch('');
    }
  }

  // ── Open mobile list ───────────────────────────────────────────────────────
  function openMobileList() {
    setMobileListOpen(true);
    setSearch('');
    setTimeout(() => searchRef.current?.focus(), 50);
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const updated = await apiPost(`${apiBase}/update/${encodeURIComponent(selected.key)}`, { value: editValue });
      // Patch list in place
      setSettings(prev => prev.map(s => s.key === updated.key ? { ...s, ...updated } : s));
      setSelected(prev => ({ ...prev, ...updated }));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  }

  // ── Reset to default ───────────────────────────────────────────────────────
  function handleReset() {
    if (!selected) return;
    setEditValue(selected.defaultValue);
    setSaveError(null);
    setSaveSuccess(false);
  }

  // ── Shared: list items ─────────────────────────────────────────────────────
  const listItems = (
    <>
      {loading && <div style={st.stateMsg}>Loading…</div>}
      {error && <div style={{ ...st.stateMsg, color: '#ef4444' }}>Error: {error}</div>}
      {filtered.map(s => (
        <button
          key={s.key}
          onClick={() => selectSetting(s)}
          style={{
            ...st.listItem,
            background: selected?.key === s.key ? st.listItemActive.background : 'transparent',
            borderLeft: selected?.key === s.key ? `3px solid ${typeColor(s.type)}` : '3px solid transparent',
          }}
        >
          <div style={st.listItemKey}>{s.key}</div>
          {s.name && <div style={st.listItemName}>{s.name}</div>}
          <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
            <span style={{ ...st.badge, background: typeColor(s.type) }}>{typeLabel(s.type)}</span>
            {s.module && <span style={st.moduleBadge}>{s.module}</span>}
            {s.readOnly && <span style={st.readOnlyBadge}>read-only</span>}
            {s.isRequired && <span style={st.requiredBadge}>required</span>}
          </div>
        </button>
      ))}
      {!loading && filtered.length === 0 && (
        <div style={st.stateMsg}>No settings found</div>
      )}
    </>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={st.mobileRoot}>
        {/* ── Mobile top bar ── */}
        <div style={st.mobileTopBar}>
          <button onClick={openMobileList} style={st.mobileSelectBtn}>
            <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selected ? selected.key : 'Select setting…'}
            </span>
            <span style={{ opacity: 0.5, fontSize: 12 }}>▼</span>
          </button>
        </div>

        {/* ── Mobile dropdown list ── */}
        {mobileListOpen && (
          <div style={st.mobileOverlay} onClick={() => setMobileListOpen(false)}>
            <div style={st.mobileSheet} onClick={e => e.stopPropagation()}>
              <div style={st.mobileSheetHeader}>
                <input
                  ref={searchRef}
                  type="search"
                  placeholder="Search by key…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={st.searchInput}
                />
              </div>
              <div style={st.mobileList}>
                {listItems}
              </div>
            </div>
          </div>
        )}

        {/* ── Mobile editor ── */}
        <div style={st.mobileEditor}>
          <EditorPanel st={st}
            selected={selected}
            editValue={editValue}
            setEditValue={setEditValue}
            saving={saving}
            saveError={saveError}
            saveSuccess={saveSuccess}
            handleSave={handleSave}
            handleReset={handleReset}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={st.root}>
      {/* ── Left panel: list ── */}
      <div style={st.sidebar}>
        <div style={st.sidebarHeader}>
          <div style={st.sidebarTitle}>Settings</div>
          <input
            type="search"
            placeholder="Search by key…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={st.searchInput}
          />
        </div>
        <div style={st.list}>
          {listItems}
        </div>
      </div>

      {/* ── Right panel: editor ── */}
      <div style={st.editor}>
        <EditorPanel st={st}
          selected={selected}
          editValue={editValue}
          setEditValue={setEditValue}
          saving={saving}
          saveError={saveError}
          saveSuccess={saveSuccess}
          handleSave={handleSave}
          handleReset={handleReset}
        />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Editor panel (shared between desktop and mobile)
// ──────────────────────────────────────────────────────────────────────────────

function EditorPanel({ selected, editValue, setEditValue, saving, saveError, saveSuccess, handleSave, handleReset, st }) {
  if (!selected) {
    return (
      <div style={st.editorEmpty}>
        <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>⚙</div>
        <div style={{ color: 'var(--muted-foreground, #94a3b8)', fontSize: 15 }}>
          Select a setting from the list to edit it
        </div>
      </div>
    );
  }
  return (
    <div style={st.editorContent}>
      {/* Header */}
      <div style={st.editorHeader}>
        <div>
          <div style={st.editorKey}>{selected.key}</div>
          {selected.name && <div style={st.editorName}>{selected.name}</div>}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ ...st.badge, background: typeColor(selected.type), fontSize: 13 }}>
            {typeLabel(selected.type)}
          </span>
          {selected.module && <span style={st.moduleBadge}>{selected.module}</span>}
          {selected.readOnly && <span style={st.readOnlyBadge}>read-only</span>}
        </div>
      </div>

      {/* Description / tooltip */}
      {selected.description && (
        <div style={st.descBlock}>{selected.description}</div>
      )}
      {selected.tooltip && selected.tooltip !== selected.description && (
        <div style={{ ...st.descBlock, fontStyle: 'italic', opacity: 0.8 }}>
          💡 {selected.tooltip}
        </div>
      )}

      {/* Value editor */}
      <div style={st.fieldBlock}>
        <label style={st.fieldLabel}>Value</label>
        {selected.type === 'string' && (
          <StringEditor value={editValue} onChange={setEditValue} readOnly={selected.readOnly} st={st} />
        )}
        {selected.type === 'number' && (
          <NumberEditor value={editValue} onChange={setEditValue} readOnly={selected.readOnly} st={st} />
        )}
        {selected.type === 'boolean' && (
          <BooleanEditor value={editValue} onChange={setEditValue} readOnly={selected.readOnly} st={st} />
        )}
        {selected.type === 'json' && (
          <JsonEditor
            value={editValue}
            schema={selected.jsonSchema}
            onChange={setEditValue}
            readOnly={selected.readOnly}
            st={st}
          />
        )}
      </div>

      {/* Default value info */}
      {selected.defaultValue !== undefined && selected.defaultValue !== null && (
        <div style={st.defaultBlock}>
          <span style={{ opacity: 0.6, marginRight: 6 }}>Default:</span>
          <code style={st.defaultCode}>
            {typeof selected.defaultValue === 'object'
              ? JSON.stringify(selected.defaultValue)
              : String(selected.defaultValue)}
          </code>
        </div>
      )}

      {/* Errors / success */}
      {saveError && <div style={st.errorMsg}>⚠ {saveError}</div>}
      {saveSuccess && <div style={st.successMsg}>✓ Saved successfully</div>}

      {/* Actions */}
      {!selected.readOnly && (
        <div style={st.actions}>
          <button onClick={handleSave} disabled={saving} style={st.btnSave}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          {selected.defaultValue !== undefined && selected.defaultValue !== null && (
            <button onClick={handleReset} disabled={saving} style={st.btnSecondary}>
              Reset to default
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────────────────────────────────────

function makeStyles(dark) {
  const t = dark ? {
    bg:           '#0f172a',
    bgSidebar:    '#0a0f1e',
    bgInput:      '#1e293b',
    bgMuted:      '#1e293b',
    bgAccent:     '#1e293b',
    bgSheet:      '#0f172a',
    border:       '#1e293b',
    borderInput:  '#334155',
    text:         '#e2e8f0',
    textMuted:    '#94a3b8',
    textSecond:   '#cbd5e1',
    codeText:     '#e2e8f0',
    // status
    errorBg:      '#2d0e0e',
    errorBorder:  '#7f1d1d',
    errorText:    '#fca5a5',
    successBg:    '#052e16',
    successBorder:'#166534',
    successText:  '#86efac',
    // badges
    readOnlyBg:   '#3b0e0e',
    readOnlyText: '#fca5a5',
    requiredBg:   '#2d1f00',
    requiredText: '#fde68a',
    moduleBg:     '#1e293b',
    moduleText:   '#94a3b8',
    // primary btn
    primaryBg:    '#e2e8f0',
    primaryText:  '#0f172a',
  } : {
    bg:           '#ffffff',
    bgSidebar:    '#f8fafc',
    bgInput:      '#ffffff',
    bgMuted:      '#f8fafc',
    bgAccent:     '#f1f5f9',
    bgSheet:      '#ffffff',
    border:       '#e2e8f0',
    borderInput:  '#e2e8f0',
    text:         '#0f172a',
    textMuted:    '#94a3b8',
    textSecond:   '#64748b',
    codeText:     '#0f172a',
    // status
    errorBg:      '#fef2f2',
    errorBorder:  '#fecaca',
    errorText:    '#b91c1c',
    successBg:    '#f0fdf4',
    successBorder:'#bbf7d0',
    successText:  '#15803d',
    // badges
    readOnlyBg:   '#fee2e2',
    readOnlyText: '#b91c1c',
    requiredBg:   '#fef9c3',
    requiredText: '#854d0e',
    moduleBg:     '#e2e8f0',
    moduleText:   '#475569',
    // primary btn
    primaryBg:    '#0f172a',
    primaryText:  '#ffffff',
  };

  return {
    root: {
      display: 'flex', height: '100%', minHeight: 0, overflow: 'hidden',
      fontFamily: 'inherit', position: 'absolute', inset: 0,
      background: t.bg, color: t.text,
    },
    sidebar: {
      width: 300, minWidth: 220, maxWidth: 380, height: '100%',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      borderRight: `1px solid ${t.border}`,
      background: t.bgSidebar,
    },
    sidebarHeader: {
      padding: '16px 12px 10px', flexShrink: 0,
      borderBottom: `1px solid ${t.border}`,
    },
    sidebarTitle: {
      fontWeight: 700, fontSize: 16, marginBottom: 10, color: t.text,
    },
    searchInput: {
      width: '100%', padding: '7px 10px', borderRadius: 6, outline: 'none',
      border: `1.5px solid ${t.borderInput}`,
      background: t.bgInput, color: t.text,
      fontSize: 13, boxSizing: 'border-box',
    },
    list: { flex: 1, overflowY: 'auto', padding: '6px 0' },
    listItem: {
      display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px',
      border: 'none', cursor: 'pointer', background: 'transparent',
      transition: 'background 0.1s', color: t.text,
      borderBottom: `1px solid ${t.border}`,
    },
    listItemActive: { background: t.bgAccent },
    listItemKey: {
      fontFamily: 'monospace', fontSize: 12, fontWeight: 600,
      wordBreak: 'break-all', color: t.text,
    },
    listItemName: { fontSize: 12, marginTop: 2, color: t.textSecond },
    badge: {
      display: 'inline-block', color: '#fff', fontSize: 10,
      fontWeight: 600, padding: '2px 6px', borderRadius: 4,
    },
    moduleBadge: {
      display: 'inline-block', fontSize: 10, fontWeight: 500,
      padding: '2px 6px', borderRadius: 4,
      background: t.moduleBg, color: t.moduleText,
    },
    readOnlyBadge: {
      display: 'inline-block', fontSize: 10, fontWeight: 600,
      padding: '2px 6px', borderRadius: 4,
      background: t.readOnlyBg, color: t.readOnlyText,
    },
    requiredBadge: {
      display: 'inline-block', fontSize: 10, fontWeight: 600,
      padding: '2px 6px', borderRadius: 4,
      background: t.requiredBg, color: t.requiredText,
    },
    stateMsg: {
      padding: '20px 16px', color: t.textMuted, fontSize: 13, textAlign: 'center',
    },
    editor: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
    editorEmpty: {
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', color: t.textMuted,
    },
    editorContent: {
      flex: 1, overflowY: 'auto', padding: '24px 28px',
      display: 'flex', flexDirection: 'column', gap: 16,
    },
    editorHeader: {
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      gap: 12, flexWrap: 'wrap',
    },
    editorKey: {
      fontFamily: 'monospace', fontSize: 17, fontWeight: 700,
      color: t.text, wordBreak: 'break-all',
    },
    editorName: { fontSize: 13, color: t.textSecond, marginTop: 3 },
    descBlock: {
      background: t.bgMuted, border: `1px solid ${t.border}`,
      borderRadius: 6, padding: '10px 14px', fontSize: 13,
      color: t.textSecond, lineHeight: 1.5,
    },
    fieldBlock: { display: 'flex', flexDirection: 'column', gap: 6 },
    fieldLabel: { fontSize: 13, fontWeight: 600, color: t.text },
    defaultBlock: {
      fontSize: 12, color: t.textSecond, display: 'flex',
      alignItems: 'center', flexWrap: 'wrap', gap: 4,
    },
    defaultCode: {
      fontFamily: 'monospace', background: t.bgMuted, color: t.codeText,
      padding: '2px 6px', borderRadius: 4, fontSize: 12,
      maxWidth: '100%', wordBreak: 'break-all',
    },
    inputStyle: {
      width: '100%', padding: '8px 12px', borderRadius: 6, outline: 'none',
      border: `1.5px solid ${t.borderInput}`,
      background: t.bgInput, color: t.text,
      fontSize: 14, boxSizing: 'border-box',
    },
    errorMsg: {
      background: t.errorBg, border: `1px solid ${t.errorBorder}`,
      borderRadius: 6, padding: '10px 14px', color: t.errorText, fontSize: 13,
    },
    successMsg: {
      background: t.successBg, border: `1px solid ${t.successBorder}`,
      borderRadius: 6, padding: '10px 14px', color: t.successText, fontSize: 13,
    },
    actions: { display: 'flex', gap: 10, alignItems: 'center', marginTop: 4 },
    btnSave: {
      padding: '9px 22px', borderRadius: 6, border: 'none',
      background: t.primaryBg, color: t.primaryText,
      fontWeight: 600, fontSize: 14, cursor: 'pointer',
    },
    btnSecondary: {
      padding: '9px 16px', borderRadius: 6,
      border: `1.5px solid ${t.border}`,
      background: 'transparent', color: t.text,
      fontWeight: 500, fontSize: 14, cursor: 'pointer',
    },
    schemaHint: {
      background: t.bgMuted, border: `1px solid ${t.border}`,
      borderRadius: 6, padding: '8px 12px', fontSize: 12, color: t.textSecond,
    },
    // ── Mobile ────────────────────────────────────────────────────────────────
    mobileRoot: {
      display: 'flex', flexDirection: 'column', position: 'absolute',
      inset: 0, fontFamily: 'inherit', overflow: 'hidden',
      background: t.bg, color: t.text,
    },
    mobileTopBar: {
      flexShrink: 0, padding: '10px 12px',
      borderBottom: `1px solid ${t.border}`,
      background: t.bgSidebar,
    },
    mobileSelectBtn: {
      width: '100%', display: 'flex', alignItems: 'center', gap: 8,
      padding: '9px 12px', borderRadius: 8,
      border: `1.5px solid ${t.borderInput}`,
      background: t.bgInput, color: t.text,
      fontSize: 13, fontFamily: 'monospace', fontWeight: 600,
      cursor: 'pointer', textAlign: 'left',
    },
    mobileOverlay: {
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-start',
    },
    mobileSheet: {
      background: t.bgSheet,
      borderBottomLeftRadius: 16, borderBottomRightRadius: 16,
      maxHeight: '75vh', display: 'flex', flexDirection: 'column',
      overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    },
    mobileSheetHeader: {
      padding: '12px 12px 8px', flexShrink: 0,
      borderBottom: `1px solid ${t.border}`,
    },
    mobileList: { overflowY: 'auto', flex: 1 },
    mobileEditor: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  };
}
