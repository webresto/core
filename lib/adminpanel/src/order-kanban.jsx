import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { I18nProvider, useTranslation } from './i18n/I18nContext';

const ACTIVE_BOARD_STATES = ['CHECKOUT', 'ORDER', 'COOKING', 'ON_THE_WAY'];
const FINISHED_BOARD_STATES = ['DONE', 'REJECT'];
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
const SUPPORTED_LOCALES = new Set(['en', 'es', 'zh', 'hi', 'ar', 'ru', 'fr', 'ua']);
const BOARD_WINDOW_MINUTES_DEFAULT = 180;
const BOARD_WINDOW_MINUTES_MIN = 1;
const BOARD_WINDOW_MINUTES_MAX = 10080;
const BOARD_WINDOW_OPTIONS = [15, 30, 60, 120, 180, 360, 720, 1440, 2880, 4320, 10080];
const COMPLETED_STATES = new Set(['DONE', 'REJECT']);
const KANBAN_STREAM_RECONNECT_DELAY_MS = 5000;
const KANBAN_STREAM_STALE_TIMEOUT_MS = 90000;
const KANBAN_FULL_SYNC_INTERVAL_MS = 30000;
const KANBAN_EVENT_REFRESH_DEBOUNCE_MS = 300;
const BOARD_WINDOW_STORAGE_KEY = 'orderKanbanBoardWindowMinutes';
const COLLAPSED_COLUMNS_STORAGE_KEY = 'orderKanbanCollapsedColumnsV2';
const VIEW_MODE_STORAGE_KEY = 'orderKanbanViewMode';
const APPEARANCE_STORAGE_KEY = 'appearance';
const KANBAN_COLUMN_WIDTH_MIN = 280;
const KANBAN_COLUMN_WIDTH_MAX = 340;
const DEFAULT_EXPANDED_COLUMNS = ['ORDER', 'DONE'];
const VISIBLE_BOARD_STATES = [...ACTIVE_BOARD_STATES, ...FINISHED_BOARD_STATES];
const DEFAULT_COLLAPSED_COLUMNS = VISIBLE_BOARD_STATES
  .filter((state) => !DEFAULT_EXPANDED_COLUMNS.includes(state));
const STACK_VIEW_ROW_MIN_WIDTH = 1080;
const STACK_VIEW_GRID_TEMPLATE = 'minmax(104px, 0.9fr) minmax(160px, 1.05fr) minmax(180px, 1.25fr) minmax(120px, 0.9fr) minmax(170px, 1fr) minmax(240px, 1.65fr)';

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
    const fromDocument = normalizeLocale(document.documentElement?.lang);
    if (fromDocument) return fromDocument;
  }
  if (typeof navigator !== 'undefined') {
    const fromBrowser = normalizeLocale(navigator.language);
    if (fromBrowser) return fromBrowser;
  }
  return 'en';
}

function clampBoardWindowMinutes(value) {
  const parsed = Number.parseInt(String(value || BOARD_WINDOW_MINUTES_DEFAULT), 10);
  if (!Number.isFinite(parsed)) return BOARD_WINDOW_MINUTES_DEFAULT;
  return Math.min(Math.max(parsed, BOARD_WINDOW_MINUTES_MIN), BOARD_WINDOW_MINUTES_MAX);
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

function getInitialViewMode() {
  if (typeof window === 'undefined') return 'kanban';
  return localStorage.getItem(VIEW_MODE_STORAGE_KEY) === 'stack' ? 'stack' : 'kanban';
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
  if (!contentType.includes('application/json')) {
    const text = await response.text();
    throw new Error(
      `HTTP ${response.status}. Expected JSON, got "${contentType || 'unknown'}". ${text.slice(0, 120)}`
    );
  }

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json?.error || `HTTP ${response.status}`);
  }

  return json;
}

function getOrderModelPath(orderId) {
  return `${getBaseAdminPath()}/model/order/edit/${encodeURIComponent(String(orderId || ''))}`;
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

function parseTimestamp(value) {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getOrderClosedTimestamp(order) {
  return parseTimestamp(order?.closedAt);
}

function getOrderedAtMs(order) {
  return order?.orderedAt ? order.orderedAt * 1000 : parseTimestamp(order?.createdAt);
}

function shouldIncludeOrderByWindow(order, newSinceMs, completedSinceMs) {
  if (isCompletedState(order?.state)) {
    return getOrderClosedTimestamp(order) >= completedSinceMs;
  }
  return getOrderedAtMs(order) >= newSinceMs;
}

function formatBoardWindow(minutes, t) {
  if (minutes < 60) {
    return t('order_kanban_board_window_minutes', { minutes });
  }
  return t('order_kanban_board_window_hours', { hours: Math.round(minutes / 60) });
}

function normalizeOrder(order) {
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
    orderedAt: order.orderedAt || null,
    createdAt: order.createdAt || null,
    updatedAt: order.updatedAt || null,
    closedAt: order.closedAt || null,
    allowedTransitions: Array.isArray(order.allowedTransitions)
      ? order.allowedTransitions
      : [],
  };
}

function normalizeOrderDetails(order) {
  const base = normalizeOrder(order);
  if (!base) return null;

  const normalizeItem = (item) => {
    if (!item || typeof item !== 'object') return null;
    return {
      id: item.id || '',
      name: item.name || '-',
      amount: Number.isFinite(Number(item.amount)) ? Number(item.amount) : 0,
      comment: item.comment || '',
      addedBy: item.addedBy || '',
      itemTotal: Number.isFinite(Number(item.itemTotal)) ? Number(item.itemTotal) : 0,
      itemTotalBeforeDiscount: Number.isFinite(Number(item.itemTotalBeforeDiscount)) ? Number(item.itemTotalBeforeDiscount) : 0,
      itemPrice: Number.isFinite(Number(item.itemPrice)) ? Number(item.itemPrice) : 0,
      discountTotal: Number.isFinite(Number(item.discountTotal)) ? Number(item.discountTotal) : 0,
      discountType: item.discountType || '',
      discountAmount: Number.isFinite(Number(item.discountAmount)) ? Number(item.discountAmount) : 0,
      discountMessage: item.discountMessage || '',
      modifiers: Array.isArray(item.modifiers)
        ? item.modifiers.map((modifier) => ({
          id: modifier?.id || '',
          name: modifier?.name || '-',
          amount: Number.isFinite(Number(modifier?.amount)) ? Number(modifier.amount) : 0,
          price: Number.isFinite(Number(modifier?.price)) ? Number(modifier.price) : 0,
          total: Number.isFinite(Number(modifier?.total)) ? Number(modifier.total) : 0,
        }))
        : [],
    };
  };

  return {
    ...base,
    basketTotal: Number.isFinite(Number(order?.basketTotal)) ? Number(order.basketTotal) : 0,
    discountTotal: Number.isFinite(Number(order?.discountTotal)) ? Number(order.discountTotal) : 0,
    bonusesTotal: Number.isFinite(Number(order?.bonusesTotal)) ? Number(order.bonusesTotal) : 0,
    promotionFlatDiscount: Number.isFinite(Number(order?.promotionFlatDiscount)) ? Number(order.promotionFlatDiscount) : 0,
    deliveryCost: Number.isFinite(Number(order?.deliveryCost)) ? Number(order.deliveryCost) : 0,
    paymentMethodTitle: order?.paymentMethodTitle || '',
    promotionCodeString: order?.promotionCodeString || '',
    promotionCodeDescription: order?.promotionCodeDescription || '',
    promotionState: Array.isArray(order?.promotionState) ? order.promotionState : [],
    promotionErrors: Array.isArray(order?.promotionErrors) ? order.promotionErrors : (order?.promotionErrors ? [order.promotionErrors] : []),
    promotionUnorderable: Boolean(order?.promotionUnorderable),
    spendBonus: order?.spendBonus || null,
    date: order?.date || null,
    items: Array.isArray(order?.items) ? order.items.map(normalizeItem).filter(Boolean) : [],
    rawPayload: order?.rawPayload || order,
  };
}

function OrderDetailsPopup({ order, loading, language, t, onClose, theme }) {
  if (!order) return null;
  const boolText = (value) => value ? t('order_kanban_yes') : t('order_kanban_no');
  const orderModelPath = order?.id ? getOrderModelPath(order.id) : '';
  const rowStyle = {
    display: 'grid',
    gridTemplateColumns: '170px 1fr',
    gap: 8,
    fontSize: 13,
  };
  const items = Array.isArray(order.items) ? order.items : [];
  const promotionState = Array.isArray(order.promotionState) ? order.promotionState : [];
  const promotionErrors = Array.isArray(order.promotionErrors) ? order.promotionErrors : [];
  const rawPayload = order.rawPayload || order;
  const hasExtendedDetails = !loading && (
    Array.isArray(order.items) ||
    Boolean(order.rawPayload) ||
    Boolean(order.paymentMethodTitle) ||
    Boolean(order.promotionCodeString) ||
    Boolean(order.promotionCodeDescription) ||
    Boolean(order.basketTotal) ||
    Boolean(order.discountTotal) ||
    Boolean(order.bonusesTotal) ||
    Boolean(order.promotionFlatDiscount) ||
    Boolean(order.deliveryCost) ||
    Boolean(order.spendBonus) ||
    Boolean(order.customData)
  );

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
          width: 'min(980px, 100%)',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {orderModelPath ? (
              <a
                href={orderModelPath}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 30,
                  padding: '0 10px',
                  border: `1px solid ${theme.controlBorder}`,
                  background: theme.controlBackground,
                  color: theme.controlText,
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                Посмотреть модель
              </a>
            ) : null}
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
          </div>
        </header>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={rowStyle}><strong>{t('order_kanban_order_id')}</strong><span>{order.id || '-'}</span></div>
          <div style={rowStyle}><strong>{t('order_kanban_state')}</strong><span>{toDisplayState(order.state, t)}</span></div>
          <div style={rowStyle}><strong>{t('order_kanban_created')}</strong><span>{formatDateTime(order.orderedAt ? new Date(order.orderedAt * 1000) : order.createdAt, language)}</span></div>
          <div style={rowStyle}><strong>{t('order_kanban_updated')}</strong><span>{formatDateTime(order.updatedAt, language)}</span></div>
          <div style={rowStyle}><strong>{t('order_kanban_customer')}</strong><span>{order.customerName || t('order_kanban_guest')}</span></div>
          <div style={rowStyle}><strong>{t('order_kanban_phone')}</strong><span>{order.customerPhone || t('order_kanban_no_phone')}</span></div>
          <div style={rowStyle}><strong>{t('order_kanban_total')}</strong><span>{formatTotal(order.total, language)}</span></div>
          <div style={rowStyle}><strong>{t('order_kanban_items')}</strong><span>{order.dishesCount}</span></div>
          <div style={rowStyle}><strong>RMS</strong><span>{order.rmsOrderNumber || '-'}</span></div>
          <div style={rowStyle}><strong>{t('order_kanban_tag')}</strong><span>{order.tag || '-'}</span></div>
          <div style={rowStyle}><strong>{t('order_kanban_paid')}</strong><span>{boolText(order.paid)}</span></div>
          <div style={rowStyle}><strong>{t('order_kanban_self_service')}</strong><span>{boolText(order.selfService)}</span></div>
          {hasExtendedDetails ? (
            <>
              <div style={rowStyle}><strong>Корзина</strong><span>{formatTotal(order.basketTotal, language)}</span></div>
              <div style={rowStyle}><strong>Скидка</strong><span>{formatTotal(order.discountTotal, language)}</span></div>
              <div style={rowStyle}><strong>Промо-скидка</strong><span>{formatTotal(order.promotionFlatDiscount, language)}</span></div>
              <div style={rowStyle}><strong>Бонусы</strong><span>{formatTotal(order.bonusesTotal, language)}</span></div>
              <div style={rowStyle}><strong>Доставка</strong><span>{formatTotal(order.deliveryCost, language)}</span></div>
              <div style={rowStyle}><strong>Способ оплаты</strong><span>{order.paymentMethodTitle || '-'}</span></div>
              <div style={rowStyle}><strong>Промокод</strong><span>{order.promotionCodeString || '-'}</span></div>
              <div style={rowStyle}><strong>Описание промокода</strong><span>{order.promotionCodeDescription || '-'}</span></div>
              <div style={rowStyle}><strong>Дата заказа</strong><span>{order.date || '-'}</span></div>
              <div style={rowStyle}><strong>Промо запрещает заказ</strong><span>{boolText(order.promotionUnorderable)}</span></div>
            </>
          ) : null}

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

          {loading ? (
            <div style={{ color: theme.textMuted, fontSize: 13 }}>{t('loading')}</div>
          ) : null}

          {!loading && items.length > 0 ? (
            <div style={{ marginTop: 6 }}>
              <strong>Состав заказа</strong>
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map((item) => (
                  <div
                    key={item.id || `${item.name}-${item.amount}`}
                    style={{
                      border: `1px solid ${theme.popupCommentBorder}`,
                      background: theme.popupCommentBackground,
                      borderRadius: 8,
                      padding: 10,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                      <strong>{item.name}</strong>
                      <strong>{formatTotal(item.itemTotal, language)}</strong>
                    </div>
                    <div style={{ marginTop: 4, fontSize: 12, color: theme.textSecondary }}>
                      Кол-во: {item.amount} · Цена: {formatTotal(item.itemPrice, language)}
                    </div>
                    {item.itemTotalBeforeDiscount > item.itemTotal ? (
                      <div style={{ marginTop: 4, fontSize: 12, color: theme.textSecondary }}>
                        До скидки: {formatTotal(item.itemTotalBeforeDiscount, language)} · Скидка: {formatTotal(item.discountTotal, language)}
                      </div>
                    ) : null}
                    {item.addedBy ? (
                      <div style={{ marginTop: 4, fontSize: 12, color: theme.textMuted }}>
                        Источник: {item.addedBy}
                      </div>
                    ) : null}
                    {item.discountMessage ? (
                      <div style={{ marginTop: 4, fontSize: 12, color: theme.textMuted }}>
                        Скидка: {item.discountMessage}
                      </div>
                    ) : null}
                    {item.comment ? (
                      <div style={{ marginTop: 4, fontSize: 12, color: theme.textMuted, whiteSpace: 'pre-wrap' }}>
                        Комментарий: {item.comment}
                      </div>
                    ) : null}
                    {item.modifiers.length > 0 ? (
                      <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: theme.textSecondary }}>Модификаторы</span>
                        {item.modifiers.map((modifier) => (
                          <div key={modifier.id || modifier.name} style={{ fontSize: 12, color: theme.textMuted }}>
                            {modifier.name} · {modifier.amount} x {formatTotal(modifier.price, language)}
                            {modifier.total ? ` = ${formatTotal(modifier.total, language)}` : ''}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {!loading && order.spendBonus ? (
            <div style={{ marginTop: 6 }}>
              <strong>Бонусы</strong>
              <pre
                style={{
                  marginTop: 6,
                  border: `1px solid ${theme.popupCommentBorder}`,
                  background: theme.popupCommentBackground,
                  color: theme.textSecondary,
                  borderRadius: 8,
                  padding: 10,
                  maxHeight: 180,
                  overflow: 'auto',
                  fontSize: 12,
                  lineHeight: 1.4,
                }}
              >
                {safeJson(order.spendBonus)}
              </pre>
            </div>
          ) : null}

          {!loading && promotionState.length > 0 ? (
            <div style={{ marginTop: 6 }}>
              <strong>Состояние промо</strong>
              <pre
                style={{
                  marginTop: 6,
                  border: `1px solid ${theme.popupCommentBorder}`,
                  background: theme.popupCommentBackground,
                  color: theme.textSecondary,
                  borderRadius: 8,
                  padding: 10,
                  maxHeight: 180,
                  overflow: 'auto',
                  fontSize: 12,
                  lineHeight: 1.4,
                }}
              >
                {safeJson(promotionState)}
              </pre>
            </div>
          ) : null}

          {!loading && promotionErrors.length > 0 ? (
            <div style={{ marginTop: 6 }}>
              <strong>Ошибки промо</strong>
              <pre
                style={{
                  marginTop: 6,
                  border: `1px solid ${theme.popupCommentBorder}`,
                  background: theme.popupCommentBackground,
                  color: theme.textSecondary,
                  borderRadius: 8,
                  padding: 10,
                  maxHeight: 180,
                  overflow: 'auto',
                  fontSize: 12,
                  lineHeight: 1.4,
                }}
              >
                {safeJson(promotionErrors)}
              </pre>
            </div>
          ) : null}

          {!loading && order.customData ? (
            <div style={{ marginTop: 6 }}>
              <strong>Custom data</strong>
              <pre
                style={{
                  marginTop: 6,
                  border: `1px solid ${theme.popupCommentBorder}`,
                  background: theme.popupCommentBackground,
                  color: theme.textSecondary,
                  borderRadius: 8,
                  padding: 10,
                  maxHeight: 180,
                  overflow: 'auto',
                  fontSize: 12,
                  lineHeight: 1.4,
                }}
              >
                {safeJson(order.customData)}
              </pre>
            </div>
          ) : null}

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
              {safeJson(rawPayload)}
            </pre>
          </div>
        </div>
      </section>
    </div>
  );
}

function OrderTransitionSelect({ order, t, theme, isUpdating, onMove, compact = false }) {
  const transitions = Array.isArray(order.allowedTransitions)
    ? order.allowedTransitions
    : [];

  return (
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
        marginTop: compact ? 0 : 8,
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
  );
}

function OrderCard({ order, language, t, isUpdating, onMove, onDragStart, onOpen, theme }) {
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

      <OrderTransitionSelect
        order={order}
        t={t}
        theme={theme}
        isUpdating={isUpdating}
        onMove={onMove}
      />
    </article>
  );
}

function OrderStackRow({ order, language, t, isUpdating, onOpen, theme }) {
  const stateColor = STATE_COLORS[order.state] || theme.textMuted;

  return (
    <article
      onClick={() => onOpen(order.id)}
      title={t('order_kanban_open_details')}
      style={{
        minWidth: STACK_VIEW_ROW_MIN_WIDTH,
        display: 'grid',
        gridTemplateColumns: STACK_VIEW_GRID_TEMPLATE,
        gap: 12,
        alignItems: 'center',
        background: theme.cardBackground,
        border: `1px solid ${theme.cardBorder}`,
        borderLeft: `4px solid ${stateColor}`,
        borderRadius: 10,
        padding: '12px 14px',
        opacity: isUpdating ? 0.65 : 1,
        cursor: isUpdating ? 'not-allowed' : 'pointer',
        color: theme.textPrimary,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
        <strong style={{ fontSize: 20, lineHeight: 1 }}>#{order.shortId}</strong>
        <span style={{ fontSize: 11, color: theme.textMuted }}>{order.id || '-'}</span>
        {order.rmsOrderNumber ? (
          <span style={{ fontSize: 11, color: theme.textSecondary }}>
            RMS: {order.rmsOrderNumber}
          </span>
        ) : null}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
        <span
          style={{
            display: 'inline-flex',
            alignSelf: 'flex-start',
            alignItems: 'center',
            border: `1px solid ${stateColor}`,
            borderRadius: 999,
            padding: '4px 10px',
            fontSize: 12,
            fontWeight: 700,
            color: stateColor,
            background: theme.panelBackground,
            whiteSpace: 'nowrap',
          }}
        >
          {toDisplayState(order.state, t)}
        </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {order.paid ? (
            <span
              style={{
                background: '#dcfce7',
                color: '#166534',
                borderRadius: 999,
                padding: '2px 8px',
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {t('order_kanban_paid')}
            </span>
          ) : null}

          {order.selfService ? (
            <span
              style={{
                background: theme.softBadgeBackground,
                color: theme.softBadgeText,
                borderRadius: 999,
                padding: '2px 8px',
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {t('order_kanban_self_service')}
            </span>
          ) : null}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
        <strong>{order.customerName || t('order_kanban_guest')}</strong>
        <span style={{ fontSize: 12, color: theme.textMuted }}>
          {order.customerPhone || t('order_kanban_no_phone')}
        </span>
        {order.tag ? (
          <span style={{ fontSize: 11, color: theme.textSecondary }}>
            {t('order_kanban_tag')}: {order.tag}
          </span>
        ) : null}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
        <strong>{formatTotal(order.total, language)}</strong>
        <span style={{ fontSize: 12, color: theme.textMuted }}>
          {t('order_kanban_items')}: {order.dishesCount}
        </span>
      </div>

      <div style={{ minWidth: 0 }}>
        <strong style={{ display: 'block' }}>{formatDateTime(order.orderedAt ? new Date(order.orderedAt * 1000) : order.createdAt, language)}</strong>
        <div style={{ marginTop: 4, fontSize: 12, color: theme.textMuted }}>
          {t('order_kanban_created')}
        </div>
        {order.updatedAt ? (
          <div style={{ marginTop: 4, fontSize: 11, color: theme.textSecondary }}>
            {t('order_kanban_updated')}: {formatDateTime(order.updatedAt, language)}
          </div>
        ) : null}
      </div>

      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, color: order.comment ? theme.textSecondary : theme.textMuted, whiteSpace: 'pre-wrap' }}>
          {order.comment || t('order_kanban_no_comment')}
        </div>
      </div>
    </article>
  );
}

function OrderStackView({
  groupedOrders,
  visibleStates,
  orders,
  language,
  t,
  theme,
  updatingOrderId,
  onOpen,
}) {
  const summaryStates = visibleStates;
  const [selectedStates, setSelectedStates] = useState(new Set());

  function toggleStateFilter(state) {
    setSelectedStates((prev) => {
      const next = new Set(prev);
      if (next.has(state)) {
        next.delete(state);
      } else {
        next.add(state);
      }
      return next;
    });
  }

  const displayedOrders = selectedStates.size === 0
    ? orders
    : orders.filter((o) => selectedStates.has(o.state));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(128px, 1fr))',
          gap: 8,
        }}
      >
        {summaryStates.map((state) => {
          const count = (groupedOrders[state] || []).length;
          const stateColor = STATE_COLORS[state] || theme.textMuted;
          const isActive = selectedStates.has(state);
          return (
            <div
              key={state}
              onClick={() => toggleStateFilter(state)}
              style={{
                background: isActive ? stateColor : theme.panelBackground,
                border: `2px solid ${isActive ? stateColor : theme.panelBorder}`,
                borderTop: isActive ? `2px solid ${stateColor}` : `3px solid ${stateColor}`,
                borderRadius: 10,
                padding: '10px 12px',
                cursor: 'pointer',
                userSelect: 'none',
                boxShadow: isActive ? `0 2px 8px ${stateColor}55` : 'none',
                transition: 'background 0.15s, border-color 0.15s, box-shadow 0.15s',
              }}
            >
              <div style={{ fontSize: 12, color: isActive ? 'rgba(255,255,255,0.8)' : theme.textMuted }}>{toDisplayState(state, t)}</div>
              <div style={{ marginTop: 4, fontSize: 22, fontWeight: 700, color: isActive ? '#fff' : theme.textPrimary }}>{count}</div>
            </div>
          );
        })}
      </div>

      {displayedOrders.length === 0 ? (
        <div
          style={{
            background: theme.panelBackground,
            border: `1px solid ${theme.panelBorder}`,
            borderRadius: 10,
            padding: 16,
            color: theme.textMuted,
          }}
        >
          {t('order_kanban_empty_column')}
        </div>
      ) : (
        <section
          style={{
            background: theme.panelBackground,
            border: `1px solid ${theme.panelBorder}`,
            borderRadius: 10,
            padding: 12,
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <div
              style={{
                minWidth: STACK_VIEW_ROW_MIN_WIDTH,
                display: 'grid',
                gridTemplateColumns: STACK_VIEW_GRID_TEMPLATE,
                gap: 12,
                padding: '0 14px 8px',
                color: theme.textMuted,
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
              }}
            >
              <span>{t('order_kanban_order_id')}</span>
              <span>{t('order_kanban_state')}</span>
              <span>{t('order_kanban_customer')}</span>
              <span>{t('order_kanban_total')}</span>
              <span>{t('order_kanban_created')}</span>
              <span>{t('order_kanban_comment')}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {displayedOrders.map((order) => (
                <OrderStackRow
                  key={order.id}
                  order={order}
                  language={language}
                  t={t}
                  isUpdating={updatingOrderId === order.id}
                  onOpen={onOpen}
                  theme={theme}
                />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function OrderKanbanContent() {
  const { t, language } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [query, setQuery] = useState('');
  const [boardWindowMinutes, setBoardWindowMinutes] = useState(() => {
    if (typeof window === 'undefined') return BOARD_WINDOW_MINUTES_DEFAULT;
    return clampBoardWindowMinutes(localStorage.getItem(BOARD_WINDOW_STORAGE_KEY));
  });
  const [viewMode, setViewMode] = useState(getInitialViewMode);
  const [appearance, setAppearance] = useState(getPreferredAppearance);
  const [loading, setLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState('');
  const [dragOrderId, setDragOrderId] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [selectedOrderLoading, setSelectedOrderLoading] = useState(false);
  const [collapsedColumns, setCollapsedColumns] = useState(getInitialCollapsedColumns);
  const [streamStatus, setStreamStatus] = useState('connecting');
  const [error, setError] = useState('');
  const eventSourceRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const eventRefreshTimerRef = useRef(null);
  const streamWatchdogTimerRef = useRef(null);
  const loadAbortControllerRef = useRef(null);
  const detailsAbortControllerRef = useRef(null);
  const loadRequestIdRef = useRef(0);
  const detailsRequestIdRef = useRef(0);
  const mountedRef = useRef(false);
  const lastStreamSignalAtRef = useRef(Date.now());
  const isDarkTheme = useMemo(() => isDarkAppearance(appearance), [appearance]);
  const theme = useMemo(() => (isDarkTheme ? KANBAN_THEME.dark : KANBAN_THEME.light), [isDarkTheme]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(BOARD_WINDOW_STORAGE_KEY, String(boardWindowMinutes));
  }, [boardWindowMinutes]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(COLLAPSED_COLUMNS_STORAGE_KEY, JSON.stringify(Array.from(collapsedColumns)));
  }, [collapsedColumns]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
  }, [viewMode]);

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
      }
      const base = getBaseAdminPath();
      const endpoint = `${base}/core/order-kanban/orders?limit=300&includeDone=1&newMinutes=${boardWindowMinutes}`;
      const json = await fetchJsonNoCache(endpoint, { signal: abortController.signal });

      if (!mountedRef.current || requestId !== loadRequestIdRef.current) return;

      const mapped = Array.isArray(json.results)
        ? json.results.map((item) => normalizeOrder(item)).filter(Boolean)
        : [];
      setOrders(mapped);
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
    }
  }, [boardWindowMinutes]);

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
            allowedTransitions: [],
          }
        : item
    )));
  }, []);

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
      if (detailsAbortControllerRef.current) {
        try {
          detailsAbortControllerRef.current.abort();
        } catch {
          // ignore
        }
        detailsAbortControllerRef.current = null;
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

  const selectedOrderSummary = useMemo(() => {
    return orders.find((order) => order.id === selectedOrderId) || null;
  }, [orders, selectedOrderId]);

  useEffect(() => {
    if (!selectedOrderId) {
      setSelectedOrderDetails(null);
      setSelectedOrderLoading(false);
      if (detailsAbortControllerRef.current) {
        try {
          detailsAbortControllerRef.current.abort();
        } catch {
          // ignore
        }
        detailsAbortControllerRef.current = null;
      }
      return;
    }

    const requestId = ++detailsRequestIdRef.current;
    if (detailsAbortControllerRef.current) {
      try {
        detailsAbortControllerRef.current.abort();
      } catch {
        // ignore
      }
    }

    const abortController = new AbortController();
    detailsAbortControllerRef.current = abortController;
    setSelectedOrderDetails(null);
    setSelectedOrderLoading(true);

    (async () => {
      try {
        const base = getBaseAdminPath();
        const json = await fetchJsonNoCache(
          `${base}/core/order-kanban/order?id=${encodeURIComponent(selectedOrderId)}`,
          { credentials: 'same-origin', signal: abortController.signal }
        );
        if (!mountedRef.current || requestId !== detailsRequestIdRef.current) return;
        setSelectedOrderDetails(normalizeOrderDetails(json.order));
      } catch (detailsError) {
        if (detailsError?.name === 'AbortError') return;
        if (!mountedRef.current || requestId !== detailsRequestIdRef.current) return;
        setError(detailsError?.message || String(detailsError));
      } finally {
        if (detailsAbortControllerRef.current === abortController) {
          detailsAbortControllerRef.current = null;
        }
        if (!mountedRef.current || requestId !== detailsRequestIdRef.current) return;
        setSelectedOrderLoading(false);
      }
    })();
  }, [selectedOrderId]);

  const selectedOrder = useMemo(() => {
    if (selectedOrderDetails?.id === selectedOrderId) return selectedOrderDetails;
    return selectedOrderSummary;
  }, [selectedOrderDetails, selectedOrderId, selectedOrderSummary]);

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
    const fromAllowedTransitions = Array.isArray(currentOrder.allowedTransitions)
      ? currentOrder.allowedTransitions
      : [];
    setUpdatingOrderId(orderId);
    setError('');

    setOrders((prev) => prev.map((item) => (
      item.id === orderId
        ? { ...item, state: nextState, allowedTransitions: [] }
        : item
    )));

    try {
      const base = getBaseAdminPath();
      const csrf = getCsrfToken();
      const json = await fetchJsonNoCache(`${base}/core/order-kanban/state`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          ...(csrf ? { 'X-XSRF-TOKEN': csrf } : {}),
        },
        body: JSON.stringify({ id: orderId, nextState }),
      });
      if (json?.success === false) {
        throw new Error(json?.error || 'State update failed');
      }

      if (json.order) {
        const normalized = normalizeOrder(json.order);
        setOrders((prev) => prev.map((item) => item.id === orderId ? normalized : item));
      }
    } catch (updateError) {
      setOrders((prev) => prev.map((item) => (
        item.id === orderId
          ? { ...item, state: fromState, allowedTransitions: fromAllowedTransitions }
          : item
      )));
      setError(updateError?.message || String(updateError));
      await loadOrders({ showLoader: false });
    } finally {
      setUpdatingOrderId('');
    }
  }

  const filteredOrders = useMemo(() => {
    const newSinceMs = Date.now() - boardWindowMinutes * 60 * 1000;
    const normalizedQuery = query.trim().toLowerCase();
    return orders.filter((order) => {
      if (!shouldIncludeOrderByWindow(order, newSinceMs, newSinceMs)) return false;
      if (!normalizedQuery) return true;

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
  }, [boardWindowMinutes, orders, query]);

  const groupedOrders = useMemo(() => {
    const grouped = {};
    VISIBLE_BOARD_STATES.forEach((state) => {
      grouped[state] = [];
    });
    filteredOrders.forEach((order) => {
      if (!grouped[order.state]) return;
      grouped[order.state].push(order);
    });
    return grouped;
  }, [filteredOrders]);

  const stackOrders = useMemo(() => {
    return [...filteredOrders].sort((left, right) => {
      const createdDiff = getOrderedAtMs(right) - getOrderedAtMs(left);
      if (createdDiff !== 0) return createdDiff;
      return parseTimestamp(right?.updatedAt) - parseTimestamp(left?.updatedAt);
    });
  }, [filteredOrders]);

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
      : [];
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
          <span>{t('order_kanban_board_range_label')}</span>
          <select
            value={boardWindowMinutes}
            onChange={(event) => setBoardWindowMinutes(clampBoardWindowMinutes(event.target.value))}
            style={{
              background: theme.controlBackground,
              border: `1px solid ${theme.controlBorder}`,
              borderRadius: 6,
              padding: '4px 8px',
              color: theme.controlText,
            }}
          >
            {BOARD_WINDOW_OPTIONS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {formatBoardWindow(minutes, t)}
              </option>
            ))}
          </select>
        </label>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: 2,
            borderRadius: 8,
            background: theme.panelBackground,
            border: `1px solid ${theme.panelBorder}`,
          }}
        >
          {[
            { key: 'kanban', icon: '⊞', label: t('view_grid') },
            { key: 'stack', icon: '☰', label: t('view_list') },
          ].map((mode) => {
            const active = viewMode === mode.key;
            return (
              <button
                key={mode.key}
                type="button"
                onClick={() => setViewMode(mode.key)}
                title={mode.label}
                aria-label={mode.label}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  border: 'none',
                  borderRadius: 6,
                  padding: '6px 10px',
                  background: active ? theme.cardBackground : 'transparent',
                  color: active ? theme.textPrimary : theme.textMuted,
                  boxShadow: active ? `inset 0 0 0 1px ${theme.controlBorder}` : 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                }}
              >
                <span aria-hidden="true">{mode.icon}</span>
                <span>{mode.label}</span>
              </button>
            );
          })}
        </div>

        <span style={{ fontSize: 13, color: theme.textMuted }}>
          {t('order_kanban_orders_count')}: {filteredOrders.length}
        </span>

        <span style={{ fontSize: 13, color: theme.textMuted }}>
          {t('order_kanban_board_window_top', { value: formatBoardWindow(boardWindowMinutes, t) })}
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
      ) : viewMode === 'stack' ? (
        <OrderStackView
          groupedOrders={groupedOrders}
          visibleStates={VISIBLE_BOARD_STATES}
          orders={stackOrders}
          language={language}
          t={t}
          theme={theme}
          updatingOrderId={updatingOrderId}
          onOpen={setSelectedOrderId}
        />
      ) : (
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
          {VISIBLE_BOARD_STATES.map((state) => {
            const ordersByState = groupedOrders[state] || [];
            const collapsed = collapsedColumns.has(state);
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
        loading={selectedOrderLoading}
        language={language}
        t={t}
        theme={theme}
        onClose={() => setSelectedOrderId('')}
      />
    </div>
  );
}

export default function OrderKanban(props) {
  const initialLocale = resolveSystemLocale(props?.locale);
  return (
    <I18nProvider initialLocale={initialLocale}>
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
