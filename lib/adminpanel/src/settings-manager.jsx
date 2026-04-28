import React, { useState, useEffect, useRef, useMemo } from 'react';
import { I18nProvider, useTranslation } from './i18n/I18nContext';

const APPEARANCE_STORAGE_KEY = 'appearance';

function getPreferredAppearance() {
  return localStorage.getItem(APPEARANCE_STORAGE_KEY) || 'system';
}

function isDarkAppearance(appearance) {
  if (appearance === 'dark') return true;
  if (appearance === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function useAppearance() {
  const [appearance, setAppearance] = useState(getPreferredAppearance);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sync = () => setAppearance(getPreferredAppearance());
    const media = typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : null;
    sync();
    window.addEventListener('appearanceChanged', sync);
    window.addEventListener('storage', sync);
    media?.addEventListener('change', sync);
    return () => {
      window.removeEventListener('appearanceChanged', sync);
      window.removeEventListener('storage', sync);
      media?.removeEventListener('change', sync);
    };
  }, []);
  return useMemo(() => isDarkAppearance(appearance), [appearance]);
}

const {
  Button, Badge, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetClose,
  Input, Textarea, Label, Separator, Checkbox, Skeleton,
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} = window.UIComponents;

const { MonacoEditor } = window.JSComponents;
const { Settings, Download, Upload, RotateCcw, Save, ChevronDown } = window.LucideReact;

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

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

function getAdminPrefix() {
  const parts = window.location.pathname.split('/');
  return '/' + (parts[1] || 'admin');
}

function getBaseAdminPath() {
  if (typeof window !== 'undefined' && typeof window.routePrefix === 'string' && window.routePrefix.trim()) {
    return window.routePrefix.replace(/\/$/, '');
  }
  return getAdminPrefix();
}

async function apiRequest(path, options = {}) {
  const axios = window.axios;
  if (!axios) throw new Error('window.axios is not available');
  try {
    const response = await axios({
      url: `${getBaseAdminPath()}${path}`,
      method: options.method || 'GET',
      data: options.body,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(options.headers || {}) },
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    throw new Error(error?.response?.data?.error || error?.response?.data?.message || error?.message || 'Request failed');
  }
}

async function apiGet(url) { return apiRequest(url); }
async function apiPost(url, body) { return apiRequest(url, { method: 'POST', body }); }

function typeLabel(type, t) {
  return { string: t('Type string'), boolean: t('Type boolean'), number: t('Type number'), json: t('Type json') }[type] || type;
}

function typeVariant(type) {
  return { string: 'default', boolean: 'secondary', number: 'outline', json: 'destructive' }[type] || 'outline';
}

// ──────────────────────────────────────────────────────────────────────────────
// Field editors
// ──────────────────────────────────────────────────────────────────────────────

function StringEditor({ value, onChange, readOnly }) {
  return (
    <Textarea
      readOnly={readOnly}
      value={value == null ? '' : String(value)}
      onChange={e => onChange(e.target.value)}
      rows={4}
      className={readOnly ? 'opacity-70' : ''}
    />
  );
}

function NumberEditor({ value, onChange, readOnly }) {
  return (
    <Input
      type="number"
      readOnly={readOnly}
      value={value == null ? '' : value}
      onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))}
      className={readOnly ? 'opacity-70' : ''}
    />
  );
}

function BooleanEditor({ value, onChange, readOnly, t }) {
  return (
    <div className="flex gap-6 mt-1">
      {[true, false].map(opt => (
        <label key={String(opt)} className="flex items-center gap-2 cursor-pointer text-sm">
          <input
            type="radio"
            disabled={readOnly}
            checked={value === opt}
            onChange={() => onChange(opt)}
          />
          {opt ? t('Boolean true') : t('Boolean false')}
        </label>
      ))}
    </div>
  );
}

function JsonEditor({ value, schema, onChange, readOnly, t }) {
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
      setSchemaErrors(schema ? validateAgainstSchema(parsed, schema, t) : []);
      onChange(parsed);
    } catch (e) {
      setParseError(e.message);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {schema && <SchemaHint schema={schema} t={t} />}
      <MonacoEditor
        value={raw}
        onChange={handleChange}
        options={{ language: 'json' }}
        disabled={readOnly}
      />
      {parseError && (
        <p className="text-destructive text-xs">{t('Parse error')}: {parseError}</p>
      )}
      {schemaErrors.map((e, i) => (
        <p key={i} className="text-yellow-500 text-xs">{t('Schema error')}: {e}</p>
      ))}
    </div>
  );
}

function validateAgainstSchema(value, schema, t) {
  const errors = [];
  if (!schema || typeof schema !== 'object') return errors;
  const { type, required, enum: enumVals, minimum, maximum, minLength, maxLength } = schema;
  if (type) {
    const actual = Array.isArray(value) ? 'array' : typeof value;
    const expected = Array.isArray(type) ? type : [type];
    if (!expected.includes(actual) && !(actual === 'number' && expected.includes('integer'))) {
      errors.push(t('Schema expected type', { expected: expected.join('|'), actual }));
    }
  }
  if (enumVals && !enumVals.includes(value)) errors.push(t('Schema enum', { values: enumVals.join(', ') }));
  if (typeof value === 'number') {
    if (minimum != null && value < minimum) errors.push(t('Schema minimum', { value: minimum }));
    if (maximum != null && value > maximum) errors.push(t('Schema maximum', { value: maximum }));
  }
  if (typeof value === 'string') {
    if (minLength != null && value.length < minLength) errors.push(t('Schema min length', { value: minLength }));
    if (maxLength != null && value.length > maxLength) errors.push(t('Schema max length', { value: maxLength }));
  }
  if (required && typeof value === 'object' && value !== null && !Array.isArray(value)) {
    for (const key of required) {
      if (!(key in value)) errors.push(t('Schema required field', { key }));
    }
  }
  return errors;
}

function SchemaHint({ schema, t }) {
  const lines = [];
  if (schema.description) lines.push(schema.description);
  if (schema.type) lines.push(t('Schema type hint', { value: Array.isArray(schema.type) ? schema.type.join(' | ') : schema.type }));
  if (schema.enum) lines.push(t('Schema enum hint', { value: schema.enum.join(', ') }));
  if (schema.properties) lines.push(t('Schema fields hint', { value: Object.keys(schema.properties).join(', ') }));
  if (!lines.length) return null;
  return (
    <div className="bg-muted border rounded-md px-3 py-2 text-xs text-muted-foreground">
      <div className="font-semibold mb-1 text-purple-500">{t('Json schema')}</div>
      {lines.map((l, i) => <div key={i}>{l}</div>)}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Editor panel (shared between desktop and mobile)
// ──────────────────────────────────────────────────────────────────────────────

function EditorPanel({ selected, editValue, setEditValue, saving, saveError, saveSuccess, handleSave, handleReset, t }) {
  if (!selected) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
        <Settings className="w-10 h-10 mb-3 opacity-30" />
        <p className="text-sm">{t('Select hint')}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="font-mono text-base font-bold break-all">{selected.key}</div>
          {selected.name && <div className="text-sm text-muted-foreground mt-1">{selected.name}</div>}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Badge variant={typeVariant(selected.type)}>{typeLabel(selected.type, t)}</Badge>
          {selected.module && <Badge variant="secondary">{selected.module}</Badge>}
          {selected.readOnly && <Badge variant="destructive">{t('Read only')}</Badge>}
        </div>
      </div>

      {/* Description / tooltip */}
      {selected.description && (
        <div className="bg-muted border rounded-md px-3 py-2 text-sm text-muted-foreground leading-relaxed">
          {selected.description}
        </div>
      )}
      {selected.tooltip && selected.tooltip !== selected.description && (
        <div className="bg-muted border rounded-md px-3 py-2 text-sm text-muted-foreground italic leading-relaxed">
          💡 {selected.tooltip}
        </div>
      )}

      {/* Value editor */}
      <div className="flex flex-col gap-2">
        <Label>{t('Value')}</Label>
        {selected.type === 'string' && (
          <StringEditor value={editValue} onChange={setEditValue} readOnly={selected.readOnly} />
        )}
        {selected.type === 'number' && (
          <NumberEditor value={editValue} onChange={setEditValue} readOnly={selected.readOnly} />
        )}
        {selected.type === 'boolean' && (
          <BooleanEditor value={editValue} onChange={setEditValue} readOnly={selected.readOnly} t={t} />
        )}
        {selected.type === 'json' && (
          <JsonEditor value={editValue} schema={selected.jsonSchema} onChange={setEditValue} readOnly={selected.readOnly} t={t} />
        )}
      </div>

      {/* Default value */}
      {selected.defaultValue !== undefined && selected.defaultValue !== null && (
        <div className="text-xs text-muted-foreground flex items-center flex-wrap gap-1">
          <span className="opacity-60">{t('Default')}:</span>
          <code className="text-xs font-mono break-all" style={{ background: 'var(--muted)', padding: '2px 5px', borderRadius: 4 }}>
            {typeof selected.defaultValue === 'object' ? JSON.stringify(selected.defaultValue) : String(selected.defaultValue)}
          </code>
        </div>
      )}

      {/* Status messages */}
      {saveError && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2 text-sm text-destructive">
          ⚠ {saveError}
        </div>
      )}
      {saveSuccess && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-md px-3 py-2 text-sm text-green-600 dark:text-green-400">
          ✓ {t('Saved successfully')}
        </div>
      )}

      {/* Actions */}
      {!selected.readOnly && (
        <div className="flex gap-2 items-center mt-1">
          <Button variant="default" size="sm" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-1" />
            {saving ? t('Saving') : t('Save')}
          </Button>
          {selected.defaultValue !== undefined && selected.defaultValue !== null && (
            <Button variant="outline" size="sm" onClick={handleReset} disabled={saving}>
              <RotateCcw className="w-4 h-4 mr-1" />
              {t('Reset to default')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Import dialog
// ──────────────────────────────────────────────────────────────────────────────

function ImportDialog({ open, onOpenChange, diff, selected, setSelected, result, importing, onApply, t }) {
  const changedCount = diff ? diff.filter(d => d.status === 'changed').length : 0;
  const selectedCount = Object.values(selected).filter(Boolean).length;

  const statusLabel = (status) => {
    const map = { applied: 'Applied', changed: 'Changed', unchanged: 'Unchanged', skipped: 'Skipped', error: 'Error' };
    const key = map[String(status || '').toLowerCase()] || status;
    const tr = t(key);
    return tr === key ? status : tr;
  };

  function toggleAll(val) {
    const next = {};
    for (const d of diff) {
      if (!d.readOnly) next[d.key] = val && d.status === 'changed';
    }
    setSelected(next);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('Import settings')}</DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="flex-1 overflow-y-auto flex flex-col gap-2 px-1">
            <p className="font-semibold text-sm mb-1">
              {t('Applied count', { applied: result.filter(r => r.status === 'applied').length, total: result.length })}
            </p>
            {result.map(r => (
              <div key={r.key} className="flex gap-2 items-center text-sm">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${r.status === 'applied' ? 'bg-green-500' : 'bg-destructive'}`} />
                <code className="font-mono text-xs flex-1">{r.key}</code>
                <span className="text-muted-foreground text-xs">{statusLabel(r.status)}{r.error ? `: ${r.error}` : ''}</span>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="text-sm text-muted-foreground flex items-center justify-between px-1 py-1">
              <span>{t('Changed unchanged', { changed: changedCount, unchanged: (diff?.length || 0) - changedCount })}</span>
              <div className="flex gap-3">
                <Button variant="ghost" size="sm" onClick={() => toggleAll(true)}>{t('Select all changed')}</Button>
                <Button variant="ghost" size="sm" onClick={() => toggleAll(false)}>{t('Deselect all')}</Button>
              </div>
            </div>
            <Separator />
            <div className="flex-1 overflow-y-auto">
              {diff?.map(d => (
                <label key={d.key} className={`flex items-start gap-3 px-1 py-3 border-b cursor-pointer ${d.status === 'unchanged' ? 'opacity-50' : ''} ${d.readOnly || d.status !== 'changed' ? 'cursor-default' : ''}`}>
                  <Checkbox
                    className="mt-0.5 flex-shrink-0"
                    disabled={d.readOnly || d.status !== 'changed'}
                    checked={!!selected[d.key]}
                    onCheckedChange={v => setSelected(prev => ({ ...prev, [d.key]: v }))}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex gap-2 items-center flex-wrap">
                      <code className="font-mono text-xs font-bold">{d.key}</code>
                      <Badge variant={d.status === 'changed' ? 'outline' : 'secondary'} style={{ fontSize: 10 }}>
                        {statusLabel(d.status)}
                      </Badge>
                      {d.readOnly && <Badge variant="destructive" style={{ fontSize: 10 }}>{t('Read only')}</Badge>}
                    </div>
                    {d.status === 'changed' && (
                      <div className="mt-2 flex flex-col gap-1 text-xs">
                        <div className="flex gap-2">
                          <span className="opacity-50 w-14 flex-shrink-0">{t('Current')}:</span>
                          <code className="font-mono break-all flex-1" style={{ background: 'var(--destructive-muted, #fef2f2)', color: 'var(--destructive, #b91c1c)', padding: '2px 5px', borderRadius: 4 }}>
                            {JSON.stringify(d.currentValue)}
                          </code>
                        </div>
                        <div className="flex gap-2">
                          <span className="opacity-50 w-14 flex-shrink-0">{t('Import')}:</span>
                          <code className="font-mono break-all flex-1" style={{ background: 'var(--success-muted, #f0fdf4)', color: 'var(--success, #15803d)', padding: '2px 5px', borderRadius: 4 }}>
                            {JSON.stringify(d.importValue)}
                          </code>
                        </div>
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
            <Separator />
            <DialogFooter className="flex items-center justify-between sm:justify-between">
              <span className="text-xs text-muted-foreground">{t('Selected count', { count: selectedCount })}</span>
              <div className="flex gap-2">
                <DialogClose asChild>
                  <Button variant="outline" size="sm">{t('Cancel')}</Button>
                </DialogClose>
                <Button
                  variant="default"
                  size="sm"
                  onClick={onApply}
                  disabled={importing || selectedCount === 0}
                >
                  {importing ? t('Applying') : t('Apply count', { count: selectedCount })}
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Settings list item
// ──────────────────────────────────────────────────────────────────────────────

function SettingListItem({ s, isActive, onSelect, t }) {
  return (
    <button
      onClick={() => onSelect(s)}
      className="block w-full text-left transition-colors hover:bg-accent"
      style={{
        padding: '10px 12px',
        borderBottom: '1px solid color-mix(in srgb, var(--foreground) 15%, transparent)',
        borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
        background: isActive ? 'var(--accent)' : 'transparent',
        paddingLeft: isActive ? 9 : 9,
      }}
    >
      <div className="font-mono text-xs font-semibold break-all">{s.key}</div>
      {s.name && <div className="text-xs text-muted-foreground" style={{ marginTop: 2 }}>{s.name}</div>}
      <div className="flex gap-1 flex-wrap" style={{ marginTop: 5 }}>
        <Badge variant={typeVariant(s.type)} style={{ fontSize: 10, padding: '1px 5px' }}>{typeLabel(s.type, t)}</Badge>
        {s.module && <Badge variant="secondary" style={{ fontSize: 10, padding: '1px 5px' }}>{s.module}</Badge>}
        {s.readOnly && <Badge variant="destructive" style={{ fontSize: 10, padding: '1px 5px' }}>{t('Read only')}</Badge>}
        {s.isRequired && <Badge variant="outline" style={{ fontSize: 10, padding: '1px 5px' }}>{t('Required')}</Badge>}
      </div>
    </button>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────────────────────────────────────

function SettingsManagerContent() {
  const { t } = useTranslation();
  const apiBase = '/core/settings-manager';
  const isMobile = useIsMobile();
  useAppearance(); // subscribe to theme changes to trigger re-render

  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [editValue, setEditValue] = useState(undefined);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const searchRef = useRef(null);
  const fileInputRef = useRef(null);

  const [importOpen, setImportOpen] = useState(false);
  const [importDiff, setImportDiff] = useState(null);
  const [importPayload, setImportPayload] = useState(null);
  const [importSelected, setImportSelected] = useState({});
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  useEffect(() => {
    setLoading(true);
    apiGet(`${apiBase}/list`)
      .then(data => {
        setSettings(data);
        setLoading(false);
        const hashKey = decodeURIComponent(window.location.hash.slice(1));
        if (hashKey) {
          const found = data.find(s => s.key === hashKey);
          if (found) selectSetting(found);
        }
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [apiBase]);

  const filtered = settings.filter(s => {
    const q = search.toLowerCase();
    if (!q) return true;
    return s.key.toLowerCase().includes(q) || (s.name || '').toLowerCase().includes(q) || (s.module || '').toLowerCase().includes(q);
  });

  function selectSetting(s) {
    setSelected(s);
    setEditValue(s.value !== undefined && s.value !== null ? s.value : s.defaultValue);
    setSaveError(null);
    setSaveSuccess(false);
    window.location.hash = encodeURIComponent(s.key);
    if (isMobile) {
      setMobileSheetOpen(false);
      setSearch('');
    }
  }

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const updated = await apiPost(`${apiBase}/update/${encodeURIComponent(selected.key)}`, { value: editValue });
      setSettings(prev => prev.map(s => s.key === updated.key ? { ...s, ...updated } : s));
      setSelected(prev => ({ ...prev, ...updated }));
      setSaveSuccess(true);
      window.sonner?.toast(t('Saved successfully'));
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (e) {
      setSaveError(e.message);
      window.sonner?.toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    if (!selected) return;
    setEditValue(selected.defaultValue);
    setSaveError(null);
    setSaveSuccess(false);
  }

  async function handleExport() {
    try {
      const axios = window.axios;
      const response = await axios({
        url: `${getBaseAdminPath()}/core/settings-manager/export`,
        method: 'GET',
        responseType: 'blob',
        withCredentials: true,
      });
      const blob = new Blob([response.data], { type: 'application/json' });
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = `settings-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      window.sonner?.toast.error(`${t('Export failed')}: ${e?.message || String(e)}`);
    }
  }

  async function handleFilePicked(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    let json;
    try {
      json = JSON.parse(await file.text());
    } catch {
      window.sonner?.toast.error(t('Invalid json file'));
      return;
    }
    if (!Array.isArray(json?.settings)) {
      window.sonner?.toast.error(t('Invalid json format'));
      return;
    }
    try {
      const result = await apiPost(`${apiBase}/import`, { preview: true, settings: json.settings });
      setImportPayload(json.settings);
      setImportDiff(result.diff);
      const sel = {};
      for (const d of result.diff) sel[d.key] = d.status === 'changed';
      setImportSelected(sel);
      setImportResult(null);
      setImportOpen(true);
    } catch (err) {
      window.sonner?.toast.error(`${t('Preview failed')}: ${err.message}`);
    }
  }

  async function handleImportApply() {
    const keys = Object.keys(importSelected).filter(k => importSelected[k]);
    if (!keys.length) return;
    setImporting(true);
    try {
      const result = await apiPost(`${apiBase}/import`, { settings: importPayload, keys });
      setImportResult(result.results);
      const fresh = await apiGet(`${apiBase}/list`);
      setSettings(fresh);
      if (selected) {
        const updated = fresh.find(s => s.key === selected.key);
        if (updated) {
          setSelected(updated);
          setEditValue(updated.value !== undefined && updated.value !== null ? updated.value : updated.defaultValue);
        }
      }
    } catch (err) {
      window.sonner?.toast.error(`${t('Import failed')}: ${err.message}`);
    } finally {
      setImporting(false);
    }
  }

  function closeImport() {
    setImportOpen(false);
    setImportDiff(null);
    setImportPayload(null);
    setImportResult(null);
  }

  const listContent = (
    <>
      {loading && (
        <div className="flex flex-col gap-2 p-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="w-full rounded-md" style={{ height: 56 }} />)}
        </div>
      )}
      {error && <p className="p-4 text-sm text-destructive text-center">{t('Error')}: {error}</p>}
      {filtered.map(s => (
        <SettingListItem key={s.key} s={s} isActive={selected?.key === s.key} onSelect={selectSetting} t={t} />
      ))}
      {!loading && filtered.length === 0 && (
        <p className="p-4 text-sm text-muted-foreground text-center">{t('No settings')}</p>
      )}
    </>
  );

  if (isMobile) {
    return (
      <div className="absolute inset-0 flex flex-col overflow-hidden" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
        {/* Mobile top bar */}
        <div className="flex-shrink-0 p-3 border-b" style={{ background: 'var(--muted)' }}>
          <Button
            variant="outline"
            className="w-full justify-between font-mono text-sm"
            onClick={() => { setMobileSheetOpen(true); setSearch(''); setTimeout(() => searchRef.current?.focus(), 50); }}
          >
            <span className="truncate">{selected ? selected.key : t('Select setting')}</span>
            <ChevronDown className="w-4 h-4 opacity-50 flex-shrink-0" />
          </Button>
        </div>

        {/* Mobile sheet with list */}
        <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
          <SheetContent side="top" className="flex flex-col p-0" style={{ height: '75vh' }}>
            <SheetHeader className="p-3 border-b flex-shrink-0">
              <SheetTitle className="sr-only">{t('Title')}</SheetTitle>
              <Input
                ref={searchRef}
                type="search"
                placeholder={t('Search by key')}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </SheetHeader>
            <div className="flex-1 overflow-y-auto">
              {listContent}
            </div>
          </SheetContent>
        </Sheet>

        {/* Mobile editor */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <EditorPanel
            t={t}
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
    <div className="absolute inset-0 flex overflow-hidden" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
      {/* Left panel: list */}
      <div className="w-80 flex flex-col overflow-hidden border-r" style={{ minWidth: 260, maxWidth: 420, background: 'var(--muted)' }}>
        <div className="flex-shrink-0 p-3 border-b">
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold text-base">{t('Title')}</span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={handleExport} title={t('Export json')}>
                <Download className="w-3.5 h-3.5 mr-1" />
                {t('Export')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} title={t('Import json')}>
                <Upload className="w-3.5 h-3.5 mr-1" />
                {t('Import')}
              </Button>
              <input ref={fileInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleFilePicked} />
            </div>
          </div>
          <Input
            type="search"
            placeholder={t('Search by key')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {listContent}
        </div>
      </div>

      {/* Right panel: editor */}
      <div className="flex-1 overflow-hidden flex flex-col" style={{ background: 'var(--background)' }}>
        <EditorPanel
          t={t}
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

      {/* Import dialog */}
      <ImportDialog
        open={importOpen}
        onOpenChange={v => { if (!v) closeImport(); }}
        diff={importDiff}
        selected={importSelected}
        setSelected={setImportSelected}
        result={importResult}
        importing={importing}
        onApply={handleImportApply}
        t={t}
      />
    </div>
  );
}

export default function SettingsManager({ props }) {
  const locale = props?.locale || 'en';
  return (
    <I18nProvider initialLocale={locale} messages={props?.messages}>
      <SettingsManagerContent />
    </I18nProvider>
  );
}
