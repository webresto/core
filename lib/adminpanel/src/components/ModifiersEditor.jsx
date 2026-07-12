import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  normalizeModifiers, serializeModifiers, toCanonical, validateModifiers,
  makeEmptyGroup, makeEmptyChild,
} from './modifiers/modifiersModel';

// Editor for Dish.modifiers (GroupModifier[]). Two-level form:
//   - each modifier GROUP binds a catalog category + carries min/max/required/free rules;
//   - each group holds one or more OPTION rows, each bound to a modifier dish + per-option
//     amounts. Data for the category / dish pickers is fetched from the core API endpoints
//     (…/core/modifiers/groups, …/core/modifiers/dishes), gated by the catalog-products token.
//
// Visual language mirrors WorktimeEditor: shadcn design tokens (theme-aware), the same
// atoms (Button, cards, IconTrash/IconPlus), and inline validation. onChange receives the
// serialized GroupModifier[]; the worktime-viewer control wraps it as { json } for adminizer.

// ---- theme tokens (identical set to WorktimeEditor) -------------------------
const T = {
  panel: 'var(--background, #ffffff)',
  card: 'var(--card, #ffffff)',
  fg: 'var(--foreground, #0a0a0a)',
  muted: 'var(--muted-foreground, #6b7280)',
  border: 'var(--border, #e5e7eb)',
  input: 'var(--input, #e5e7eb)',
  primary: 'var(--primary, #2563eb)',
  primaryFg: 'var(--primary-foreground, #ffffff)',
  accent: 'var(--accent, #f1f5f9)',
  accentFg: 'var(--accent-foreground, #0a0a0a)',
  destructive: 'var(--destructive, #ef4444)',
  ring: 'var(--ring, #94a3b8)',
};
const RADIUS = 'var(--radius, 8px)';

// ---- icons ------------------------------------------------------------------
const Svg = (props) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props} />
);
const IconPlus = () => (<Svg><path d="M12 5v14M5 12h14" /></Svg>);
const IconTrash = () => (<Svg width="15" height="15"><path d="M3 6h18M8 6V4h8v2m-9 0v14a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6" /></Svg>);
const IconLayers = () => (<Svg width="18" height="18"><path d="M12 2 2 7l10 5 10-5-10-5Z" /><path d="m2 17 10 5 10-5" /><path d="m2 12 10 5 10-5" /></Svg>);

// ---- data layer -------------------------------------------------------------
function getBaseAdminPath() {
  if (typeof window !== 'undefined' && typeof window.routePrefix === 'string' && window.routePrefix.trim()) {
    return window.routePrefix.replace(/\/$/, '');
  }
  const pathname = (typeof window !== 'undefined' && window.location.pathname) || '';
  const normalized = pathname.replace(/\/+$/, '');
  return normalized.replace(/\/[^/]*$/, '') || '/admin';
}

async function apiGet(path) {
  // Prefer the shared admin fetcher when present; fall back to plain fetch.
  const base = getBaseAdminPath();
  const url = `${base}${path}`;
  if (typeof window !== 'undefined' && typeof window.adminApi === 'function') {
    return window.adminApi(url);
  }
  const res = await fetch(url, { headers: { Accept: 'application/json' }, credentials: 'same-origin' });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

// ---- presentational atoms ---------------------------------------------------
function Button({ variant = 'default', children, style, ...rest }) {
  const variants = {
    default: { background: T.primary, color: T.primaryFg, border: '1px solid transparent' },
    outline: { background: 'transparent', color: T.fg, border: `1px solid ${T.border}` },
    ghost: { background: 'transparent', color: T.muted, border: '1px solid transparent' },
    danger: { background: 'transparent', color: T.destructive, border: '1px solid transparent' },
  };
  return (
    <button
      type="button"
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: '6px 12px', borderRadius: RADIUS, fontSize: 13, fontWeight: 500,
        cursor: rest.disabled ? 'not-allowed' : 'pointer', opacity: rest.disabled ? 0.5 : 1,
        lineHeight: 1.2, transition: 'background .12s, border-color .12s, opacity .12s',
        ...variants[variant], ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

function Field({ label, children, hint }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
      <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.02em', textTransform: 'uppercase', color: T.muted }}>
        {label}
      </span>
      {children}
      {hint ? <span style={{ fontSize: 11, color: T.muted }}>{hint}</span> : null}
    </label>
  );
}

const inputStyle = (invalid) => ({
  fontSize: 14, color: T.fg, background: T.panel, padding: '7px 9px',
  borderRadius: RADIUS, border: `1px solid ${invalid ? T.destructive : T.input}`,
  outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit',
});

function NumberField({ label, value, onChange, hint, min = 0, placeholder }) {
  return (
    <Field label={label} hint={hint}>
      <input
        type="number"
        min={min}
        placeholder={placeholder}
        value={value == null ? '' : value}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === '' ? null : Number(v));
        }}
        style={inputStyle(false)}
      />
    </Field>
  );
}

// Combobox that fetches options lazily and lets the user search + pick one entity.
function EntityPicker({ label, value, valueLabel, invalid, fetchOptions, onPick, tr }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const results = await fetchOptions(query);
        if (!cancelled) setOptions(Array.isArray(results) ? results : []);
      } catch {
        if (!cancelled) setOptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [open, query, fetchOptions]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <Field label={label}>
      <div ref={boxRef} style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          style={{ ...inputStyle(invalid), display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', textAlign: 'left' }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: value ? T.fg : T.muted }}>
            {valueLabel || value || tr('— select —')}
          </span>
          <span style={{ color: T.muted, marginLeft: 8 }}>▾</span>
        </button>
        {open && (
          <div style={{
            position: 'absolute', zIndex: 30, top: 'calc(100% + 4px)', left: 0, right: 0,
            background: T.card, border: `1px solid ${T.border}`, borderRadius: RADIUS,
            boxShadow: '0 8px 24px rgba(0,0,0,.18)', maxHeight: 280, overflow: 'auto', padding: 6,
          }}>
            <input
              autoFocus
              placeholder={tr('Search…')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ ...inputStyle(false), marginBottom: 6 }}
            />
            {loading && <div style={{ fontSize: 12, color: T.muted, padding: '6px 8px' }}>{tr('Loading…')}</div>}
            {!loading && options.length === 0 && <div style={{ fontSize: 12, color: T.muted, padding: '6px 8px' }}>{tr('No results')}</div>}
            {!loading && options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => { onPick(opt); setOpen(false); setQuery(''); }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', background: opt.id === value ? T.accent : 'transparent',
                  color: T.fg, border: 'none', borderRadius: 6, padding: '7px 8px', cursor: 'pointer', fontSize: 13,
                }}
              >
                <span style={{ fontWeight: 500 }}>{opt.name}</span>
                {opt.code ? <span style={{ color: T.muted, marginLeft: 6, fontSize: 11 }}>#{opt.code}</span> : null}
                {opt.isDeleted ? <span style={{ color: T.destructive, marginLeft: 6, fontSize: 11 }}>{tr('deleted')}</span> : null}
              </button>
            ))}
          </div>
        )}
      </div>
    </Field>
  );
}

function IssueList({ issues, tr }) {
  if (!issues.length) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {issues.map((issue, i) => (
        <span key={i} style={{ fontSize: 12, color: issue.level === 'error' ? T.destructive : T.primary }}>
          {tr(issue.message)}
        </span>
      ))}
    </div>
  );
}

// ---- option (child modifier) row -------------------------------------------
function OptionRow({ child, issues, dishLabels, onChange, onRemove, fetchDishes, tr }) {
  const patch = (changes) => onChange({ ...child, ...changes });
  return (
    <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: RADIUS, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <EntityPicker
            label={tr('Modifier dish')}
            value={child.id}
            valueLabel={dishLabels[child.id]}
            invalid={!child.id}
            fetchOptions={fetchDishes}
            onPick={(opt) => patch({ id: opt.id, rmsId: opt.rmsId || '' })}
            tr={tr}
          />
        </div>
        <Button variant="danger" onClick={onRemove} title={tr('Remove option')} style={{ padding: 6, flexShrink: 0, marginTop: 18 }}>
          <IconTrash />
        </Button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
        <NumberField label={tr('Default')} value={child.defaultAmount} placeholder="0" onChange={(v) => patch({ defaultAmount: v })} />
        <NumberField label={tr('Min')} value={child.minAmount} placeholder="—" onChange={(v) => patch({ minAmount: v })} />
        <NumberField label={tr('Max')} value={child.maxAmount} placeholder="∞" onChange={(v) => patch({ maxAmount: v })} />
        <NumberField label={tr('Free')} value={child.freeOfChargeAmount} placeholder="0" onChange={(v) => patch({ freeOfChargeAmount: v })} />
      </div>
      <IssueList issues={issues} tr={tr} />
    </div>
  );
}

// ---- group card -------------------------------------------------------------
function GroupCard({ group, index, total, issues, groupLabels, dishLabels, onChange, onRemove, fetchGroups, fetchDishes, tr }) {
  const patch = (changes) => onChange({ ...group, ...changes });
  const groupIssues = issues.filter((i) => i.childIndex === -1);

  const updateChild = (next) => patch({ childModifiers: group.childModifiers.map((c) => (c._id === next._id ? next : c)) });
  const removeChild = (id) => patch({ childModifiers: group.childModifiers.filter((c) => c._id !== id) });
  const addChild = () => patch({ childModifiers: [...group.childModifiers, makeEmptyChild()] });

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: RADIUS, padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 12, color: T.muted, fontWeight: 600 }}>{tr('Group')} {index + 1} / {total}</span>
        <Button variant="danger" onClick={onRemove} title={tr('Remove group')} style={{ padding: 6 }}>
          <IconTrash />
        </Button>
      </div>

      <EntityPicker
        label={tr('Category (group)')}
        value={group.id}
        valueLabel={groupLabels[group.id]}
        invalid={!group.id}
        fetchOptions={fetchGroups}
        onPick={(opt) => patch({ id: opt.id, rmsId: opt.rmsId || '' })}
        tr={tr}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
        <NumberField label={tr('Min amount')} value={group.minAmount} placeholder="0" onChange={(v) => patch({ minAmount: v, required: v != null && v >= 1 ? true : group.required })} />
        <NumberField label={tr('Max amount')} value={group.maxAmount} placeholder="∞" onChange={(v) => patch({ maxAmount: v })} />
        <NumberField label={tr('Free of charge')} value={group.freeOfChargeAmount} placeholder="0" onChange={(v) => patch({ freeOfChargeAmount: v })} />
      </div>

      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: T.fg, width: 'fit-content' }}>
        <input
          type="checkbox"
          checked={Boolean(group.required)}
          onChange={(e) => patch({ required: e.target.checked, minAmount: e.target.checked && (group.minAmount == null || group.minAmount < 1) ? 1 : group.minAmount })}
          style={{ width: 15, height: 15, cursor: 'pointer' }}
        />
        {tr('Required (guest must choose)')}
      </label>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: T.fg }}>{tr('Options')} ({group.childModifiers.length})</span>
          <Button variant="outline" onClick={addChild}><IconPlus />{tr('Add option')}</Button>
        </div>
        {group.childModifiers.length === 0 ? (
          <div style={{ padding: '16px', border: `1px dashed ${T.border}`, borderRadius: RADIUS, color: T.muted, fontSize: 13, textAlign: 'center' }}>
            {tr('No options yet')}
          </div>
        ) : (
          group.childModifiers.map((child, ci) => (
            <OptionRow
              key={child._id}
              child={child}
              dishLabels={dishLabels}
              issues={issues.filter((i) => i.childIndex === ci)}
              onChange={updateChild}
              onRemove={() => removeChild(child._id)}
              fetchDishes={fetchDishes}
              tr={tr}
            />
          ))
        )}
      </div>

      <IssueList issues={groupIssues} tr={tr} />
    </div>
  );
}

// ---- root editor ------------------------------------------------------------
/**
 * @param {*}        value     initial GroupModifier[] | JSON string
 * @param {Function} onChange  emits serialized GroupModifier[]
 * @param {Function} [t]       translate(key) => string (optional)
 */
function ModifiersEditor({ value, onChange, t }) {
  const tr = useMemo(() => (typeof t === 'function' ? t : (key) => key), [t]);
  const [groups, setGroups] = useState(() => normalizeModifiers(value));
  const lastEmitted = useRef(toCanonical(value));

  // Cache of id -> display label so already-referenced entities render a name
  // even before the picker is opened. Seeded from the API on mount.
  const [groupLabels, setGroupLabels] = useState({});
  const [dishLabels, setDishLabels] = useState({});

  const commit = useCallback((next) => {
    setGroups(next);
    const emitted = serializeModifiers(next);
    lastEmitted.current = JSON.stringify(emitted);
    if (typeof onChange === 'function') onChange(emitted);
  }, [onChange]);

  // Re-sync when the external value changes (async record load / form reset),
  // skipping the echo of our own edit.
  useEffect(() => {
    const incoming = toCanonical(value);
    if (incoming === lastEmitted.current) return;
    lastEmitted.current = incoming;
    setGroups(normalizeModifiers(value));
  }, [value]);

  // Seed labels for referenced groups/dishes.
  useEffect(() => {
    const gIds = Array.from(new Set(groups.map((g) => g.id).filter(Boolean)));
    const dIds = Array.from(new Set(groups.flatMap((g) => g.childModifiers.map((c) => c.id)).filter(Boolean)));
    let cancelled = false;
    (async () => {
      try {
        if (gIds.length) {
          const { results = [] } = await apiGet(`/core/modifiers/groups?ids=${encodeURIComponent(gIds.join(','))}`);
          if (!cancelled) setGroupLabels((prev) => ({ ...prev, ...Object.fromEntries(results.map((r) => [r.id, r.name])) }));
        }
        if (dIds.length) {
          const { results = [] } = await apiGet(`/core/modifiers/dishes?ids=${encodeURIComponent(dIds.join(','))}`);
          if (!cancelled) setDishLabels((prev) => ({ ...prev, ...Object.fromEntries(results.map((r) => [r.id, r.name])) }));
        }
      } catch { /* labels are best-effort */ }
    })();
    return () => { cancelled = true; };
    // Only re-run when the set of referenced ids changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups.map((g) => `${g.id}:${g.childModifiers.map((c) => c.id).join(',')}`).join('|')]);

  const fetchGroups = useCallback(async (query) => {
    const { results = [] } = await apiGet(`/core/modifiers/groups?q=${encodeURIComponent(query || '')}`);
    // Remember labels as the user browses.
    setGroupLabels((prev) => ({ ...prev, ...Object.fromEntries(results.map((r) => [r.id, r.name])) }));
    return results;
  }, []);

  const fetchDishes = useCallback(async (query) => {
    const { results = [] } = await apiGet(`/core/modifiers/dishes?q=${encodeURIComponent(query || '')}`);
    setDishLabels((prev) => ({ ...prev, ...Object.fromEntries(results.map((r) => [r.id, r.name])) }));
    return results;
  }, []);

  const issues = useMemo(() => validateModifiers(groups), [groups]);
  const errorCount = issues.filter((i) => i.level === 'error').length;

  const addGroup = () => commit([...groups, makeEmptyGroup()]);
  const updateGroup = (next) => commit(groups.map((g) => (g._id === next._id ? next : g)));
  const removeGroup = (id) => commit(groups.filter((g) => g._id !== id));

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 12, color: T.fg,
      background: T.panel, border: `1px solid ${T.border}`, borderRadius: RADIUS, padding: 14, fontFamily: 'inherit',
    }} data-testid="modifiers-editor">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: T.muted, display: 'inline-flex' }}><IconLayers /></span>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{tr('Modifiers')}</span>
        </div>
        <Button onClick={addGroup}><IconPlus />{tr('Add group')}</Button>
      </div>

      {errorCount > 0 && (
        <div style={{
          fontSize: 12, color: T.destructive, background: 'color-mix(in oklab, var(--destructive, #ef4444) 10%, transparent)',
          border: `1px solid ${T.destructive}`, borderRadius: RADIUS, padding: '6px 10px',
        }} data-testid="modifiers-error-banner">
          {tr('Fix validation errors before saving').replace('{count}', String(errorCount))}
        </div>
      )}

      {groups.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center',
          padding: '28px 16px', border: `1px dashed ${T.border}`, borderRadius: RADIUS, color: T.muted,
        }}>
          <span style={{ display: 'inline-flex', opacity: 0.7 }}><IconLayers /></span>
          <span style={{ fontSize: 13 }}>{tr('No modifiers configured yet')}</span>
          <Button variant="outline" onClick={addGroup}><IconPlus />{tr('Add the first group')}</Button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {groups.map((group, gi) => (
            <GroupCard
              key={group._id}
              group={group}
              index={gi}
              total={groups.length}
              issues={issues.filter((i) => i.groupIndex === gi)}
              groupLabels={groupLabels}
              dishLabels={dishLabels}
              onChange={updateGroup}
              onRemove={() => removeGroup(group._id)}
              fetchGroups={fetchGroups}
              fetchDishes={fetchDishes}
              tr={tr}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default ModifiersEditor;
