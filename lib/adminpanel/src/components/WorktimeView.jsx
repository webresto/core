import React, { useMemo, useState } from 'react';

export const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
export const DAY_ABBR = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
};
const DAY_COLOR = {
  monday: '#60a5fa',
  tuesday: '#34d399',
  wednesday: '#a78bfa',
  thursday: '#fbbf24',
  friday: '#f87171',
  saturday: '#22d3ee',
  sunday: '#fb7185',
};

function safeStringify(value) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function normalizeBase(candidate) {
  return {
    start: typeof candidate.start === 'string' ? candidate.start : '',
    stop: typeof candidate.stop === 'string' ? candidate.stop : '',
    break: typeof candidate.break === 'string' ? candidate.break : undefined,
  };
}

// worktime is WorkTime[] on Dish/Group/Promotion, but a single WorkTime object
// on Place/Maintenance — accept both shapes.
function normalizeWorktime(value) {
  const list = Array.isArray(value) ? value : (value && typeof value === 'object' ? [value] : []);

  return list.map((item, index) => {
    if (!item || typeof item !== 'object') {
      return { index, dayOfWeek: [], start: '', stop: '', break: undefined, selfService: undefined };
    }

    const dayOfWeek = Array.isArray(item.dayOfWeek)
      ? item.dayOfWeek.filter((d) => DAYS.includes(d))
      : [];
    const selfService = item.selfService && typeof item.selfService === 'object'
      ? normalizeBase(item.selfService)
      : undefined;

    return { index, dayOfWeek, ...normalizeBase(item), selfService };
  });
}

function buildRuleText(rule, t) {
  const days = rule.dayOfWeek.length
    ? rule.dayOfWeek.map((d) => DAY_ABBR[d] || d).join('/')
    : t('any day');
  const range = rule.start && rule.stop ? `${rule.start}–${rule.stop}` : '—';
  const parts = [`${days} ${range}`];
  if (rule.break) parts.push(`${t('break')} ${rule.break}`);
  if (rule.selfService && (rule.selfService.start || rule.selfService.stop)) {
    parts.push(`${t('self-service')} ${rule.selfService.start}–${rule.selfService.stop}`);
  }
  return parts.join('  ·  ');
}

function downloadTextFile(content, filename) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Read-only dark console-style viewer for a WorkTime schedule.
 * Mirrors the OrderLogsViewer control: day filter buttons, search, .txt export.
 * `value` accepts a WorkTime[] or a single WorkTime object.
 * `t` is an optional translate function (key) => string.
 */
function WorktimeView({ value, t }) {
  const tr = useMemo(() => (typeof t === 'function' ? t : (key) => key), [t]);
  const rules = useMemo(() => normalizeWorktime(value), [value]);
  const [query, setQuery] = useState('');
  const [activeDays, setActiveDays] = useState(() => new Set(DAYS));

  const counters = useMemo(() => {
    return rules.reduce((acc, rule) => {
      rule.dayOfWeek.forEach((day) => {
        acc[day] = (acc[day] || 0) + 1;
      });
      return acc;
    }, DAYS.reduce((acc, day) => ({ ...acc, [day]: 0 }), {}));
  }, [rules]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return rules.filter((rule) => {
      if (rule.dayOfWeek.length && !rule.dayOfWeek.some((d) => activeDays.has(d))) return false;
      if (!normalizedQuery) return true;

      const searchText = `${rule.dayOfWeek.join(' ')} ${rule.start} ${rule.stop} ${rule.break || ''} ${safeStringify(rule.selfService)}`.toLowerCase();
      return searchText.includes(normalizedQuery);
    });
  }, [rules, activeDays, query]);

  const toggleDay = (day) => {
    setActiveDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) {
        next.delete(day);
      } else {
        next.add(day);
      }
      return next;
    });
  };

  const downloadWorktime = () => {
    if (filtered.length === 0) return;

    const timestamp = new Date().toISOString().replace(/[:]/g, '-');
    const header = [
      `${tr('Generated at')}: ${new Date().toISOString()}`,
      `${tr('Total rules')}: ${filtered.length}`,
      '',
    ];
    const body = filtered.map((rule) => buildRuleText(rule, tr)).join('\n');
    downloadTextFile(`${header.join('\n')}${body}\n`, `worktime-${timestamp}.txt`);
  };

  return (
    <div style={{ background: '#0b1020', color: '#e2e8f0', borderRadius: 8, padding: 12, border: '1px solid #1f2937' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        {DAYS.map((day) => {
          const active = activeDays.has(day);
          return (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day)}
              style={{
                border: `1px solid ${DAY_COLOR[day]}`,
                color: active ? '#0b1020' : DAY_COLOR[day],
                background: active ? DAY_COLOR[day] : 'transparent',
                borderRadius: 6,
                padding: '2px 8px',
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              {tr(DAY_ABBR[day])} ({counters[day] || 0})
            </button>
          );
        })}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={tr('Search schedule')}
          style={{
            marginLeft: 'auto',
            minWidth: 220,
            background: '#020617',
            border: '1px solid #334155',
            color: '#e2e8f0',
            borderRadius: 6,
            padding: '4px 8px',
          }}
        />
        <button
          type="button"
          onClick={downloadWorktime}
          disabled={filtered.length === 0}
          title={tr('Download .txt')}
          aria-label={tr('Download .txt')}
          style={{
            border: '1px solid #334155',
            color: filtered.length === 0 ? '#64748b' : '#e2e8f0',
            background: '#0f172a',
            borderRadius: 6,
            width: 30,
            height: 30,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: filtered.length === 0 ? 'not-allowed' : 'pointer',
            fontSize: 12,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 3v11m0 0l-4-4m4 4l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div style={{ maxHeight: 420, overflow: 'auto', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: 12, lineHeight: 1.4 }}>
        {filtered.length === 0 && (
          <div style={{ opacity: 0.7, padding: 8 }}>{tr('No schedule found')}</div>
        )}

        {filtered.map((rule) => (
          <div key={rule.index} style={{ borderBottom: '1px solid #1e293b', padding: '6px 4px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
              {rule.dayOfWeek.length === 0 && (
                <span style={{ color: '#94a3b8' }}>{tr('any day')}</span>
              )}
              {rule.dayOfWeek.map((day) => (
                <span
                  key={day}
                  style={{
                    color: DAY_COLOR[day],
                    border: `1px solid ${DAY_COLOR[day]}`,
                    borderRadius: 4,
                    padding: '0 6px',
                    fontWeight: 700,
                  }}
                >
                  {tr(DAY_ABBR[day])}
                </span>
              ))}
              <span style={{ color: '#e2e8f0', marginLeft: 6 }}>
                {rule.start && rule.stop ? `${rule.start}–${rule.stop}` : '—'}
              </span>
              {rule.break ? <span style={{ color: '#fbbf24' }}> · {tr('break')} {rule.break}</span> : null}
            </div>
            {rule.selfService && (rule.selfService.start || rule.selfService.stop) && (
              <div style={{ color: '#cbd5e1', marginTop: 2 }}>
                {tr('self-service')}: {rule.selfService.start}–{rule.selfService.stop}
                {rule.selfService.break ? ` · ${tr('break')} ${rule.selfService.break}` : ''}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default WorktimeView;
