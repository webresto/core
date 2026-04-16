import React, { useCallback, useEffect, useRef, useState } from 'react';
import { I18nProvider, useTranslation } from './i18n/I18nContext';

const REPORT_STATES = ['ORDER', 'COOKING', 'ON_THE_WAY', 'DONE', 'REJECT'];
const APPEARANCE_STORAGE_KEY = 'appearance';
const SUPPORTED_LOCALES = new Set(['en', 'es', 'zh', 'hi', 'ar', 'ru', 'fr', 'ua']);

const STATE_COLORS = {
  ORDER: '#16a34a',
  COOKING: '#ea580c',
  ON_THE_WAY: '#0891b2',
  DONE: '#15803d',
  REJECT: '#dc2626',
};

const REPORT_THEME = {
  light: {
    pageBackground: '#ffffff',
    textPrimary: '#0f172a',
    textSecondary: '#334155',
    textMuted: '#64748b',
    panelBackground: '#f8fafc',
    panelBorder: '#e2e8f0',
    cardBackground: '#ffffff',
    cardBorder: '#dbeafe',
    controlBackground: '#f8fafc',
    controlBorder: '#cbd5e1',
    controlText: '#0f172a',
    tableHeaderBackground: '#f1f5f9',
    tableRowAlt: '#f8fafc',
    tableRowHover: '#f0f9ff',
    tableBorder: '#e2e8f0',
    summaryRowBackground: '#f1f5f9',
    zeroText: '#cbd5e1',
  },
  dark: {
    pageBackground: '#020617',
    textPrimary: '#e2e8f0',
    textSecondary: '#cbd5e1',
    textMuted: '#94a3b8',
    panelBackground: '#0f172a',
    panelBorder: '#1e293b',
    cardBackground: '#111827',
    cardBorder: '#334155',
    controlBackground: '#1e293b',
    controlBorder: '#334155',
    controlText: '#e2e8f0',
    tableHeaderBackground: '#0f172a',
    tableRowAlt: '#0a1120',
    tableRowHover: '#1e293b',
    tableBorder: '#1e293b',
    summaryRowBackground: '#1e293b',
    zeroText: '#334155',
  },
};

// ─── helpers ─────────────────────────────────────────────────────────────────

function normalizeLocale(rawLocale) {
  if (!rawLocale) return '';
  const normalized = String(rawLocale).trim().toLowerCase().replace(/_/g, '-');
  if (SUPPORTED_LOCALES.has(normalized)) return normalized;
  const base = normalized.split('-')[0];
  if (base === 'uk') return 'ua';
  return SUPPORTED_LOCALES.has(base) ? base : '';
}

function resolveSystemLocale(rawLocale) {
  const fromProps = normalizeLocale(rawLocale);
  if (fromProps) return fromProps;
  if (typeof document !== 'undefined') {
    const fromDoc = normalizeLocale(document.documentElement?.lang);
    if (fromDoc) return fromDoc;
  }
  if (typeof navigator !== 'undefined') {
    const fromBrowser = normalizeLocale(navigator.language);
    if (fromBrowser) return fromBrowser;
  }
  return 'en';
}

function getPreferredAppearance() {
  if (typeof window === 'undefined') return 'light';
  return localStorage.getItem(APPEARANCE_STORAGE_KEY) || 'system';
}

function isDarkAppearance(appearance) {
  if (appearance === 'dark') return true;
  if (appearance === 'light') return false;
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function getBaseAdminPath() {
  return (window.location.pathname || '').replace(/\/[^/]*$/, '');
}

function withNoCacheTs(endpoint) {
  const joinChar = endpoint.includes('?') ? '&' : '?';
  return `${endpoint}${joinChar}_ts=${Date.now()}`;
}

async function fetchJsonNoCache(endpoint, options = {}) {
  const response = await fetch(withNoCacheTs(endpoint), {
    ...options,
    credentials: options.credentials || 'same-origin',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
      ...(options.headers || {}),
    },
  });

  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  if (!response.ok || !contentType.includes('application/json')) {
    const text = await response.text();
    throw new Error(
      `HTTP ${response.status}. Expected JSON, got "${contentType || 'unknown'}". ${text.slice(0, 120)}`
    );
  }

  return response.json();
}

function formatNumber(value, language) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '0';
  return new Intl.NumberFormat(language, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function toDateInputValue(date) {
  // yyyy-mm-dd
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function addMonths(date, delta) {
  const d = new Date(date);
  d.setDate(1);
  d.setMonth(d.getMonth() + delta);
  return d;
}

function isSameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function formatMonthLabel(date, language) {
  return new Intl.DateTimeFormat(language || 'en', { month: 'long', year: 'numeric' }).format(date);
}

// ─── root export ─────────────────────────────────────────────────────────────

export default function OrdersReport({ props }) {
  const locale = resolveSystemLocale(props?.locale);
  return (
    <I18nProvider initialLocale={locale}>
      <OrdersReportContent locale={locale} />
    </I18nProvider>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

function OrdersReportContent({ locale }) {
  const { t, language } = useTranslation();

  const [appearance, setAppearance] = useState(getPreferredAppearance);
  const isDark = isDarkAppearance(appearance);
  const theme = isDark ? REPORT_THEME.dark : REPORT_THEME.light;

  // Current "anchor" month for navigation
  const [anchorMonth, setAnchorMonth] = useState(() => new Date());

  // from / to as Date objects
  const [fromDate, setFromDate] = useState(() => startOfMonth(new Date()));
  const [toDate, setToDate] = useState(() => endOfMonth(new Date()));

  // sync from/to when anchor changes via arrows
  const anchorRef = useRef(anchorMonth);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (from, to) => {
    setLoading(true);
    setError(null);
    try {
      const base = getBaseAdminPath();
      const url = `${base}/core/orders-report/data?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`;
      const json = await fetchJsonNoCache(url);
      setData(json);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchData(fromDate, toDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync appearance from storage changes (other tabs)
  useEffect(() => {
    function onStorage(e) {
      if (e.key === APPEARANCE_STORAGE_KEY) setAppearance(e.newValue || 'system');
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Navigate months
  function navigateMonth(delta) {
    const newAnchor = addMonths(anchorMonth, delta);
    setAnchorMonth(newAnchor);
    const newFrom = startOfMonth(newAnchor);
    const newTo = endOfMonth(newAnchor);
    setFromDate(newFrom);
    setToDate(newTo);
    fetchData(newFrom, newTo);
  }

  function applyRange() {
    // When applying a custom range, clear month anchor sync
    setAnchorMonth(fromDate);
    fetchData(fromDate, toDate);
  }

  const states = data?.states || REPORT_STATES;
  const rows = data?.rows || [];
  const summary = data?.summary || null;
  const isMonthRange = isSameMonth(fromDate, toDate) && fromDate.getDate() === 1 && toDate.getDate() === endOfMonth(toDate).getDate();

  // ── render ─────────────────────────────────────────────────────────────────

  const containerStyle = {
    minHeight: '100vh',
    background: theme.pageBackground,
    color: theme.textPrimary,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '14px',
    padding: '24px',
    boxSizing: 'border-box',
  };

  const panelStyle = {
    background: theme.panelBackground,
    border: `1px solid ${theme.panelBorder}`,
    borderRadius: '10px',
    padding: '16px 20px',
    marginBottom: '20px',
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: theme.textPrimary }}>
          {t('orders_report_title')}
        </h1>
      </div>

      {/* Controls */}
      <div style={panelStyle}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>

          {/* Month navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <NavButton theme={theme} onClick={() => navigateMonth(-1)} title="Previous month">‹</NavButton>
            <span style={{ fontWeight: 600, fontSize: '15px', minWidth: '160px', textAlign: 'center', color: theme.textPrimary }}>
              {isMonthRange ? formatMonthLabel(anchorMonth, language) : t('orders_report_custom_range')}
            </span>
            <NavButton theme={theme} onClick={() => navigateMonth(1)} title="Next month">›</NavButton>
          </div>

          {/* Divider */}
          <div style={{ width: '1px', height: '28px', background: theme.panelBorder, margin: '0 4px' }} />

          {/* Date range inputs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: theme.textMuted, fontSize: '13px' }}>{t('orders_report_from')}</span>
            <DateInput
              theme={theme}
              value={toDateInputValue(fromDate)}
              onChange={v => setFromDate(new Date(v + 'T00:00:00'))}
            />
            <span style={{ color: theme.textMuted, fontSize: '13px' }}>{t('orders_report_to')}</span>
            <DateInput
              theme={theme}
              value={toDateInputValue(toDate)}
              onChange={v => setToDate(new Date(v + 'T23:59:59'))}
            />
            <button
              onClick={applyRange}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: `1px solid ${theme.controlBorder}`,
                background: theme.controlBackground,
                color: theme.controlText,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '13px',
              }}
            >
              {t('orders_report_apply')}
            </button>
          </div>

          {/* Refresh */}
          <button
            onClick={() => fetchData(fromDate, toDate)}
            disabled={loading}
            style={{
              marginLeft: 'auto',
              padding: '6px 12px',
              borderRadius: '6px',
              border: `1px solid ${theme.controlBorder}`,
              background: theme.controlBackground,
              color: theme.textMuted,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              opacity: loading ? 0.6 : 1,
            }}
            title={t('orders_report_refresh')}
          >
            ↻
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '12px 16px',
          marginBottom: '16px',
          borderRadius: '8px',
          background: isDark ? '#1f0a0a' : '#fff1f1',
          border: `1px solid ${isDark ? '#7f1d1d' : '#fca5a5'}`,
          color: isDark ? '#fca5a5' : '#b91c1c',
          fontSize: '13px',
        }}>
          {t('orders_report_error')}: {error}
        </div>
      )}

      {/* Table */}
      {loading && !data ? (
        <div style={{ textAlign: 'center', padding: '48px', color: theme.textMuted }}>
          {t('orders_report_loading')}
        </div>
      ) : rows.length === 0 && !loading ? (
        <div style={{
          ...panelStyle,
          textAlign: 'center',
          padding: '48px',
          color: theme.textMuted,
        }}>
          {t('orders_report_no_data')}
        </div>
      ) : (
        <ReportTable
          theme={theme}
          language={language}
          states={states}
          rows={rows}
          summary={summary}
          loading={loading}
          t={t}
        />
      )}
    </div>
  );
}

// ─── table ────────────────────────────────────────────────────────────────────

function ReportTable({ theme, language, states, rows, summary, loading, t }) {
  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
  };

  const thStyle = {
    padding: '10px 14px',
    textAlign: 'left',
    fontWeight: 600,
    color: theme.textSecondary,
    background: theme.tableHeaderBackground,
    borderBottom: `2px solid ${theme.tableBorder}`,
    whiteSpace: 'nowrap',
  };

  const thCenterStyle = { ...thStyle, textAlign: 'center' };

  return (
    <div style={{
      background: theme.cardBackground,
      border: `1px solid ${theme.cardBorder}`,
      borderRadius: '10px',
      overflow: 'hidden',
      opacity: loading ? 0.6 : 1,
      transition: 'opacity 0.2s',
    }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>{t('orders_report_platform')}</th>
            <th style={thCenterStyle}>{t('orders_report_total')}</th>
            <th style={thCenterStyle}>{t('orders_report_revenue')}</th>
            {states.map(state => (
              <th key={state} style={{ ...thCenterStyle }}>
                <StateBadge state={state} t={t} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <ReportRow
              key={row.platform ?? '__null__'}
              row={row}
              states={states}
              theme={theme}
              language={language}
              isAlt={i % 2 === 1}
              t={t}
            />
          ))}
          {summary && (
            <SummaryRow
              summary={summary}
              states={states}
              theme={theme}
              language={language}
              t={t}
            />
          )}
        </tbody>
      </table>
    </div>
  );
}

function ReportRow({ row, states, theme, language, isAlt, t }) {
  const [hovered, setHovered] = useState(false);

  const tdStyle = {
    padding: '10px 14px',
    borderBottom: `1px solid ${theme.tableBorder}`,
    background: hovered
      ? theme.tableRowHover
      : isAlt ? theme.tableRowAlt : theme.cardBackground,
    transition: 'background 0.1s',
  };

  const tdCenterStyle = { ...tdStyle, textAlign: 'center' };

  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <td style={tdStyle}>
        <span style={{ fontWeight: 500, color: theme.textPrimary }}>
          {row.platform ?? <span style={{ color: theme.textMuted }}>—</span>}
        </span>
      </td>
      <td style={tdCenterStyle}>
        <span style={{ fontWeight: 600 }}>{formatNumber(row.total, language)}</span>
      </td>
      <td style={tdCenterStyle}>
        <span style={{ fontWeight: 600 }}>{formatNumber(row.totalRevenue, language)}</span>
      </td>
      {states.map(state => {
        const count = row.byState?.[state] || 0;
        return (
          <td key={state} style={tdCenterStyle}>
            {count === 0 ? (
              <span style={{ color: theme.zeroText }}>0</span>
            ) : (
              <span style={{ color: STATE_COLORS[state] || theme.textPrimary, fontWeight: 500 }}>
                {formatNumber(count, language)}
              </span>
            )}
          </td>
        );
      })}
    </tr>
  );
}

function SummaryRow({ summary, states, theme, language, t }) {
  const tdStyle = {
    padding: '11px 14px',
    background: theme.summaryRowBackground,
    borderTop: `2px solid ${theme.tableBorder}`,
    fontWeight: 700,
    color: theme.textPrimary,
  };

  const tdCenterStyle = { ...tdStyle, textAlign: 'center' };

  return (
    <tr>
      <td style={tdStyle}>{t('orders_report_summary')}</td>
      <td style={tdCenterStyle}>{formatNumber(summary.total, language)}</td>
      <td style={tdCenterStyle}>{formatNumber(summary.totalRevenue, language)}</td>
      {states.map(state => {
        const count = summary.byState?.[state] || 0;
        return (
          <td key={state} style={tdCenterStyle}>
            {count === 0 ? (
              <span style={{ color: theme.zeroText }}>0</span>
            ) : (
              <span style={{ color: STATE_COLORS[state] || theme.textPrimary }}>
                {formatNumber(count, language)}
              </span>
            )}
          </td>
        );
      })}
    </tr>
  );
}

// ─── small ui pieces ──────────────────────────────────────────────────────────

function NavButton({ theme, onClick, title, children }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '32px',
        height: '32px',
        borderRadius: '6px',
        border: `1px solid ${theme.controlBorder}`,
        background: hovered ? theme.controlBorder : theme.controlBackground,
        color: theme.controlText,
        cursor: 'pointer',
        fontWeight: 700,
        fontSize: '18px',
        lineHeight: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.15s',
      }}
    >
      {children}
    </button>
  );
}

function DateInput({ theme, value, onChange }) {
  return (
    <input
      type="date"
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        padding: '5px 8px',
        borderRadius: '6px',
        border: `1px solid ${theme.controlBorder}`,
        background: theme.controlBackground,
        color: theme.controlText,
        fontSize: '13px',
        cursor: 'pointer',
        outline: 'none',
      }}
    />
  );
}

function StateBadge({ state, t }) {
  const color = STATE_COLORS[state] || '#64748b';
  const label = t(`orders_report_state_${state.toLowerCase()}`) || state;
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '9999px',
      background: color + '22',
      color,
      fontWeight: 600,
      fontSize: '12px',
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}
