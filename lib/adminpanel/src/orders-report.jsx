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

const { Button, Input } = window.UIComponents;

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
    <I18nProvider initialLocale={locale} messages={props?.messages}>
      <OrdersReportContent locale={locale} />
    </I18nProvider>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

function OrdersReportContent({ locale }) {
  const { t, language } = useTranslation();

  const [appearance, setAppearance] = useState(getPreferredAppearance);
  const isDark = isDarkAppearance(appearance);

  const [anchorMonth, setAnchorMonth] = useState(() => new Date());
  const [fromDate, setFromDate] = useState(() => startOfMonth(new Date()));
  const [toDate, setToDate] = useState(() => endOfMonth(new Date()));
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

  useEffect(() => {
    fetchData(fromDate, toDate);
  }, []);

  useEffect(() => {
    const sync = () => setAppearance(getPreferredAppearance());
    const media = window.matchMedia?.('(prefers-color-scheme: dark)') ?? null;
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
    setAnchorMonth(fromDate);
    fetchData(fromDate, toDate);
  }

  const states = data?.states || REPORT_STATES;
  const rows = data?.rows || [];
  const summary = data?.summary || null;
  const isMonthRange = isSameMonth(fromDate, toDate) && fromDate.getDate() === 1 && toDate.getDate() === endOfMonth(toDate).getDate();

  return (
    <div style={{ background: 'var(--background)', color: 'var(--foreground)', minHeight: '100vh', fontSize: 14, padding: 24, boxSizing: 'border-box' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{t('Orders Report')}</h1>
      </div>

      {/* Controls */}
      <div style={{ background: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)} title="Previous month" style={{ width: 32, height: 32, fontSize: 18, fontWeight: 700 }}>‹</Button>
            <span style={{ fontWeight: 600, fontSize: 15, minWidth: 160, textAlign: 'center' }}>
              {isMonthRange ? formatMonthLabel(anchorMonth, language) : t('Custom range')}
            </span>
            <Button variant="outline" size="icon" onClick={() => navigateMonth(1)} title="Next month" style={{ width: 32, height: 32, fontSize: 18, fontWeight: 700 }}>›</Button>
          </div>

          <div style={{ width: 1, height: 28, background: 'var(--border)', margin: '0 4px' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--muted-foreground)', fontSize: 13 }}>{t('From')}</span>
            <input
              type="date"
              value={toDateInputValue(fromDate)}
              onChange={e => setFromDate(new Date(e.target.value + 'T00:00:00'))}
              style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: 13, cursor: 'pointer', outline: 'none' }}
            />
            <span style={{ color: 'var(--muted-foreground)', fontSize: 13 }}>{t('To')}</span>
            <input
              type="date"
              value={toDateInputValue(toDate)}
              onChange={e => setToDate(new Date(e.target.value + 'T23:59:59'))}
              style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: 13, cursor: 'pointer', outline: 'none' }}
            />
            <Button variant="outline" size="sm" onClick={applyRange}>{t('Apply')}</Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchData(fromDate, toDate)}
            disabled={loading}
            title={t('Refresh')}
            style={{ marginLeft: 'auto', opacity: loading ? 0.6 : 1 }}
          >
            ↻
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '12px 16px', marginBottom: 16, borderRadius: 8, background: 'var(--destructive)', color: '#fff', fontSize: 13, opacity: 0.9 }}>
          {t('Error')}: {error}
        </div>
      )}

      {/* Table */}
      {loading && !data ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--muted-foreground)' }}>
          {t('Loading...')}
        </div>
      ) : rows.length === 0 && !loading ? (
        <div style={{ background: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 10, textAlign: 'center', padding: 48, color: 'var(--muted-foreground)' }}>
          {t('No data for the selected period')}
        </div>
      ) : (
        <ReportTable
          language={language}
          states={states}
          rows={rows}
          summary={summary}
          loading={loading}
          isDark={isDark}
          t={t}
        />
      )}
    </div>
  );
}

// ─── table ────────────────────────────────────────────────────────────────────

function ReportTable({ language, states, rows, summary, loading, isDark, t }) {
  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      overflow: 'hidden',
      opacity: loading ? 0.6 : 1,
      transition: 'opacity 0.2s',
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--muted-foreground)', background: 'var(--muted)', borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap' }}>
              {t('Platform')}
            </th>
            <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, color: 'var(--muted-foreground)', background: 'var(--muted)', borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap' }}>
              {t('Total')}
            </th>
            <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, color: 'var(--muted-foreground)', background: 'var(--muted)', borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap' }}>
              {t('Revenue')}
            </th>
            {states.map(state => (
              <th key={state} style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, color: 'var(--muted-foreground)', background: 'var(--muted)', borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap' }}>
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
              language={language}
              isAlt={i % 2 === 1}
              isDark={isDark}
              t={t}
            />
          ))}
          {summary && (
            <SummaryRow
              summary={summary}
              states={states}
              language={language}
              t={t}
            />
          )}
        </tbody>
      </table>
    </div>
  );
}

function ReportRow({ row, states, language, isAlt, isDark, t }) {
  const [hovered, setHovered] = useState(false);
  const altBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';
  const hoverBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';

  const tdBase = {
    padding: '10px 14px',
    borderBottom: '1px solid var(--border)',
    background: hovered ? hoverBg : isAlt ? altBg : 'var(--card)',
    transition: 'background 0.1s',
  };

  return (
    <tr onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <td style={tdBase}>
        <span style={{ fontWeight: 500 }}>
          {row.platform ?? <span style={{ color: 'var(--muted-foreground)' }}>{t('Unknown')}</span>}
        </span>
      </td>
      <td style={{ ...tdBase, textAlign: 'center' }}>
        <span style={{ fontWeight: 600 }}>{formatNumber(row.total, language)}</span>
      </td>
      <td style={{ ...tdBase, textAlign: 'center' }}>
        <span style={{ fontWeight: 600 }}>{formatNumber(row.totalRevenue, language)}</span>
      </td>
      {states.map(state => {
        const count = row.byState?.[state] || 0;
        return (
          <td key={state} style={{ ...tdBase, textAlign: 'center' }}>
            {count === 0 ? (
              <span style={{ color: 'var(--muted-foreground)', opacity: 0.4 }}>0</span>
            ) : (
              <span style={{ color: STATE_COLORS[state] || 'var(--foreground)', fontWeight: 500 }}>
                {formatNumber(count, language)}
              </span>
            )}
          </td>
        );
      })}
    </tr>
  );
}

function SummaryRow({ summary, states, language, t }) {
  const tdBase = {
    padding: '11px 14px',
    background: 'var(--muted)',
    borderTop: '2px solid var(--border)',
    fontWeight: 700,
  };

  return (
    <tr>
      <td style={tdBase}>{t('Total')}</td>
      <td style={{ ...tdBase, textAlign: 'center' }}>{formatNumber(summary.total, language)}</td>
      <td style={{ ...tdBase, textAlign: 'center' }}>{formatNumber(summary.totalRevenue, language)}</td>
      {states.map(state => {
        const count = summary.byState?.[state] || 0;
        return (
          <td key={state} style={{ ...tdBase, textAlign: 'center' }}>
            {count === 0 ? (
              <span style={{ color: 'var(--muted-foreground)', opacity: 0.4 }}>0</span>
            ) : (
              <span style={{ color: STATE_COLORS[state] || 'var(--foreground)' }}>
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

function StateBadge({ state, t }) {
  const color = STATE_COLORS[state] || '#64748b';
  const stateLabelMap = {
    order: 'Ordered',
    cooking: 'Cooking',
    on_the_way: 'On the way',
    done: 'Done',
    reject: 'Rejected',
  };
  const fallbackLabel = stateLabelMap[state.toLowerCase()] || state;
  const label = t(fallbackLabel) || fallbackLabel;
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 9999,
      background: color + '22',
      color,
      fontWeight: 600,
      fontSize: 12,
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}
