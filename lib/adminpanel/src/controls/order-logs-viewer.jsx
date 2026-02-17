import React, { useMemo, useState } from 'react';
import { locales } from '../i18n/locales';

const LEVELS = ['debug', 'info', 'warn', 'error'];
const LEVEL_COLOR = {
  debug: '#60a5fa',
  info: '#34d399',
  warn: '#fbbf24',
  error: '#f87171',
};
const FALLBACK_LOCALE = 'en';
const ALL_MODULES_VALUE = '__all_modules__';

function resolveLocale() {
  if (typeof window === 'undefined') return FALLBACK_LOCALE;

  const saved = window.localStorage?.getItem('stockManagerLanguage');
  if (saved && locales[saved]) return saved;

  const htmlLang = window.document?.documentElement?.lang?.split('-')[0];
  if (htmlLang && locales[htmlLang]) return htmlLang;

  const browserLang = window.navigator?.language?.split('-')[0];
  if (browserLang && locales[browserLang]) return browserLang;

  return FALLBACK_LOCALE;
}

function createT(locale) {
  const dictionary = locales[locale] || locales[FALLBACK_LOCALE] || {};
  const fallback = locales[FALLBACK_LOCALE] || {};
  return (key, fallbackText) => dictionary[key] || fallback[key] || fallbackText;
}

function safeStringify(value) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function buildLogText(log) {
  const header = `[${log.timestamp}] ${log.level.toUpperCase()} ${log.module}${log.message ? ` — ${log.message}` : ''}`;
  if (log.data === undefined) {
    return header;
  }
  return `${header}\n${safeStringify(log.data)}`;
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

function normalizeLogs(initialValue, t) {
  if (!Array.isArray(initialValue)) return [];

  return initialValue.map((item, index) => {
    if (!item || typeof item !== 'object') {
      return {
        index,
        timestamp: t('order_logs_unknown_time', 'unknown-time'),
        level: 'info',
        module: t('order_logs_unknown_module', 'unknown-module'),
        message: String(item),
        data: undefined,
      };
    }

    const level = LEVELS.includes(item.level) ? item.level : 'info';
    return {
      index,
      timestamp: item.timestamp || t('order_logs_unknown_time', 'unknown-time'),
      level,
      module: item.module || t('order_logs_unknown_module', 'unknown-module'),
      message: item.message || '',
      data: item.data,
    };
  });
}

function OrderLogsViewer({ initialValue }) {
  const locale = useMemo(() => resolveLocale(), []);
  const t = useMemo(() => createT(locale), [locale]);
  const logs = useMemo(() => normalizeLogs(initialValue, t), [initialValue, t]);
  const [query, setQuery] = useState('');
  const [activeLevels, setActiveLevels] = useState(() => new Set(LEVELS));
  const [selectedModule, setSelectedModule] = useState(ALL_MODULES_VALUE);

  const counters = useMemo(() => {
    return logs.reduce((acc, log) => {
      acc[log.level] = (acc[log.level] || 0) + 1;
      return acc;
    }, { debug: 0, info: 0, warn: 0, error: 0 });
  }, [logs]);

  const moduleOptions = useMemo(() => {
    const unique = new Set(logs.map((log) => log.module).filter(Boolean));
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [logs]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return logs.filter((log) => {
      if (!activeLevels.has(log.level)) return false;
      if (selectedModule !== ALL_MODULES_VALUE && log.module !== selectedModule) return false;
      if (!normalizedQuery) return true;

      const searchText = `${log.timestamp} ${log.level} ${log.module} ${log.message} ${safeStringify(log.data)}`.toLowerCase();
      return searchText.includes(normalizedQuery);
    });
  }, [logs, activeLevels, selectedModule, query]);

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

  const downloadLogs = () => {
    if (filtered.length === 0) return;

    const timestamp = new Date().toISOString().replace(/[:]/g, '-');
    const header = [
      `Generated at: ${new Date().toISOString()}`,
      `Total logs: ${filtered.length}`,
      '',
    ];
    const body = filtered.map(buildLogText).join('\n\n');
    downloadTextFile(`${header.join('\n')}${body}\n`, `order-logs-${timestamp}.txt`);
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
          placeholder={t('order_logs_search_placeholder', 'Search logs')}
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
        <select
          value={selectedModule}
          onChange={(e) => setSelectedModule(e.target.value)}
          title={t('order_logs_module_filter', 'Module filter')}
          aria-label={t('order_logs_module_filter', 'Module filter')}
          style={{
            minWidth: 180,
            background: '#020617',
            border: '1px solid #334155',
            color: '#e2e8f0',
            borderRadius: 6,
            padding: '4px 8px',
          }}
        >
          <option value={ALL_MODULES_VALUE}>{t('order_logs_module_all', 'All modules')}</option>
          {moduleOptions.map((moduleName) => (
            <option key={moduleName} value={moduleName}>{moduleName}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={downloadLogs}
          disabled={filtered.length === 0}
          title={t('order_logs_download_txt', 'Download .txt')}
          aria-label={t('order_logs_download_txt', 'Download .txt')}
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
          <div style={{ opacity: 0.7, padding: 8 }}>{t('order_logs_empty', 'No logs found')}</div>
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
