import React, { useMemo, useState } from 'react';

const LEVELS = ['debug', 'info', 'warn', 'error'];
const LEVEL_COLOR = {
  debug: '#60a5fa',
  info: '#34d399',
  warn: '#fbbf24',
  error: '#f87171',
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

function normalizeLogs(initialValue) {
  if (!Array.isArray(initialValue)) return [];

  return initialValue.map((item, index) => {
    if (!item || typeof item !== 'object') {
      return {
        index,
        timestamp: 'unknown-time',
        level: 'info',
        module: 'unknown-module',
        message: String(item),
        data: undefined,
      };
    }

    const level = LEVELS.includes(item.level) ? item.level : 'info';
    return {
      index,
      timestamp: item.timestamp || 'unknown-time',
      level,
      module: item.module || 'unknown-module',
      message: item.message || '',
      data: item.data,
    };
  });
}

function OrderLogsViewer({ initialValue }) {
  const logs = useMemo(() => normalizeLogs(initialValue), [initialValue]);
  const [query, setQuery] = useState('');
  const [activeLevels, setActiveLevels] = useState(() => new Set(LEVELS));

  const counters = useMemo(() => {
    return logs.reduce((acc, log) => {
      acc[log.level] = (acc[log.level] || 0) + 1;
      return acc;
    }, { debug: 0, info: 0, warn: 0, error: 0 });
  }, [logs]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return logs.filter((log) => {
      if (!activeLevels.has(log.level)) return false;
      if (!normalizedQuery) return true;

      const searchText = `${log.timestamp} ${log.level} ${log.module} ${log.message} ${safeStringify(log.data)}`.toLowerCase();
      return searchText.includes(normalizedQuery);
    });
  }, [logs, activeLevels, query]);

  const toggleLevel = (level) => {
    setActiveLevels((prev) => {
      const next = new Set(prev);
      if (next.has(level)) {
        next.delete(level);
      } else {
        next.add(level);
      }
      return next;
    });
  };

  return (
    <div style={{ background: '#0b1020', color: '#e2e8f0', borderRadius: 8, padding: 12, border: '1px solid #1f2937' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        {LEVELS.map((level) => {
          const active = activeLevels.has(level);
          return (
            <button
              key={level}
              type="button"
              onClick={() => toggleLevel(level)}
              style={{
                border: `1px solid ${LEVEL_COLOR[level]}`,
                color: active ? '#0b1020' : LEVEL_COLOR[level],
                background: active ? LEVEL_COLOR[level] : 'transparent',
                borderRadius: 6,
                padding: '2px 8px',
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              {level} ({counters[level] || 0})
            </button>
          );
        })}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по логам"
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
      </div>

      <div style={{ maxHeight: 420, overflow: 'auto', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: 12, lineHeight: 1.4 }}>
        {filtered.length === 0 && (
          <div style={{ opacity: 0.7, padding: 8 }}>Логи не найдены</div>
        )}

        {filtered.map((log) => (
          <div key={`${log.index}-${log.timestamp}`} style={{ borderBottom: '1px solid #1e293b', padding: '6px 4px' }}>
            <div>
              <span style={{ color: '#94a3b8' }}>[{log.timestamp}] </span>
              <span style={{ color: LEVEL_COLOR[log.level], fontWeight: 700 }}>{log.level.toUpperCase()}</span>
              <span style={{ color: '#cbd5e1' }}> {log.module}</span>
              {log.message ? <span style={{ color: '#e2e8f0' }}> — {log.message}</span> : null}
            </div>
            {log.data !== undefined && (
              <pre style={{ margin: '4px 0 0 0', color: '#cbd5e1', whiteSpace: 'pre-wrap' }}>{safeStringify(log.data)}</pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default OrderLogsViewer;
