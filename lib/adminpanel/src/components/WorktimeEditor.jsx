import React, { useCallback, useEffect, useMemo, useState } from 'react';

// WorkTime shape (see @webresto/worktime):
//   { dayOfWeek: Day[], start: "HH:MM", stop: "HH:MM", break?: "HH:MM-HH:MM" }
// The field stores a WorkTime[] on Dish/Group/Promotion and a single WorkTime
// object on Place/Maintenance — this editor accepts both and always emits an
// array (a single-object source round-trips as a one-element array).

export const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const DAY_ABBR = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
};

const PRESETS = {
  weekdays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  weekend: ['saturday', 'sunday'],
  everyday: DAYS,
};

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

let RULE_SEQ = 0;
const nextId = () => `wt-${Date.now().toString(36)}-${(RULE_SEQ += 1)}`;

// ---- theme tokens -----------------------------------------------------------
// Colours come from the host admin panel's shadcn design tokens, so the editor
// follows the day/night theme automatically. Hex fallbacks keep it usable if a
// token is ever missing.
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

// ---- pure helpers -----------------------------------------------------------
function coerceValue(value) {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      return coerceValue(JSON.parse(trimmed));
    } catch {
      return [];
    }
  }
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return [value];
  return [];
}

function splitBreak(raw) {
  if (typeof raw !== 'string') return { start: '', stop: '' };
  const [start = '', stop = ''] = raw.split('-');
  return { start: start.trim(), stop: stop.trim() };
}

function normalizeWorktime(value) {
  return coerceValue(value).map((item) => {
    const source = item && typeof item === 'object' ? item : {};
    const { dayOfWeek, start, stop, break: brk, ...extra } = source;
    const parsedBreak = splitBreak(brk);
    return {
      id: nextId(),
      dayOfWeek: Array.isArray(dayOfWeek) ? dayOfWeek.filter((d) => DAYS.includes(d)) : [],
      start: typeof start === 'string' ? start : '',
      stop: typeof stop === 'string' ? stop : '',
      breakEnabled: Boolean(parsedBreak.start || parsedBreak.stop),
      breakStart: parsedBreak.start,
      breakStop: parsedBreak.stop,
      extra, // preserve unknown / deprecated keys (e.g. selfService) on save
    };
  });
}

// Sort days in canonical week order before emitting.
const orderDays = (days) => DAYS.filter((d) => days.includes(d));

function serializeRules(rules) {
  return rules.map((rule) => {
    const out = { ...rule.extra, dayOfWeek: orderDays(rule.dayOfWeek), start: rule.start, stop: rule.stop };
    if (rule.breakEnabled && rule.breakStart && rule.breakStop) {
      out.break = `${rule.breakStart}-${rule.breakStop}`;
    } else {
      delete out.break;
    }
    return out;
  });
}

function ruleIssues(rule, tr) {
  const issues = [];
  if (rule.dayOfWeek.length === 0) issues.push({ level: 'error', text: tr('Select at least one day') });
  if (!TIME_RE.test(rule.start) || !TIME_RE.test(rule.stop)) {
    issues.push({ level: 'error', text: tr('Set a valid start and end time') });
  } else if (rule.start === rule.stop) {
    issues.push({ level: 'warn', text: tr('Start and end time are the same') });
  } else if (rule.stop < rule.start) {
    issues.push({ level: 'info', text: tr('Crosses midnight (overnight)') });
  }
  if (rule.breakEnabled && (!TIME_RE.test(rule.breakStart) || !TIME_RE.test(rule.breakStop))) {
    issues.push({ level: 'warn', text: tr('Break needs both a start and end time') });
  }
  return issues;
}

// `.dark` lives on a host ancestor; native <input type="time"> pickers need the
// matching color-scheme to render correctly, so we mirror it onto the editor.
function useColorScheme() {
  const read = () =>
    typeof document !== 'undefined' &&
    (document.documentElement.classList.contains('dark') || document.body.classList.contains('dark'))
      ? 'dark'
      : 'light';
  const [scheme, setScheme] = useState(read);
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const update = () => setScheme(read());
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return scheme;
}

// ---- icons ------------------------------------------------------------------
const Svg = (props) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props} />
);
const IconPlus = () => (<Svg><path d="M12 5v14M5 12h14" /></Svg>);
const IconTrash = () => (<Svg width="15" height="15"><path d="M3 6h18M8 6V4h8v2m-9 0v14a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6" /></Svg>);
const IconClock = () => (<Svg width="18" height="18"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>);

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

function DayChip({ day, active, onClick, tr }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={active}
      aria-label={tr(DAY_ABBR[day])}
      onClick={onClick}
      style={{
        minWidth: 42, padding: '5px 8px', borderRadius: 999, fontSize: 12, fontWeight: 600,
        cursor: 'pointer', userSelect: 'none', transition: 'all .12s',
        border: `1px solid ${active ? T.primary : T.border}`,
        background: active ? T.primary : 'transparent',
        color: active ? T.primaryFg : T.muted,
      }}
    >
      {tr(DAY_ABBR[day])}
    </button>
  );
}

function TimeField({ label, value, onChange, colorScheme, invalid }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
      <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.02em', textTransform: 'uppercase', color: T.muted }}>
        {label}
      </span>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          colorScheme, fontVariantNumeric: 'tabular-nums', fontSize: 14, color: T.fg,
          background: T.panel, padding: '7px 9px', borderRadius: RADIUS,
          border: `1px solid ${invalid ? T.destructive : T.input}`, outline: 'none', width: '100%',
        }}
      />
    </label>
  );
}

// ---- a single schedule rule -------------------------------------------------
function RuleCard({ rule, index, total, tr, colorScheme, onChange, onRemove }) {
  const patch = (changes) => onChange({ ...rule, ...changes });
  const toggleDay = (day) =>
    patch({ dayOfWeek: rule.dayOfWeek.includes(day) ? rule.dayOfWeek.filter((d) => d !== day) : [...rule.dayOfWeek, day] });
  const issues = ruleIssues(rule, tr);
  const timeInvalid = (v) => v !== '' && !TIME_RE.test(v);

  return (
    <div
      style={{
        background: T.card, border: `1px solid ${T.border}`, borderRadius: RADIUS,
        padding: 14, display: 'flex', flexDirection: 'column', gap: 12,
      }}
    >
      {/* header: days + remove */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {DAYS.map((day) => (
            <DayChip key={day} day={day} active={rule.dayOfWeek.includes(day)} onClick={() => toggleDay(day)} tr={tr} />
          ))}
        </div>
        <Button variant="danger" onClick={onRemove} aria-label={tr('Remove interval')}
          title={tr('Remove interval')} style={{ padding: 6, flexShrink: 0 }}>
          <IconTrash />
        </Button>
      </div>

      {/* quick presets */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 12, alignItems: 'center' }}>
        <span style={{ color: T.muted }}>{tr('Quick set')}:</span>
        {[
          ['weekdays', tr('Weekdays')],
          ['weekend', tr('Weekend')],
          ['everyday', tr('Every day')],
        ].map(([key, lbl]) => (
          <button key={key} type="button" onClick={() => patch({ dayOfWeek: [...PRESETS[key]] })}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: T.primary, fontSize: 12, fontWeight: 500 }}>
            {lbl}
          </button>
        ))}
        {rule.dayOfWeek.length > 0 && (
          <button type="button" onClick={() => patch({ dayOfWeek: [] })}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: T.muted, fontSize: 12 }}>
            {tr('Clear')}
          </button>
        )}
      </div>

      {/* opening hours */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 360 }}>
        <TimeField label={tr('Opens')} value={rule.start} colorScheme={colorScheme}
          invalid={timeInvalid(rule.start)} onChange={(v) => patch({ start: v })} />
        <TimeField label={tr('Closes')} value={rule.stop} colorScheme={colorScheme}
          invalid={timeInvalid(rule.stop)} onChange={(v) => patch({ stop: v })} />
      </div>

      {/* break */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: T.fg, width: 'fit-content' }}>
          <input type="checkbox" checked={rule.breakEnabled} style={{ colorScheme, cursor: 'pointer', width: 15, height: 15 }}
            onChange={(e) => patch({
              breakEnabled: e.target.checked,
              breakStart: e.target.checked && !rule.breakStart ? '13:00' : rule.breakStart,
              breakStop: e.target.checked && !rule.breakStop ? '14:00' : rule.breakStop,
            })} />
          {tr('Lunch break')}
        </label>
        {rule.breakEnabled && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 360 }}>
            <TimeField label={tr('Break from')} value={rule.breakStart} colorScheme={colorScheme}
              invalid={timeInvalid(rule.breakStart)} onChange={(v) => patch({ breakStart: v })} />
            <TimeField label={tr('Break to')} value={rule.breakStop} colorScheme={colorScheme}
              invalid={timeInvalid(rule.breakStop)} onChange={(v) => patch({ breakStop: v })} />
          </div>
        )}
      </div>

      {/* validation */}
      {issues.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {issues.map((issue, i) => (
            <span key={i} style={{
              fontSize: 12,
              color: issue.level === 'error' ? T.destructive : issue.level === 'warn' ? T.primary : T.muted,
            }}>
              {issue.text}
            </span>
          ))}
        </div>
      )}

      <span style={{ fontSize: 11, color: T.muted }}>{tr('Interval')} {index + 1} / {total}</span>
    </div>
  );
}

// ---- root editor ------------------------------------------------------------
/**
 * Editable, theme-aware editor for a WorkTime schedule.
 * @param {object}   props
 * @param {*}        props.value     initial WorkTime[] | WorkTime | JSON string
 * @param {Function} props.onChange  called with the updated WorkTime[] on every edit
 * @param {Function} [props.t]       translate(key) => string
 */
function WorktimeEditor({ value, onChange, t }) {
  const tr = useMemo(() => (typeof t === 'function' ? t : (key) => key), [t]);
  const colorScheme = useColorScheme();
  const [rules, setRules] = useState(() => normalizeWorktime(value));

  const commit = useCallback((next) => {
    setRules(next);
    if (typeof onChange === 'function') onChange(serializeRules(next));
  }, [onChange]);

  const addRule = () =>
    commit([...rules, {
      id: nextId(), dayOfWeek: [], start: '09:00', stop: '18:00',
      breakEnabled: false, breakStart: '', breakStop: '', extra: {},
    }]);
  const updateRule = (next) => commit(rules.map((r) => (r.id === next.id ? next : r)));
  const removeRule = (id) => commit(rules.filter((r) => r.id !== id));

  const coverage = useMemo(() => {
    const set = new Set();
    rules.forEach((r) => r.dayOfWeek.forEach((d) => set.add(d)));
    return set;
  }, [rules]);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 12, color: T.fg, colorScheme,
      background: T.panel, border: `1px solid ${T.border}`, borderRadius: RADIUS, padding: 14,
      fontFamily: 'inherit',
    }}>
      {/* header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: T.fg }}>
          <span style={{ color: T.muted, display: 'inline-flex' }}><IconClock /></span>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{tr('Working hours')}</span>
        </div>
        <Button onClick={addRule}><IconPlus />{tr('Add interval')}</Button>
      </div>

      {/* coverage strip */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {DAYS.map((day) => {
          const covered = coverage.has(day);
          return (
            <span key={day} title={covered ? tr('Has hours') : tr('No hours')}
              style={{
                fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
                border: `1px solid ${covered ? T.primary : T.border}`,
                color: covered ? T.primary : T.muted,
                background: covered ? 'color-mix(in oklab, var(--primary, #2563eb) 12%, transparent)' : 'transparent',
              }}>
              {tr(DAY_ABBR[day])}
            </span>
          );
        })}
      </div>

      {/* rules */}
      {rules.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center',
          padding: '28px 16px', border: `1px dashed ${T.border}`, borderRadius: RADIUS, color: T.muted,
        }}>
          <span style={{ display: 'inline-flex', opacity: 0.7 }}><IconClock /></span>
          <span style={{ fontSize: 13 }}>{tr('No working hours configured yet')}</span>
          <Button variant="outline" onClick={addRule}><IconPlus />{tr('Add the first interval')}</Button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rules.map((rule, i) => (
            <RuleCard key={rule.id} rule={rule} index={i} total={rules.length} tr={tr}
              colorScheme={colorScheme} onChange={updateRule} onRemove={() => removeRule(rule.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

export default WorktimeEditor;
