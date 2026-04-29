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
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} = window.UIComponents;

const { VanillaJSONEditor } = window.JSComponents;
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

function getSettingValue(setting) {
  return setting?.value !== undefined && setting?.value !== null ? setting.value : setting?.defaultValue;
}

function valuesEqual(a, b) {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return Object.is(a, b);
  }
}

function isTextEditingTarget(target) {
  if (!target) return false;
  const tagName = target.tagName?.toLowerCase();
  return target.isContentEditable || tagName === 'input' || tagName === 'textarea' || tagName === 'select'
    || !!target.closest?.('.vanilla-jsoneditor-react');
}

function getSchemaTypes(schema) {
  const type = schema?.type;
  return Array.isArray(type) ? type : type ? [type] : [];
}

function isIntegerSchema(schema) {
  return getSchemaTypes(schema).includes('integer');
}

function enumOptionToValue(option) {
  return option === null ? '__NULL__' : String(option);
}

function valueToEnumOption(value, enumValues, schema) {
  const selected = enumValues.find(option => enumOptionToValue(option) === value);
  if (selected !== undefined) return selected;
  if (value === '__NULL__') return null;
  if (getSchemaTypes(schema).some(type => type === 'number' || type === 'integer')) return Number(value);
  if (getSchemaTypes(schema).includes('boolean')) return value === 'true';
  return value;
}

// ──────────────────────────────────────────────────────────────────────────────
// Field editors
// ──────────────────────────────────────────────────────────────────────────────

function EnumEditor({ value, schema, onChange, readOnly, placeholder }) {
  const enumValues = Array.isArray(schema?.enum) ? schema.enum : [];

  return (
    <Select
      disabled={readOnly}
      value={value === undefined || value === null ? undefined : enumOptionToValue(value)}
      onValueChange={next => onChange(valueToEnumOption(next, enumValues, schema))}
    >
      <SelectTrigger className={readOnly ? 'opacity-70' : ''}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-72" style={{ maxHeight: 288 }}>
        {enumValues.map(option => (
          <SelectItem key={enumOptionToValue(option)} value={enumOptionToValue(option)}>
            {option === null ? 'null' : String(option)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function StringEditor({ value, onChange, readOnly, schema, t }) {
  if (Array.isArray(schema?.enum)) {
    return <EnumEditor value={value} schema={schema} onChange={onChange} readOnly={readOnly} placeholder={t('Select value')} />;
  }

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

function NumberEditor({ value, onChange, readOnly, schema, t }) {
  if (Array.isArray(schema?.enum)) {
    return <EnumEditor value={value} schema={schema} onChange={onChange} readOnly={readOnly} placeholder={t('Select value')} />;
  }

  const min = schema?.minimum ?? schema?.exclusiveMinimum;
  const max = schema?.maximum ?? schema?.exclusiveMaximum;

  return (
    <Input
      type="number"
      min={min}
      max={max}
      step={isIntegerSchema(schema) ? 1 : 'any'}
      readOnly={readOnly}
      value={value == null ? '' : value}
      onChange={e => {
        if (e.target.value === '') {
          onChange(null);
          return;
        }
        onChange(isIntegerSchema(schema) ? parseInt(e.target.value, 10) : Number(e.target.value));
      }}
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

// JsonEditor wraps VanillaJSONEditor.
//
// Root cause of the {"json": [...]} wrapping bug:
// VanillaJSONEditor has two useEffects that call updateProps:
//   1. useEffect([props.content]) — wraps correctly as {json: content}
//   2. useEffect([props]) — sends changedProps including content WITHOUT the
//      {json:} wrapper, which corrupts the editor on every parent re-render.
//
// Fix: pass a stable onChange reference so filterUnchangedProps never detects
// a change in onChange, preventing useEffect([props]) from running updateProps
// with a broken content value. Content itself is stable per-selection.
function JsonEditor({ value, schema, onChange, onValidation, readOnly }) {
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;
  const onValidationRef = React.useRef(onValidation);
  onValidationRef.current = onValidation;
  const containerRef = React.useRef(null);

  // Poll for parse-error indicator in the DOM (vanilla-jsoneditor shows a red banner
  // but does NOT call onChange when JSON is invalid — so we poll instead)
  React.useEffect(() => {
    if (!onValidationRef.current) return;
    const interval = setInterval(() => {
      if (!containerRef.current) return;
      const hasParseError = !!containerRef.current.querySelector('.jse-message.jse-error, .jse-validation-errors');
      onValidationRef.current(hasParseError);
    }, 300);
    return () => clearInterval(interval);
  }, []);

  const stableOnChange = React.useCallback((content, _prev, status) => {
    if (onValidationRef.current) {
      const hasParseError = !!status?.contentErrors?.parseError;
      const hasValidationErrors = Array.isArray(status?.contentErrors?.validationErrors)
        && status.contentErrors.validationErrors.length > 0;
      onValidationRef.current(hasParseError || hasValidationErrors);
    }
    if (content?.json !== undefined) onChangeRef.current(content.json);
    else if (content?.text !== undefined) {
      try { onChangeRef.current(JSON.parse(content.text)); } catch {}
    }
  }, []);

  return (
    <div ref={containerRef}>
      <VanillaJSONEditor
        content={value ?? null}
        schema={schema}
        disabled={readOnly}
        onChange={stableOnChange}
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Editor panel (shared between desktop and mobile)
// ──────────────────────────────────────────────────────────────────────────────

function EditorPanel({ selected, editValue, setEditValue, saving, saveError, saveSuccess, handleSave, handleReset, t }) {
  const [jsonHasErrors, setJsonHasErrors] = useState(false);
  // Reset validation state when a different setting is selected
  React.useEffect(() => { setJsonHasErrors(false); }, [selected?.key]);

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
          <StringEditor value={editValue} onChange={setEditValue} readOnly={selected.readOnly} schema={selected.jsonSchema} t={t} />
        )}
        {selected.type === 'number' && (
          <NumberEditor value={editValue} onChange={setEditValue} readOnly={selected.readOnly} schema={selected.jsonSchema} t={t} />
        )}
        {selected.type === 'boolean' && (
          <BooleanEditor value={editValue} onChange={setEditValue} readOnly={selected.readOnly} t={t} />
        )}
        {selected.type === 'json' && (
          <JsonEditor key={selected.key} value={editValue} schema={selected.jsonSchema} onChange={setEditValue} onValidation={setJsonHasErrors} readOnly={selected.readOnly} />
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
          <Button variant="default" size="sm" onClick={handleSave} disabled={saving || jsonHasErrors}
            title={jsonHasErrors ? t('Fix schema errors before saving') : undefined}>
            <Save className="w-4 h-4 mr-1" />
            {saving ? t('Saving') : t('Save')}
          </Button>
          {jsonHasErrors && (
            <span className="text-xs text-destructive">{t('Fix schema errors before saving')}</span>
          )}
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
      data-setting-key={s.key}
      aria-selected={isActive}
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
  const rootRef = useRef(null);
  const listScrollStyle = {
    overflowY: 'auto',
  };
  const rootStyle = {
    background: 'var(--background)',
    color: 'var(--foreground)',
    minHeight: 0,
  };

  const filtered = settings.filter(s => {
    const q = search.toLowerCase();
    if (!q) return true;
    return s.key.toLowerCase().includes(q) || (s.name || '').toLowerCase().includes(q) || (s.module || '').toLowerCase().includes(q);
  });

  const selectedSavedValue = useMemo(() => getSettingValue(selected), [selected]);
  const hasUnsavedChanges = !!selected && !selected.readOnly && !valuesEqual(editValue, selectedSavedValue);
  const selectedRef = useRef(selected);
  const filteredRef = useRef(filtered);

  useEffect(() => { selectedRef.current = selected; }, [selected]);
  useEffect(() => { filteredRef.current = filtered; }, [filtered]);

  useEffect(() => {
    const root = rootRef.current;
    const moduleWrapper = root?.parentElement;
    const scrollContainer = moduleWrapper?.parentElement;
    if (!moduleWrapper || !scrollContainer) return;

    const prevModule = {
      height: moduleWrapper.style.height,
      minHeight: moduleWrapper.style.minHeight,
      overflow: moduleWrapper.style.overflow,
    };
    const prevScroll = {
      overflow: scrollContainer.style.overflow,
      minHeight: scrollContainer.style.minHeight,
    };

    moduleWrapper.style.height = 'calc(100% - 2.5rem)';
    moduleWrapper.style.minHeight = '0';
    moduleWrapper.style.overflow = 'hidden';
    scrollContainer.style.overflow = 'hidden';
    scrollContainer.style.minHeight = '0';

    return () => {
      moduleWrapper.style.height = prevModule.height;
      moduleWrapper.style.minHeight = prevModule.minHeight;
      moduleWrapper.style.overflow = prevModule.overflow;
      scrollContainer.style.overflow = prevScroll.overflow;
      scrollContainer.style.minHeight = prevScroll.minHeight;
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;

    const updateHeight = () => {
      const top = root.getBoundingClientRect().top;
      const available = Math.max(280, window.innerHeight - top - 8);
      root.style.height = `${available}px`;
      root.style.maxHeight = `${available}px`;
      root.style.minHeight = '0';
      root.style.overflow = 'hidden';
    };

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      window.removeEventListener('resize', updateHeight);
    };
  }, []);

  useEffect(() => {
    setLoading(true);
    apiGet(`${apiBase}/list`)
      .then(data => {
        setSettings(data);
        setLoading(false);
        const hashKey = decodeURIComponent(window.location.hash.slice(1));
        if (hashKey) {
          const found = data.find(s => s.key === hashKey);
          if (found) applySelection(found);
        }
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [apiBase]);

  function canLeaveCurrentSetting() {
    if (!hasUnsavedChanges) return true;
    return window.confirm(t('You have unsaved changes. Discard them and switch settings?'));
  }

  function applySelection(s) {
    setSelected(s);
    setEditValue(getSettingValue(s));
    setSaveError(null);
    setSaveSuccess(false);
    window.location.hash = encodeURIComponent(s.key);
    if (isMobile) {
      setMobileSheetOpen(false);
      setSearch('');
    }
  }

  function selectSetting(s) {
    if (!s || s.key === selected?.key) return;
    if (!canLeaveCurrentSetting()) return;
    applySelection(s);
  }

  function selectByOffset(offset) {
    const list = filteredRef.current;
    if (!list.length) return;
    const current = selectedRef.current;
    const currentIndex = current ? list.findIndex(s => s.key === current.key) : -1;
    const baseIndex = currentIndex >= 0 ? currentIndex : (offset > 0 ? -1 : 0);
    const nextIndex = Math.max(0, Math.min(list.length - 1, baseIndex + offset));
    const next = list[nextIndex];
    if (next && next.key !== current?.key) selectSetting(next);
  }

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.defaultPrevented || isTextEditingTarget(event.target)) return;
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      event.preventDefault();
      selectByOffset(event.key === 'ArrowDown' ? 1 : -1);
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  useEffect(() => {
    if (!selected) return;
    const button = Array.from(document.querySelectorAll('[data-setting-key]'))
      .find(el => el.getAttribute('data-setting-key') === selected.key);
    button?.scrollIntoView({ block: 'nearest' });
  }, [selected?.key, search]);

  useEffect(() => {
    function handleBeforeUnload(event) {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = '';
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

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
      <div ref={rootRef} className="flex w-full min-w-0 flex-col overflow-hidden" style={rootStyle}>
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
            <div className="flex-1 min-h-0 settings-list-scroll" style={listScrollStyle}>
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
    <div ref={rootRef} className="flex w-full min-w-0 overflow-hidden" style={rootStyle}>
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
        <div className="flex-1 min-h-0 settings-list-scroll" style={listScrollStyle}>
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
