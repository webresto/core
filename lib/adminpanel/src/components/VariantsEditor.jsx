import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  combinations, mergeKnownOptions, nextValue, normalizeVariants, optionsIssues, parseValue, regenerate, renameInOptions, renameKey, renameValue,
  rowTitle, rowsIssues, serializeVariants,
} from './variants/variantsModel';
import { apiGet, getBaseAdminPath } from './modifiers/api';

// Editor of Dish.variants (`interfaces/Variants.ts`): a dish with variants is a box, each variant a
// dish of its own with its price, stock and pictures.
//
//   1. the attributes - name, key, values, their order;
//   2. "Generate" builds the draft - a row per combination - and writes nothing;
//   3. the list goes to the form by itself once it agrees with the attributes and every new
//      variant has a price: existing variants by their ids, new ones as requests with a price.
//      The save of the dish creates them (the hook of the model), and marks deleted an existing
//      variant that was unticked.
//
// Until then the form keeps the value it had: a change of the attributes alone never reaches the
// field, so what is saved is always attributes and variants that agree.
// An existing variant opens in its own short form (the admin page `DishVariant`) in a side panel.
//
// Visual language is that of ModifiersEditor: the theme tokens of the panel, the same atoms.

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
  destructive: 'var(--destructive, #ef4444)',
};
const RADIUS = 'var(--radius, 8px)';
const VARIANT_PAGE = 'DishVariant';

function Button({ variant = 'default', children, style, ...rest }) {
  const variants = {
    default: { background: T.primary, color: T.primaryFg, border: '1px solid transparent' },
    outline: { background: 'transparent', color: T.fg, border: `1px solid ${T.border}` },
    ghost: { background: 'transparent', color: T.muted, border: '1px solid transparent' },
  };
  return (
    <button
      type="button"
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: '6px 12px', borderRadius: RADIUS, fontSize: 13, fontWeight: 500, lineHeight: 1.2,
        cursor: rest.disabled ? 'not-allowed' : 'pointer', opacity: rest.disabled ? 0.5 : 1,
        ...variants[variant], ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

const inputStyle = (invalid) => ({
  fontSize: 14, color: T.fg, background: T.panel, padding: '6px 9px', borderRadius: RADIUS,
  border: `1px solid ${invalid ? T.destructive : T.input}`, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
});
const labelStyle = { fontSize: 11, fontWeight: 600, letterSpacing: '.02em', textTransform: 'uppercase', color: T.muted };
const noteStyle = (color) => ({
  fontSize: 12, color, border: `1px solid ${color}`, borderRadius: RADIUS, padding: '6px 10px',
  background: `color-mix(in oklab, ${color} 10%, transparent)`,
});

const move = (list, from, to) => {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  next.splice(to, 0, next.splice(from, 1)[0]);
  return next;
};

/**
 * A field whose value is taken when the field is left, not at every key: the key of an attribute
 * and the value of its item are what the rows refer to, and a rename moves the rows with it. Half
 * a typed word must not - "3" on the way to "35" would merge two values for good. What `accept`
 * refuses is put back as it was.
 */
function CommittedInput({ value, parse = (text) => text.trim(), accept, onCommit, style, ...rest }) {
  const [text, setText] = useState(String(value ?? ''));
  useEffect(() => { setText(String(value ?? '')); }, [value]);
  const commit = () => {
    const next = parse(text);
    if (next === value) { setText(String(value ?? '')); return; }
    if (!accept(next)) { setText(String(value ?? '')); return; }
    onCommit(next);
  };
  return (
    <input
      value={text}
      onChange={(event) => setText(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => { if (event.key === 'Enter') event.target.blur(); }}
      style={style}
      {...rest}
    />
  );
}

/** A button with a list under it: the known items to take, and "a new one" last. */
function AddMenu({ label, items, onPick, onNew, newLabel, testId }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const outside = (event) => { if (boxRef.current && !boxRef.current.contains(event.target)) setOpen(false); };
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, [open]);
  const itemStyle = { display: 'block', width: '100%', textAlign: 'left', background: 'transparent', color: T.fg, border: 'none', borderRadius: 6, padding: '7px 8px', cursor: 'pointer', fontSize: 13 };
  return (
    <div ref={boxRef} style={{ position: 'relative', display: 'inline-block' }}>
      <Button variant="outline" onClick={() => (items.length ? setOpen((was) => !was) : onNew())} data-testid={testId}>+ {label}</Button>
      {open && (
        <div style={{ position: 'absolute', zIndex: 30, top: 'calc(100% + 4px)', left: 0, minWidth: 240, background: T.card, border: `1px solid ${T.border}`, borderRadius: RADIUS, boxShadow: '0 8px 24px rgba(0,0,0,.18)', padding: 6 }}>
          {items.map((item) => (
            <button key={item.id} type="button" style={itemStyle} onClick={() => { onPick(item); setOpen(false); }}>
              <span style={{ fontWeight: 500 }}>{item.title}</span>
              {item.hint ? <span style={{ color: T.muted, marginLeft: 6, fontSize: 11 }}>{item.hint}</span> : null}
            </button>
          ))}
          <button type="button" style={{ ...itemStyle, color: T.primary }} onClick={() => { onNew(); setOpen(false); }} data-testid={`${testId}-new`}>+ {newLabel}</button>
        </div>
      )}
    </div>
  );
}

function OptionCard({ option, index, total, issues, known, takenKeys, onChange, onRenameKey, onRenameValue, onMove, onRemove, tr }) {
  const knownValues = (known?.values ?? []).filter((item) => !option.values.some((had) => had.value === item.value));
  const setValues = (values) => onChange({ ...option, values });
  return (
    <div style={{ border: `1px solid ${issues.length ? T.destructive : T.border}`, borderRadius: RADIUS, padding: 10, display: 'flex', flexDirection: 'column', gap: 8, background: T.card }} data-testid="variants-option">
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '2 1 180px' }}>
          <span style={labelStyle}>{tr('Attribute')}</span>
          <input value={option.name} placeholder={tr('Size')} onChange={(event) => onChange({ ...option, name: event.target.value })} style={inputStyle(!option.name)} data-testid="variants-option-name" />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 110px' }}>
          <span style={labelStyle}>{tr('Key')}</span>
          <CommittedInput
            value={option.key}
            placeholder="size"
            accept={(key) => /^[a-z][a-z0-9_]*$/i.test(key) && !takenKeys.includes(key)}
            onCommit={onRenameKey}
            style={inputStyle(!option.key)}
            title={tr('Latin letters, digits and _: what the storefront recipe and integrations name the attribute by')}
            data-testid="variants-option-key"
          />
        </label>
        <Button variant="ghost" disabled={index === 0} onClick={() => onMove(-1)} title={tr('Move up')}>↑</Button>
        <Button variant="ghost" disabled={index === total - 1} onClick={() => onMove(1)} title={tr('Move down')}>↓</Button>
        <Button variant="ghost" onClick={onRemove} style={{ color: T.destructive }} data-testid="variants-option-remove">{tr('Remove')}</Button>
      </div>
      <span style={{ fontSize: 11, color: T.muted }}>{tr('Each value is two fields: the value is for the logic - the storefront recipe and integrations name it - and the title is what the customer reads.')}</span>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {option.values.map((item, at) => (
          <span key={`${String(item.value)}-${at}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 2, border: `1px solid ${T.border}`, borderRadius: RADIUS, padding: '2px 2px 2px 8px', background: T.panel }}>
            <CommittedInput
              value={item.value}
              parse={parseValue}
              accept={(value) => value !== '' && !option.values.some((had) => had.value === value)}
              onCommit={(value) => onRenameValue(at, value)}
              placeholder={tr('Value')}
              title={tr('The value: a number or a word the storefront recipe and integrations name')}
              style={{ ...inputStyle(false), width: 58, padding: '4px 6px', fontSize: 12, color: T.muted }}
              data-testid="variants-value"
            />
            <input
              value={item.title}
              placeholder={tr('Title')}
              onChange={(event) => setValues(option.values.map((had, i) => (i === at ? { ...had, title: event.target.value } : had)))}
              style={{ ...inputStyle(!item.title), width: 120, padding: '4px 6px', border: 'none' }}
              data-testid="variants-value-title"
            />
            <Button variant="ghost" style={{ padding: '4px 5px' }} disabled={at === 0} onClick={() => setValues(move(option.values, at, at - 1))} title={tr('Move up')}>←</Button>
            <Button variant="ghost" style={{ padding: '4px 5px' }} disabled={at === option.values.length - 1} onClick={() => setValues(move(option.values, at, at + 1))} title={tr('Move down')}>→</Button>
            <Button variant="ghost" style={{ padding: '4px 6px', color: T.destructive }} onClick={() => setValues(option.values.filter((_, i) => i !== at))} title={tr('Remove')}>×</Button>
          </span>
        ))}
        <AddMenu
          label={tr('Value')}
          newLabel={tr('New value')}
          items={knownValues.map((item) => ({ id: String(item.value), title: item.title, hint: String(item.value), item }))}
          onPick={(picked) => setValues([...option.values, picked.item])}
          onNew={() => setValues([...option.values, { value: nextValue(option), title: '' }])}
          testId="variants-value-add"
        />
      </div>
      {issues.map((issue, i) => <span key={i} style={{ fontSize: 12, color: T.destructive }}>{tr(issue.message)}</span>)}
    </div>
  );
}

/** The short form of one variant, in the side panel the panel opens related records in. */
function VariantPanel({ variantId, onClosed }) {
  const UI = window.UIComponents;
  const { AddForm, adminApi } = window.JSComponents;
  const stackRef = useRef(null);
  // The stack reports its state on mount too - closed - and that is not the panel being closed.
  const wasOpen = useRef(false);
  const handleOpenChange = useCallback((open) => {
    if (open) wasOpen.current = true;
    else if (wasOpen.current) onClosed();
  }, [onClosed]);
  const [props, setProps] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    stackRef.current?.open();
    adminApi.get(`${getBaseAdminPath()}/model/${VARIANT_PAGE}/edit/${encodeURIComponent(variantId)}?without_layout=true`)
      .then((response) => { if (!cancelled) setProps(response.data?.props ?? response.data); })
      .catch((failure) => { if (!cancelled) setError(failure?.message || 'Error'); });
    return () => { cancelled = true; };
  }, [variantId, adminApi]);

  return (
    <UI.DialogStack ref={stackRef} onOpenChange={handleOpenChange}>
      <UI.DialogStackOverlay />
      {/* The panel is a portal, but React events still rise to the dish form around the control:
          the submit of the variant's form stops here. */}
      <UI.DialogStackBody onSubmit={(event) => event.stopPropagation()}>
        <UI.DialogStackContent>
          <div style={{ height: '100%' }} data-testid="variants-panel">
            {error ? <div style={{ padding: 16, color: T.destructive }}>{error}</div> : null}
            {!error && !props ? <div style={{ padding: 16, color: T.muted }}>…</div> : null}
            {props ? <AddForm page={{ props }} catalog={true} callback={() => stackRef.current?.close()} /> : null}
          </div>
        </UI.DialogStackContent>
      </UI.DialogStackBody>
    </UI.DialogStack>
  );
}

function VariantsEditor({ value, onChange, t }) {
  const tr = useCallback((key) => (typeof t === 'function' ? t(key) : key), [t]);
  const rootRef = useRef(null);
  const initial = useMemo(() => normalizeVariants(value), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [options, setOptions] = useState(initial.options);
  const [rows, setRows] = useState(initial.rows);
  // The attributes the rows were built for, and the value the form holds: both as JSON.
  const [builtFor, setBuiltFor] = useState(() => JSON.stringify(initial.options));
  const [confirmed, setConfirmed] = useState(() => JSON.stringify(serializeVariants(initial.options, initial.rows)));
  const [known, setKnown] = useState([]);
  const [info, setInfo] = useState({});
  const [opened, setOpened] = useState(null);

  // The form hands a new value over (a record loaded later, the form reset): start from it,
  // unless it is the echo of what was confirmed here.
  useEffect(() => {
    const incoming = normalizeVariants(value);
    const canonical = JSON.stringify(serializeVariants(incoming.options, incoming.rows));
    if (canonical === confirmed) return;
    setOptions(incoming.options);
    setRows(incoming.rows);
    setBuiltFor(JSON.stringify(incoming.options));
    setConfirmed(canonical);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false;
    apiGet('/core/variants/attributes')
      .then(({ results = [] }) => { if (!cancelled) setKnown(mergeKnownOptions(results)); })
      .catch(() => { /* suggestions are best-effort */ });
    return () => { cancelled = true; };
  }, []);

  // What the existing variants are now: name, price, switched off, deleted.
  const rels = rows.map((row) => row.rel).filter(Boolean).join(',');
  const loadInfo = useCallback(async () => {
    if (!rels) return;
    try {
      const { results = [] } = await apiGet(`/core/modifiers/dishes?ids=${encodeURIComponent(rels)}`);
      setInfo(Object.fromEntries(results.map((dish) => [dish.id, dish])));
    } catch { /* the rows stay without prices */ }
  }, [rels]);
  useEffect(() => { loadInfo(); }, [loadInfo]);

  const issues = useMemo(() => optionsIssues(options), [options]);
  const stale = JSON.stringify(options) !== builtFor;
  const problems = useMemo(() => rowsIssues(rows), [rows]);
  const draft = stale ? null : JSON.stringify(serializeVariants(options, rows));
  const pending = draft !== confirmed;
  // The list goes to the form as soon as there is nothing left to put right in it. There was a
  // button for that, and a list left unconfirmed was silently not saved.
  const ready = !stale && !issues.length && (!options.length || !problems.length);
  useEffect(() => {
    if (!ready || draft === confirmed) return;
    setConfirmed(draft);
    if (typeof onChange === 'function') onChange(JSON.parse(draft));
  }, [ready, draft]); // eslint-disable-line react-hooks/exhaustive-deps
  // The name of the dish as typed in the form around the control, for the names of the variants.
  const boxName = rootRef.current?.closest('form')?.elements.namedItem('name')?.value?.trim() || '';

  const generate = () => {
    setRows(regenerate(options, rows));
    setBuiltFor(JSON.stringify(options));
  };
  const closePanel = useCallback(() => { setOpened(null); loadInfo(); }, [loadInfo]);
  // A rename of a key or of a value is not a change of the combinations: the rows and the list
  // they were built for follow it, and nothing is left to generate. An attribute without a key
  // yet has no rows to move.
  const renameKeyAt = (index, to) => {
    const from = options[index].key;
    setOptions(options.map((had, i) => (i === index ? { ...had, key: to } : had)));
    if (!from) return;
    setRows(renameKey(rows, from, to));
    setBuiltFor(JSON.stringify(renameInOptions(JSON.parse(builtFor), { key: from, to })));
  };
  const renameValueAt = (index, at, to) => {
    const { key, values } = options[index];
    const from = values[at].value;
    setOptions(options.map((had, i) => (i === index ? { ...had, values: had.values.map((item, j) => (j === at ? { ...item, value: to } : item)) } : had)));
    if (!key) return;
    setRows(renameValue(rows, key, from, to));
    setBuiltFor(JSON.stringify(renameInOptions(JSON.parse(builtFor), { key, value: from, to })));
  };
  const setRow = (index, patch) => setRows(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  // The default the value will get: the ticked row, else the first kept one.
  const chosen = rows.find((row) => row.keep && row.isDefault) ?? rows.find((row) => row.keep);
  // A combination left out earlier - unticked at the first list, or a variant deleted since - is
  // not among the rows: "Generate" brings it back as a request.
  const missing = !stale && options.length > 0 && combinations(options).length > rows.length;
  // The checkbox of the panel (shadcn). It has no radio of its own outside menus: the default
  // variant is the same checkbox, round.
  const { Checkbox } = window.UIComponents;
  const usedKeys = new Set(options.map((option) => option.key));
  const gone = normalizeVariants(JSON.parse(confirmed)).rows.filter((had) => had.rel && !rows.some((row) => row.keep && row.rel === had.rel)).length;

  return (
    <div
      ref={rootRef}
      // Enter in a field of the control must not save the dish.
      onKeyDown={(event) => { if (event.key === 'Enter' && event.target.tagName === 'INPUT') event.preventDefault(); }}
      style={{ display: 'flex', flexDirection: 'column', gap: 12, color: T.fg, background: T.panel, border: `1px solid ${T.border}`, borderRadius: RADIUS, padding: 14, fontFamily: 'inherit' }}
      data-testid="variants-editor"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{tr('Variants')}</span>
        <AddMenu
          label={tr('Attribute')}
          newLabel={tr('New attribute')}
          items={known.filter((option) => !usedKeys.has(option.key)).map((option) => ({ id: option.key, title: option.name, hint: option.values.map((item) => item.title).join(', '), option }))}
          onPick={(picked) => setOptions([...options, picked.option])}
          onNew={() => setOptions([...options, { key: '', name: '', values: [] }])}
          testId="variants-option-add"
        />
      </div>

      <span style={{ fontSize: 12, color: T.muted }}>
        {tr('A dish with variants is not sold itself: its own price is not used, the prices are those of the variants. The modifiers of the dish are those of every variant.')}
      </span>

      {options.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px 16px', border: `1px dashed ${T.border}`, borderRadius: RADIUS, color: T.muted, fontSize: 13 }}>
          {tr('No attributes: an ordinary dish. Add an attribute - a size, a crust - to give it variants.')}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {options.map((option, index) => (
            <OptionCard
              key={index}
              option={option}
              index={index}
              total={options.length}
              issues={issues.filter((issue) => issue.option === index)}
              known={known.find((had) => had.key === option.key)}
              takenKeys={options.filter((_, i) => i !== index).map((had) => had.key)}
              onChange={(next) => setOptions(options.map((had, i) => (i === index ? next : had)))}
              onRenameKey={(to) => renameKeyAt(index, to)}
              onRenameValue={(at, to) => renameValueAt(index, at, to)}
              onMove={(by) => setOptions(move(options, index, index + by))}
              onRemove={() => setOptions(options.filter((_, i) => i !== index))}
              tr={tr}
            />
          ))}
        </div>
      )}

      {(options.length > 0 || rows.length > 0) && (
        <div>
          <Button onClick={generate} disabled={issues.length > 0 || !(stale || missing)} data-testid="variants-generate">{tr('Generate variants')}</Button>
        </div>
      )}

      {rows.length > 0 && (
        <div style={{ border: `1px solid ${stale ? T.destructive : T.border}`, borderRadius: RADIUS, overflow: 'hidden' }} data-testid="variants-rows" data-stale={stale ? '1' : '0'}>
          {stale && (
            <div style={{ ...noteStyle(T.destructive), border: 'none', borderRadius: 0 }} data-testid="variants-stale">
              {tr('The attributes were changed: generate the list again. Until then the dish keeps the list it had.')}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', borderTop: stale ? `1px solid ${T.border}` : 'none', background: T.accent }}>
            <span style={{ ...labelStyle, width: 64 }}>{tr('In the list')}</span>
            <span style={{ ...labelStyle, width: 88 }}>{tr('Default')}</span>
            <span style={{ ...labelStyle, flex: 1 }}>{tr('Variant')}</span>
            <span style={labelStyle}>{tr('Price')}</span>
          </div>
          {rows.map((row, index) => {
            const dish = row.rel ? info[row.rel] : null;
            const title = [boxName, rowTitle(stale ? JSON.parse(builtFor) : options, row.values)].filter(Boolean).join(', ');
            return (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderTop: `1px solid ${T.border}`, opacity: stale || !row.keep ? 0.55 : 1 }} data-testid="variants-row">
                <span style={{ width: 64, display: 'inline-flex' }}>
                  <Checkbox checked={row.keep} disabled={stale} onCheckedChange={(checked) => setRow(index, { keep: checked === true })} title={row.rel ? tr('Keep the variant') : tr('Create the variant')} data-testid="variants-row-keep" />
                </span>
                <span style={{ width: 88, display: 'inline-flex' }}>
                  <Checkbox className="rounded-full" checked={row === chosen} disabled={stale || !row.keep} onCheckedChange={() => setRows(rows.map((had, i) => ({ ...had, isDefault: i === index })))} title={tr('Chosen when the dish is opened')} data-testid="variants-row-default" />
                </span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 13 }} data-testid="variants-row-title">{title}</span>
                {row.rel ? (
                  <>
                    {!row.keep && !stale ? <span style={{ fontSize: 11, color: T.destructive }} data-testid="variants-row-leaving">{tr('will be deleted')}</span> : null}
                    {dish?.isDeleted ? <span style={{ fontSize: 11, color: T.destructive }}>{tr('deleted')}</span> : null}
                    {dish && !dish.enable ? <span style={{ fontSize: 11, color: T.muted }}>{tr('switched off')}</span> : null}
                    <span style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums' }} data-testid="variants-row-price">{dish ? dish.price : '…'}</span>
                    <Button variant="outline" onClick={() => setOpened(row.rel)} data-testid="variants-row-open">{tr('Open')}</Button>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: 11, color: T.primary }}>{tr('new')}</span>
                    <input
                      type="number" min={0} placeholder={tr('Price')} disabled={stale || !row.keep}
                      value={row.price == null ? '' : row.price}
                      onChange={(event) => setRow(index, { price: event.target.value === '' ? null : Number(event.target.value) })}
                      style={{ ...inputStyle(row.keep && row.price == null), width: 110 }}
                      data-testid="variants-row-price-input"
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!stale && options.length > 0 && problems.map((message, i) => <span key={i} style={{ fontSize: 12, color: T.destructive }}>{tr(message)}</span>)}
      {!stale && gone > 0 && <div style={noteStyle(T.destructive)}>{tr('Existing variants left out of the list are deleted when the dish is saved.')}</div>}

      {pending && !stale ? <span style={{ fontSize: 12, color: T.destructive }} data-testid="variants-pending">{tr('Until this is put right, saving the dish keeps the list it had.')}</span> : null}
      {!pending && rows.some((row) => !row.rel && row.keep) ? (
        <div style={noteStyle(T.primary)} data-testid="variants-applied">{tr('The new variants are created when the dish is saved.')}</div>
      ) : null}

      {opened ? <VariantPanel variantId={opened} onClosed={closePanel} /> : null}
    </div>
  );
}

export default VariantsEditor;
