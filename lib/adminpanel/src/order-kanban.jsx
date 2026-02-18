import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { I18nProvider, useTranslation } from './i18n/I18nContext';

const ACTIVE_BOARD_STATES = ['NEW', 'CART', 'CHECKOUT', 'PAYMENT', 'ORDER', 'COOKING', 'ON_THE_WAY'];
const FINISHED_BOARD_STATES = ['DONE', 'REJECT'];
const ORDER_TRANSITIONS = {
  NEW: ['CART'],
  CART: ['CHECKOUT', 'REJECT'],
  CHECKOUT: ['CART', 'PAYMENT', 'ORDER', 'REJECT'],
  PAYMENT: ['CART', 'ORDER', 'CHECKOUT', 'REJECT'],
  ORDER: ['COOKING', 'ON_THE_WAY', 'DONE', 'REJECT'],
  COOKING: ['ON_THE_WAY', 'DONE', 'REJECT'],
  ON_THE_WAY: ['DONE', 'REJECT'],
  DONE: [],
  REJECT: [],
};
const OPERATOR_TARGET_STATES = ['REJECT', 'COOKING', 'ON_THE_WAY', 'DONE'];
const STATE_COLORS = {
  NEW: '#0ea5e9',
  CART: '#7c3aed',
  CHECKOUT: '#2563eb',
  PAYMENT: '#d97706',
  ORDER: '#16a34a',
  COOKING: '#ea580c',
  ON_THE_WAY: '#0891b2',
  DONE: '#15803d',
  REJECT: '#dc2626',
};
const COMPLETED_WINDOW_HOURS_DEFAULT = 24;
const COMPLETED_WINDOW_HOURS_MIN = 1;
const COMPLETED_WINDOW_HOURS_MAX = 168;
const COMPLETED_WINDOW_OPTIONS = [1, 3, 6, 12, 24, 48, 72, 168];
const NEW_WINDOW_MINUTES_DEFAULT = 15;
const NEW_WINDOW_MINUTES_MIN = 1;
const NEW_WINDOW_MINUTES_MAX = 1440;
const NEW_WINDOW_OPTIONS = [1, 5, 10, 15, 30, 45, 60, 90, 120, 180];
const COMPLETED_STATES = new Set(['DONE', 'REJECT']);
const KANBAN_STREAM_RECONNECT_DELAY_MS = 5000;
const KANBAN_STREAM_STALE_TIMEOUT_MS = 90000;
const KANBAN_FULL_SYNC_INTERVAL_MS = 30000;
const KANBAN_EVENT_REFRESH_DEBOUNCE_MS = 300;
const COMPLETED_WINDOW_STORAGE_KEY = 'orderKanbanCompletedWindowHours';
const NEW_WINDOW_STORAGE_KEY = 'orderKanbanNewWindowMinutes';
const COLLAPSED_COLUMNS_STORAGE_KEY = 'orderKanbanCollapsedColumns';
const APPEARANCE_STORAGE_KEY = 'appearance';
const KANBAN_COLUMN_WIDTH_MIN = 280;
const KANBAN_COLUMN_WIDTH_MAX = 340;
const DEFAULT_EXPANDED_COLUMNS = ['ORDER', 'DONE'];
const DEFAULT_COLLAPSED_COLUMNS = [...ACTIVE_BOARD_STATES, ...FINISHED_BOARD_STATES]
  .filter((state) => !DEFAULT_EXPANDED_COLUMNS.includes(state));

const KANBAN_THEME = {
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
    softBadgeBackground: '#e2e8f0',
    softBadgeText: '#334155',
    overlayBackground: 'rgba(2, 6, 23, 0.56)',
    popupBackground: '#ffffff',
    popupBorder: '#dbeafe',
    popupCommentBackground: '#f8fafc',
    popupCommentBorder: '#e2e8f0',
    popupPayloadBackground: '#0f172a',
    popupPayloadText: '#e2e8f0',
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
    softBadgeBackground: '#334155',
    softBadgeText: '#e2e8f0',
    overlayBackground: 'rgba(2, 6, 23, 0.8)',
    popupBackground: '#0f172a',
    popupBorder: '#334155',
    popupCommentBackground: '#111827',
    popupCommentBorder: '#334155',
    popupPayloadBackground: '#020617',
    popupPayloadText: '#e2e8f0',
  },
};

function clampCompletedWindowHours(value) {
  const parsed = Number.parseInt(String(value || COMPLETED_WINDOW_HOURS_DEFAULT), 10);
  if (!Number.isFinite(parsed)) return COMPLETED_WINDOW_HOURS_DEFAULT;
  return Math.min(Math.max(parsed, COMPLETED_WINDOW_HOURS_MIN), COMPLETED_WINDOW_HOURS_MAX);
}

function clampNewWindowMinutes(value) {
  const parsed = Number.parseInt(String(value || NEW_WINDOW_MINUTES_DEFAULT), 10);
  if (!Number.isFinite(parsed)) return NEW_WINDOW_MINUTES_DEFAULT;
  return Math.min(Math.max(parsed, NEW_WINDOW_MINUTES_MIN), NEW_WINDOW_MINUTES_MAX);
}

function getPreferredAppearance() {
  if (typeof window === 'undefined') return 'light';
  return localStorage.getItem(APPEARANCE_STORAGE_KEY) || 'system';
}

function getInitialCollapsedColumns() {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(COLLAPSED_COLUMNS_STORAGE_KEY);
    if (raw === null) {
      return new Set(DEFAULT_COLLAPSED_COLUMNS);
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((item) => typeof item === 'string'));
  } catch {
    return new Set(DEFAULT_COLLAPSED_COLUMNS);
  }
}

function isDarkAppearance(appearance) {
  if (appearance === 'dark') return true;
  if (appearance === 'light') return false;
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyAppearance(appearance) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const mode = appearance || 'system';
  localStorage.setItem(APPEARANCE_STORAGE_KEY, mode);
  const maxAge = 365 * 24 * 60 * 60;
  document.cookie = `appearance=${mode};path=/;max-age=${maxAge};SameSite=Lax`;
  document.documentElement.classList.toggle('dark', isDarkAppearance(mode));
  window.dispatchEvent(new Event('appearanceChanged'));
}

function getBaseAdminPath() {
  return (window.location.pathname || '').replace(/\/[^/]*$/, '');
}

function getCsrfToken() {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [rawName, rawValue] = cookie.trim().split('=');
    if (rawName === 'XSRF-TOKEN') return decodeURIComponent(rawValue || '');
  }
  return '';
}

function toDisplayState(state, t) {
  const normalized = String(state || '').toLowerCase();
  const key = `order_kanban_state_${normalized}`;
  const translated = t(key);
  return translated === key ? state : translated;
}

function isCompletedState(state) {
  return COMPLETED_STATES.has(String(state || ''));
}

function formatDateTime(value, language) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat(language, {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatTotal(value, language) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '0';
  return new Intl.NumberFormat(language, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function safeJson(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function getAllowedTransitionsByState(state, operatorLimited = false) {
  const normalizedState = String(state || '');
  if (operatorLimited) {
    return OPERATOR_TARGET_STATES.filter((targetState) => targetState !== normalizedState);
  }
  return ORDER_TRANSITIONS[normalizedState] || [];
}

function normalizeOrder(order, operatorLimited = false) {
  if (!order || typeof order !== 'object') return null;
  const state = order.state || 'NEW';
  return {
    id: order.id,
    shortId: order.shortId || String(order.id || '').slice(-8),
    state,
    total: Number.isFinite(Number(order.total)) ? Number(order.total) : 0,
    dishesCount: Number.isFinite(Number(order.dishesCount)) ? Number(order.dishesCount) : 0,
    customerName: order.customerName || '',
    customerPhone: order.customerPhone || '',
    comment: order.comment || '',
    tag: order.tag || '',
    paid: Boolean(order.paid),
    selfService: Boolean(order.selfService),
    rmsOrderNumber: order.rmsOrderNumber || '',
    createdAt: order.createdAt || null,
    updatedAt: order.updatedAt || null,
    allowedTransitions: Array.isArray(order.allowedTransitions)
      ? order.allowedTransitions
      : getAllowedTransitionsByState(state, operatorLimited),
  };
}

function OrderDetailsPopup({ order, language, t, onClose, theme }) {
  if (!order) return null;
  const boolText = (value) => value ? t('order_kanban_yes') : t('order_kanban_no');
  const rowStyle = {
    display: 'grid',
    gridTemplateColumns: '170px 1fr',
    gap: 8,
    fontSize: 13,
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1200,
        background: theme.overlayBackground,
        padding: 18,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <section
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 'min(860px, 100%)',
          maxHeight: '90vh',
          overflow: 'auto',
          background: theme.popupBackground,
          border: `1px solid ${theme.popupBorder}`,
          borderRadius: 12,
          boxShadow: '0 14px 32px rgba(2, 6, 23, 0.2)',
          padding: 16,
          color: theme.textPrimary,
        }}
      >
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
            {t('order_kanban_details_title')} #{order.shortId}
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: `1px solid ${theme.controlBorder}`,
              background: theme.controlBackground,
              color: theme.controlText,
              width: 30,
              height: 30,
              borderRadius: 6,
              cursor: 'pointer',
            }}
            title={t('order_kanban_close')}
            aria-label={t('order_kanban_close')}
          >
            ×
          </button>
        </header>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={rowStyle}><strong>{t('order_kanban_order_id')}</strong><span>{order.id || '-'}</span></div>
          <div style={rowStyle}><strong>{t('order_kanban_state')}</strong><span>{toDisplayState(order.state, t)}</span></div>
          <div style={rowStyle}><strong>{t('order_kanban_created')}</strong><span>{formatDateTime(order.createdAt, language)}</span></div>
          <div style={rowStyle}><strong>{t('order_kanban_updated')}</strong><span>{formatDateTime(order.updatedAt, language)}</span></div>
          <div style={rowStyle}><strong>{t('order_kanban_customer')}</strong><span>{order.customerName || t('order_kanban_guest')}</span></div>
          <div style={rowStyle}><strong>{t('order_kanban_phone')}</strong><span>{order.customerPhone || t('order_kanban_no_phone')}</span></div>
          <div style={rowStyle}><strong>{t('order_kanban_total')}</strong><span>{formatTotal(order.total, language)}</span></div>
          <div style={rowStyle}><strong>{t('order_kanban_items')}</strong><span>{order.dishesCount}</span></div>
          <div style={rowStyle}><strong>RMS</strong><span>{order.rmsOrderNumber || '-'}</span></div>
          <div style={rowStyle}><strong>{t('order_kanban_tag')}</strong><span>{order.tag || '-'}</span></div>
          <div style={rowStyle}><strong>{t('order_kanban_paid')}</strong><span>{boolText(order.paid)}</span></div>
          <div style={rowStyle}><strong>{t('order_kanban_self_service')}</strong><span>{boolText(order.selfService)}</span></div>

          <div style={{ marginTop: 6 }}>
            <strong>{t('order_kanban_comment')}</strong>
            <div
              style={{
                marginTop: 6,
                border: `1px solid ${theme.popupCommentBorder}`,
                background: theme.popupCommentBackground,
                borderRadius: 8,
                padding: 10,
                whiteSpace: 'pre-wrap',
                fontSize: 13,
                color: theme.textSecondary,
              }}
            >
              {order.comment || t('order_kanban_no_comment')}
            </div>
          </div>

          <div style={{ marginTop: 6 }}>
            <strong>{t('order_kanban_raw_payload')}</strong>
            <pre
              style={{
                marginTop: 6,
                border: `1px solid ${theme.popupCommentBorder}`,
                background: theme.popupPayloadBackground,
                color: theme.popupPayloadText,
                borderRadius: 8,
                padding: 10,
                maxHeight: 240,
                overflow: 'auto',
                fontSize: 12,
                lineHeight: 1.4,
              }}
            >
              {safeJson(order)}
            </pre>
          </div>
        </div>
      </section>
    </div>
  );
}

function OrderCard({ order, language, t, isUpdating, onMove, onDragStart, onOpen, operatorLimited, theme }) {
  const transitions = Array.isArray(order.allowedTransitions)
    ? order.allowedTransitions
    : getAllowedTransitionsByState(order.state, operatorLimited);
  return (
    <article
      draggable={!isUpdating}
      onDragStart={(event) => onDragStart(event, order)}
      onClick={() => onOpen(order.id)}
      title={t('order_kanban_open_details')}
      style={{
        background: theme.cardBackground,
        border: `1px solid ${theme.cardBorder}`,
        borderLeft: `4px solid ${STATE_COLORS[order.state] || '#94a3b8'}`,
        borderRadius: 8,
        padding: 10,
        opacity: isUpdating ? 0.65 : 1,
        cursor: isUpdating ? 'not-allowed' : 'pointer',
        color: theme.textPrimary,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <strong>#{order.shortId}</strong>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        {isCompletedState(order.state) ? (
          <span style={{ color: STATE_COLORS[order.state] || theme.textMuted, fontSize: 12, fontWeight: 700 }}>
            {toDisplayState(order.state, t)}
          </span>
        ) : null}
        {order.paid ? (
          <span style={{ color: '#047857', fontSize: 12, fontWeight: 600 }}>{t('order_kanban_paid')}</span>
        ) : null}
        </div>
      </div>

      <div style={{ marginTop: 6, fontWeight: 600 }}>{order.customerName || t('order_kanban_guest')}</div>
      <div style={{ fontSize: 12, color: theme.textMuted }}>{order.customerPhone || t('order_kanban_no_phone')}</div>

      <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: theme.textSecondary }}>
        <span>{t('order_kanban_total')}: {formatTotal(order.total, language)}</span>
        <span>{t('order_kanban_items')}: {order.dishesCount}</span>
      </div>

      {order.rmsOrderNumber ? (
        <div style={{ marginTop: 4, fontSize: 12, color: theme.textSecondary }}>
          RMS: {order.rmsOrderNumber}
        </div>
      ) : null}

      {order.comment ? (
        <div style={{ marginTop: 8, fontSize: 12, color: theme.textMuted, whiteSpace: 'pre-wrap' }}>{order.comment}</div>
      ) : null}

      <div style={{ marginTop: 8, fontSize: 11, color: theme.textMuted }}>
        {t('order_kanban_updated')}: {formatDateTime(order.updatedAt, language)}
      </div>

      <select
        key={`${order.id}-${order.state}`}
        defaultValue=""
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onChange={(event) => {
          const nextState = event.target.value;
          if (!nextState) return;
          onMove(order.id, nextState);
          event.target.value = '';
        }}
        disabled={isUpdating || transitions.length === 0}
        style={{
          marginTop: 8,
          width: '100%',
          background: theme.controlBackground,
          border: `1px solid ${theme.controlBorder}`,
          borderRadius: 6,
          padding: '6px 8px',
          fontSize: 12,
          color: theme.controlText,
        }}
      >
        <option value="">{t('order_kanban_move_to')}</option>
        {transitions.map((state) => (
          <option key={state} value={state}>{toDisplayState(state, t)}</option>
        ))}
      </select>
    </article>
  );
}

function OrderKanbanContent() {
  const { t, language, setLanguage } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [operatorLimited, setOperatorLimited] = useState(false);
  const [query, setQuery] = useState('');
  const [newWindowMinutes, setNewWindowMinutes] = useState(() => {
    if (typeof window === 'undefined') return NEW_WINDOW_MINUTES_DEFAULT;
    return clampNewWindowMinutes(localStorage.getItem(NEW_WINDOW_STORAGE_KEY));
  });
  const [completedWindowHours, setCompletedWindowHours] = useState(() => {
    if (typeof window === 'undefined') return COMPLETED_WINDOW_HOURS_DEFAULT;
    return clampCompletedWindowHours(localStorage.getItem(COMPLETED_WINDOW_STORAGE_KEY));
  });
  const [appearance, setAppearance] = useState(getPreferredAppearance);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState('');
  const [dragOrderId, setDragOrderId] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [collapsedColumns, setCollapsedColumns] = useState(getInitialCollapsedColumns);
  const [streamStatus, setStreamStatus] = useState('connecting');
  const [error, setError] = useState('');
  const eventSourceRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const eventRefreshTimerRef = useRef(null);
  const streamWatchdogTimerRef = useRef(null);
  const loadAbortControllerRef = useRef(null);
  const loadRequestIdRef = useRef(0);
  const mountedRef = useRef(false);
  const lastStreamSignalAtRef = useRef(Date.now());
  const isDarkTheme = useMemo(() => isDarkAppearance(appearance), [appearance]);
  const theme = useMemo(() => (isDarkTheme ? KANBAN_THEME.dark : KANBAN_THEME.light), [isDarkTheme]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(COMPLETED_WINDOW_STORAGE_KEY, String(completedWindowHours));
  }, [completedWindowHours]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(NEW_WINDOW_STORAGE_KEY, String(newWindowMinutes));
  }, [newWindowMinutes]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(COLLAPSED_COLUMNS_STORAGE_KEY, JSON.stringify(Array.from(collapsedColumns)));
  }, [collapsedColumns]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const syncAppearance = () => {
      setAppearance(getPreferredAppearance());
    };

    const media = typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : null;

    syncAppearance();
    window.addEventListener('appearanceChanged', syncAppearance);
    window.addEventListener('storage', syncAppearance);
    media?.addEventListener('change', syncAppearance);

    return () => {
      window.removeEventListener('appearanceChanged', syncAppearance);
      window.removeEventListener('storage', syncAppearance);
      media?.removeEventListener('change', syncAppearance);
    };
  }, []);

  const toggleAppearance = useCallback(() => {
    const next = isDarkTheme ? 'light' : 'dark';
    applyAppearance(next);
    setAppearance(next);
  }, [isDarkTheme]);

  const closeEventSource = useCallback(() => {
    if (eventSourceRef.current) {
      try {
        eventSourceRef.current.close();
      } catch {
        // ignore
      }
      eventSourceRef.current = null;
    }
  }, []);

  const loadOrders = useCallback(async ({ showLoader = false } = {}) => {
    if (!mountedRef.current) return;
    const requestId = ++loadRequestIdRef.current;

    if (loadAbortControllerRef.current) {
      try {
        loadAbortControllerRef.current.abort();
      } catch {
        // ignore
      }
    }
    const abortController = new AbortController();
    loadAbortControllerRef.current = abortController;

    try {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      const base = getBaseAdminPath();
      const endpoint = `${base}/core/order-kanban/orders?limit=300&includeDone=1&newMinutes=${newWindowMinutes}&completedHours=${completedWindowHours}`;
      const response = await fetch(endpoint, { credentials: 'same-origin', signal: abortController.signal });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.error || `HTTP ${response.status}`);
      }

      if (!mountedRef.current || requestId !== loadRequestIdRef.current) return;

      const nextOperatorLimited = Boolean(json?.meta?.operatorLimited);
      const mapped = Array.isArray(json.results)
        ? json.results.map((item) => normalizeOrder(item, nextOperatorLimited)).filter(Boolean)
        : [];
      setOrders(mapped);
      setOperatorLimited(nextOperatorLimited);
      const minutesFromMeta = Number.parseInt(String(json?.meta?.newWindowMinutes || NEW_WINDOW_MINUTES_DEFAULT), 10);
      const hoursFromMeta = Number.parseInt(String(json?.meta?.completedWindowHours || COMPLETED_WINDOW_HOURS_DEFAULT), 10);
      setNewWindowMinutes(clampNewWindowMinutes(minutesFromMeta));
      setCompletedWindowHours(clampCompletedWindowHours(hoursFromMeta));
      setError('');
    } catch (loadError) {
      if (loadError?.name === 'AbortError') return;
      if (!mountedRef.current || requestId !== loadRequestIdRef.current) return;
      setError(loadError?.message || String(loadError));
    } finally {
      if (loadAbortControllerRef.current === abortController) {
        loadAbortControllerRef.current = null;
      }
      if (!mountedRef.current || requestId !== loadRequestIdRef.current) return;
      setLoading(false);
      setRefreshing(false);
    }
  }, [completedWindowHours, newWindowMinutes]);

  const applyOrderHintFromStream = useCallback((payload) => {
    const orderId = payload?.orderId;
    const nextState = payload?.state;
    if (!orderId || !nextState) return;

    setOrders((prev) => prev.map((item) => (
      item.id === orderId
        ? {
            ...item,
            state: nextState,
            updatedAt: payload?.updatedAt || item.updatedAt,
            allowedTransitions: getAllowedTransitionsByState(nextState, operatorLimited),
          }
        : item
    )));
  }, [operatorLimited]);

  const scheduleRefreshFromEvent = useCallback((delayMs = KANBAN_EVENT_REFRESH_DEBOUNCE_MS) => {
    if (eventRefreshTimerRef.current) return;
    eventRefreshTimerRef.current = window.setTimeout(() => {
      eventRefreshTimerRef.current = null;
      loadOrders({ showLoader: false });
    }, delayMs);
  }, [loadOrders]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (loadAbortControllerRef.current) {
        try {
          loadAbortControllerRef.current.abort();
        } catch {
          // ignore
        }
        loadAbortControllerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    loadOrders({ showLoader: true });
  }, [loadOrders]);

  useEffect(() => {
    const timer = setInterval(() => {
      loadOrders({ showLoader: false });
    }, KANBAN_FULL_SYNC_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [loadOrders]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (typeof window.EventSource !== 'function') {
      setStreamStatus('unsupported');
      return undefined;
    }

    let disposed = false;

    const clearReconnectTimer = () => {
      if (!reconnectTimerRef.current) return;
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    };

    const connect = () => {
      if (disposed) return;
      clearReconnectTimer();
      closeEventSource();

      setStreamStatus((prev) => (prev === 'connected' ? 'reconnecting' : 'connecting'));

      const base = getBaseAdminPath();
      const source = new window.EventSource(`${base}/core/order-kanban/stream`, { withCredentials: true });
      eventSourceRef.current = source;
      lastStreamSignalAtRef.current = Date.now();

      source.addEventListener('connected', () => {
        if (disposed) return;
        lastStreamSignalAtRef.current = Date.now();
        setStreamStatus('connected');
        scheduleRefreshFromEvent(100);
      });

      source.addEventListener('heartbeat', () => {
        lastStreamSignalAtRef.current = Date.now();
      });

      source.addEventListener('order-changed', (event) => {
        if (disposed) return;
        lastStreamSignalAtRef.current = Date.now();

        let payload = {};
        try {
          payload = JSON.parse(event?.data || '{}');
        } catch {
          payload = {};
        }

        applyOrderHintFromStream(payload);
        scheduleRefreshFromEvent();
      });

      source.onerror = () => {
        if (disposed) return;
        setStreamStatus('reconnecting');
        closeEventSource();

        if (!reconnectTimerRef.current) {
          reconnectTimerRef.current = window.setTimeout(() => {
            reconnectTimerRef.current = null;
            connect();
          }, KANBAN_STREAM_RECONNECT_DELAY_MS);
        }
      };
    };

    connect();

    streamWatchdogTimerRef.current = window.setInterval(() => {
      if (disposed) return;
      if (Date.now() - lastStreamSignalAtRef.current <= KANBAN_STREAM_STALE_TIMEOUT_MS) return;

      setStreamStatus('reconnecting');
      closeEventSource();
      connect();
    }, 30000);

    return () => {
      disposed = true;
      clearReconnectTimer();

      if (streamWatchdogTimerRef.current) {
        clearInterval(streamWatchdogTimerRef.current);
        streamWatchdogTimerRef.current = null;
      }

      if (eventRefreshTimerRef.current) {
        clearTimeout(eventRefreshTimerRef.current);
        eventRefreshTimerRef.current = null;
      }

      closeEventSource();
    };
  }, [applyOrderHintFromStream, closeEventSource, scheduleRefreshFromEvent]);

  const selectedOrder = useMemo(() => {
    return orders.find((order) => order.id === selectedOrderId) || null;
  }, [orders, selectedOrderId]);

  useEffect(() => {
    if (!selectedOrderId || selectedOrder) return;
    setSelectedOrderId('');
  }, [selectedOrderId, selectedOrder]);

  useEffect(() => {
    if (!selectedOrderId) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setSelectedOrderId('');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedOrderId]);

  async function moveOrder(orderId, nextState) {
    const currentOrder = orders.find((item) => item.id === orderId);
    if (!currentOrder || currentOrder.state === nextState) return;

    const fromState = currentOrder.state;
    setUpdatingOrderId(orderId);
    setError('');

    setOrders((prev) => prev.map((item) => (
      item.id === orderId
        ? { ...item, state: nextState, allowedTransitions: getAllowedTransitionsByState(nextState, operatorLimited) }
        : item
    )));

    try {
      const base = getBaseAdminPath();
      const csrf = getCsrfToken();
      const response = await fetch(`${base}/core/order-kanban/state`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          ...(csrf ? { 'X-XSRF-TOKEN': csrf } : {}),
        },
        body: JSON.stringify({ id: orderId, nextState }),
      });
      const json = await response.json();
      if (!response.ok || json?.success === false) {
        throw new Error(json?.error || `HTTP ${response.status}`);
      }

      if (json.order) {
        const normalized = normalizeOrder(json.order, operatorLimited);
        setOrders((prev) => prev.map((item) => item.id === orderId ? normalized : item));
      }
    } catch (updateError) {
      setOrders((prev) => prev.map((item) => (
        item.id === orderId
          ? { ...item, state: fromState, allowedTransitions: getAllowedTransitionsByState(fromState, operatorLimited) }
          : item
      )));
      setError(updateError?.message || String(updateError));
      await loadOrders({ showLoader: false });
    } finally {
      setUpdatingOrderId('');
    }
  }

  const visibleStates = [...ACTIVE_BOARD_STATES, ...FINISHED_BOARD_STATES];

  const filteredOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return orders;
    return orders.filter((order) => {
      const haystack = [
        order.id,
        order.shortId,
        order.state,
        order.customerName,
        order.customerPhone,
        order.comment,
        order.tag,
        order.rmsOrderNumber,
      ].map((item) => String(item || '').toLowerCase()).join(' ');
      return haystack.includes(normalizedQuery);
    });
  }, [orders, query]);

  const groupedOrders = useMemo(() => {
    const grouped = {};
    visibleStates.forEach((state) => {
      grouped[state] = [];
    });
    filteredOrders.forEach((order) => {
      if (!grouped[order.state]) return;
      grouped[order.state].push(order);
    });
    return grouped;
  }, [filteredOrders, visibleStates]);

  const streamStatusConfig = useMemo(() => {
    if (streamStatus === 'connected') {
      return { label: t('order_kanban_stream_connected'), color: '#065f46', background: '#d1fae5', border: '#a7f3d0' };
    }
    if (streamStatus === 'reconnecting') {
      return { label: t('order_kanban_stream_reconnecting'), color: '#92400e', background: '#fef3c7', border: '#fde68a' };
    }
    if (streamStatus === 'unsupported') {
      return { label: t('order_kanban_stream_unsupported'), color: '#7f1d1d', background: '#fee2e2', border: '#fecaca' };
    }
    return { label: t('order_kanban_stream_connecting'), color: '#1e3a8a', background: '#dbeafe', border: '#bfdbfe' };
  }, [streamStatus, t]);

  function toggleColumnCollapse(state) {
    setCollapsedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(state)) {
        next.delete(state);
      } else {
        next.add(state);
      }
      return next;
    });
  }

  function handleColumnDrop(event, targetState) {
    event.preventDefault();
    const droppedOrderId = dragOrderId || event.dataTransfer?.getData('text/plain') || '';
    setDragOrderId('');
    if (!droppedOrderId) return;

    const order = orders.find((item) => item.id === droppedOrderId);
    if (!order || order.state === targetState) return;

    const allowed = Array.isArray(order.allowedTransitions)
      ? order.allowedTransitions
      : getAllowedTransitionsByState(order.state, operatorLimited);
    if (!allowed.includes(targetState)) {
      setError(
        t('order_kanban_invalid_transition', {
          from: toDisplayState(order.state, t),
          to: toDisplayState(targetState, t),
        })
      );
      return;
    }

    moveOrder(droppedOrderId, targetState);
  }

  return (
    <div className="p-4 max-w-[1900px] mx-auto" style={{ background: theme.pageBackground, color: theme.textPrimary }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: theme.textPrimary }}>{t('order_kanban_title')}</h1>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={toggleAppearance}
            style={{
              border: `1px solid ${theme.controlBorder}`,
              background: theme.controlBackground,
              borderRadius: 6,
              padding: '6px 10px',
              color: theme.controlText,
              cursor: 'pointer',
            }}
            title={isDarkTheme ? t('order_kanban_theme_day') : t('order_kanban_theme_night')}
          >
            {isDarkTheme ? t('order_kanban_theme_day') : t('order_kanban_theme_night')}
          </button>

          <span
            style={{
              border: `1px solid ${streamStatusConfig.border}`,
              background: streamStatusConfig.background,
              color: streamStatusConfig.color,
              borderRadius: 999,
              padding: '4px 8px',
              fontSize: 12,
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            {streamStatusConfig.label}
          </span>

          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            style={{
              background: theme.controlBackground,
              border: `1px solid ${theme.controlBorder}`,
              borderRadius: 6,
              padding: '6px 8px',
              color: theme.controlText,
            }}
          >
            <option value="en">EN</option>
            <option value="ru">RU</option>
          </select>

          <button
            type="button"
            onClick={() => loadOrders({ showLoader: false })}
            disabled={refreshing || loading}
            style={{
              border: `1px solid ${theme.controlBorder}`,
              background: theme.cardBackground,
              borderRadius: 6,
              padding: '6px 10px',
              color: theme.textPrimary,
              cursor: refreshing || loading ? 'not-allowed' : 'pointer',
            }}
          >
            {refreshing ? t('order_kanban_refreshing') : t('order_kanban_refresh')}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('order_kanban_search_placeholder')}
          style={{
            minWidth: 260,
            flex: '1 1 320px',
            background: theme.cardBackground,
            border: `1px solid ${theme.controlBorder}`,
            borderRadius: 6,
            padding: '8px 10px',
            color: theme.textPrimary,
          }}
        />

        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: theme.textSecondary }}>
          <span>{t('order_kanban_new_range_label')}</span>
          <select
            value={newWindowMinutes}
            onChange={(event) => setNewWindowMinutes(clampNewWindowMinutes(event.target.value))}
            style={{
              background: theme.controlBackground,
              border: `1px solid ${theme.controlBorder}`,
              borderRadius: 6,
              padding: '4px 8px',
              color: theme.controlText,
            }}
          >
            {NEW_WINDOW_OPTIONS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {t('order_kanban_new_window_short', { minutes })}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: theme.textSecondary }}>
          <span>{t('order_kanban_completed_range_label')}</span>
          <select
            value={completedWindowHours}
            onChange={(event) => setCompletedWindowHours(clampCompletedWindowHours(event.target.value))}
            style={{
              background: theme.controlBackground,
              border: `1px solid ${theme.controlBorder}`,
              borderRadius: 6,
              padding: '4px 8px',
              color: theme.controlText,
            }}
          >
            {COMPLETED_WINDOW_OPTIONS.map((hours) => (
              <option key={hours} value={hours}>
                {t('order_kanban_completed_window_short', { hours })}
              </option>
            ))}
          </select>
        </label>

        <span style={{ fontSize: 13, color: theme.textMuted }}>
          {t('order_kanban_orders_count')}: {filteredOrders.length}
        </span>

        <span style={{ fontSize: 13, color: theme.textMuted }}>
          {t('order_kanban_new_window_top', { minutes: newWindowMinutes })}
        </span>

        <span style={{ fontSize: 13, color: theme.textMuted }}>
          {t('order_kanban_completed_window_top', { hours: completedWindowHours })}
        </span>
      </div>

      {error ? (
        <div
          style={{
            marginBottom: 12,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            borderRadius: 8,
            padding: '8px 10px',
            fontSize: 13,
          }}
        >
          {error}
        </div>
      ) : null}

      {loading ? (
        <div style={{ padding: 12, color: theme.textMuted }}>{t('loading')}</div>
      ) : (
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
          {visibleStates.map((state) => {
            const ordersByState = groupedOrders[state] || [];
            const collapsed = collapsedColumns.has(state);
            const isCompleted = isCompletedState(state);
            const columnTitle = toDisplayState(state, t);
            const columnColor = STATE_COLORS[state] || theme.textMuted;
            return (
              <section
                key={state}
                onDragOver={(event) => {
                  event.preventDefault();
                }}
                onDrop={(event) => handleColumnDrop(event, state)}
                style={{
                  minWidth: collapsed ? 64 : KANBAN_COLUMN_WIDTH_MIN,
                  maxWidth: collapsed ? 64 : KANBAN_COLUMN_WIDTH_MAX,
                  flex: collapsed ? '0 0 64px' : `1 0 ${KANBAN_COLUMN_WIDTH_MIN}px`,
                  background: theme.panelBackground,
                  border: `1px solid ${theme.panelBorder}`,
                  borderRadius: 10,
                  padding: collapsed ? '8px 6px' : 10,
                }}
              >
                <header
                  style={{
                    display: 'flex',
                    flexDirection: collapsed ? 'column' : 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: collapsed ? 8 : 6,
                    marginBottom: collapsed ? 0 : 10,
                    minHeight: collapsed ? 220 : 'auto',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: collapsed ? 'column' : 'column',
                      alignItems: collapsed ? 'center' : 'flex-start',
                      gap: 4,
                      flex: collapsed ? undefined : 1,
                    }}
                  >
                    <strong
                      style={{
                        color: columnColor,
                        writingMode: collapsed ? 'vertical-rl' : 'horizontal-tb',
                        textOrientation: collapsed ? 'mixed' : 'upright',
                        transform: collapsed ? 'rotate(180deg)' : 'none',
                      }}
                    >
                      {columnTitle}
                    </strong>
                    {state === 'NEW' ? (
                      <span
                        style={{
                          color: theme.textMuted,
                          fontSize: 11,
                          writingMode: collapsed ? 'vertical-rl' : 'horizontal-tb',
                          textOrientation: collapsed ? 'mixed' : 'upright',
                          transform: collapsed ? 'rotate(180deg)' : 'none',
                        }}
                      >
                        {collapsed
                          ? t('order_kanban_new_window_short', { minutes: newWindowMinutes })
                          : t('order_kanban_new_window_hint', { minutes: newWindowMinutes })}
                      </span>
                    ) : null}
                    {state === 'DONE' ? (
                      <span
                        style={{
                          color: theme.textMuted,
                          fontSize: 11,
                          writingMode: collapsed ? 'vertical-rl' : 'horizontal-tb',
                          textOrientation: collapsed ? 'mixed' : 'upright',
                          transform: collapsed ? 'rotate(180deg)' : 'none',
                        }}
                      >
                        {collapsed
                          ? t('order_kanban_completed_window_short', { hours: completedWindowHours })
                          : t('order_kanban_completed_window_hint', { hours: completedWindowHours })}
                      </span>
                    ) : null}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: collapsed ? 'column' : 'row',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        background: theme.softBadgeBackground,
                        color: theme.softBadgeText,
                        borderRadius: 999,
                        padding: '2px 8px',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {ordersByState.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleColumnCollapse(state)}
                      title={collapsed ? t('order_kanban_expand_column') : t('order_kanban_collapse_column')}
                      aria-label={collapsed ? t('order_kanban_expand_column') : t('order_kanban_collapse_column')}
                      style={{
                        border: `1px solid ${theme.controlBorder}`,
                        background: theme.cardBackground,
                        color: theme.textSecondary,
                        borderRadius: 6,
                        width: 24,
                        height: 24,
                        cursor: 'pointer',
                        lineHeight: 1,
                      }}
                    >
                      {collapsed ? '›' : '‹'}
                    </button>
                  </div>
                </header>

                {!collapsed ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 50 }}>
                  {ordersByState.length === 0 ? (
                    <div style={{ color: theme.textMuted, fontSize: 12 }}>{t('order_kanban_empty_column')}</div>
                  ) : (
                    ordersByState.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        language={language}
                        t={t}
                        isUpdating={updatingOrderId === order.id}
                        onMove={moveOrder}
                        onOpen={setSelectedOrderId}
                        operatorLimited={operatorLimited}
                        theme={theme}
                        onDragStart={(event, dragOrder) => {
                          setDragOrderId(dragOrder.id);
                          if (event.dataTransfer) {
                            event.dataTransfer.effectAllowed = 'move';
                            event.dataTransfer.setData('text/plain', dragOrder.id);
                          }
                        }}
                      />
                    ))
                  )}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      )}

      <OrderDetailsPopup
        order={selectedOrder}
        language={language}
        t={t}
        theme={theme}
        onClose={() => setSelectedOrderId('')}
      />
    </div>
  );
}

export default function OrderKanban(props) {
  return (
    <I18nProvider initialLocale={props.locale}>
      <OrderKanbanContent />
    </I18nProvider>
  );
}

if (typeof window !== 'undefined') {
  window.OrderKanban = window.OrderKanban || {};
  window.OrderKanban.Component = OrderKanban;
  window.OrderKanban.mount = (el = null) => {
    try {
      const target = el || document.getElementById('order-kanban-root') || (() => {
        const div = document.createElement('div');
        div.id = 'order-kanban-root';
        (document.querySelector('#app') || document.body).appendChild(div);
        return div;
      })();

      if (window.ReactDOM && window.ReactDOM.render) {
        window.ReactDOM.render(React.createElement(OrderKanban), target);
      } else if (window.ReactDOM && window.ReactDOM.hydrateRoot) {
        window.ReactDOM.hydrateRoot(target, React.createElement(OrderKanban));
      }
    } catch (mountError) {
      void mountError;
    }
  };
}
