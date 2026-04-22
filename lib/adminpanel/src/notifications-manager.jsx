import React, { useEffect, useMemo, useState } from 'react';
import { I18nProvider, useTranslation } from './i18n/I18nContext';

const APPEARANCE_STORAGE_KEY = 'appearance';

const NM_THEME = {
  light: {
    pageBackground: 'transparent',
    textPrimary: '#0f172a',
    textSecondary: '#334155',
    textMuted: '#64748b',
    panelBackground: '#ffffff',
    panelBorder: '#e2e8f0',
    rowBackground: '#ffffff',
    rowBackgroundSelected: '#eff6ff',
    rowBorder: '#f1f5f9',
    headerBackground: '#f8fafc',
    headerText: '#475569',
    controlBackground: '#ffffff',
    controlBackgroundDisabled: '#f8fafc',
    controlBorder: '#cbd5e1',
    controlText: '#0f172a',
    errorBackground: '#fef2f2',
    errorBorder: '#fecaca',
    errorText: '#b91c1c',
    logBackground: '#f8fafc',
    logBorder: '#e2e8f0',
    logDataBackground: '#ffffff',
    codeBackground: '#0f172a',
    codeText: '#e2e8f0',
    rawBackground: '#f8fafc',
    linkColor: '#2563eb',
    buttonPrimary: '#2563eb',
    buttonPrimaryText: '#ffffff',
    buttonPrimaryBorder: '#2563eb',
    successText: '#15803d',
    dangerText: '#b91c1c',
  },
  dark: {
    pageBackground: 'transparent',
    textPrimary: '#e2e8f0',
    textSecondary: '#cbd5e1',
    textMuted: '#94a3b8',
    panelBackground: '#0f172a',
    panelBorder: '#1e293b',
    rowBackground: '#111827',
    rowBackgroundSelected: '#1e3a5f',
    rowBorder: '#1e293b',
    headerBackground: '#0f172a',
    headerText: '#94a3b8',
    controlBackground: '#1e293b',
    controlBackgroundDisabled: '#111827',
    controlBorder: '#334155',
    controlText: '#e2e8f0',
    errorBackground: '#2d0a0a',
    errorBorder: '#7f1d1d',
    errorText: '#fca5a5',
    logBackground: '#111827',
    logBorder: '#1e293b',
    logDataBackground: '#0f172a',
    codeBackground: '#020617',
    codeText: '#e2e8f0',
    rawBackground: '#111827',
    linkColor: '#60a5fa',
    buttonPrimary: '#1d4ed8',
    buttonPrimaryText: '#ffffff',
    buttonPrimaryBorder: '#1d4ed8',
    successText: '#4ade80',
    dangerText: '#f87171',
  },
};

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
  if (typeof window !== 'undefined' && typeof window.routePrefix === 'string' && window.routePrefix.trim()) {
    return window.routePrefix.replace(/\/$/, '');
  }

  const pathname = window.location.pathname || '';
  const normalized = pathname.replace(/\/+$/, '');
  return normalized.replace(/\/[^/]*$/, '');
}

function formatDateTime(value, language) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat(language, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function safeJson(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

async function notificationsApi(path, options = {}) {
  const axios = window.axios;
  if (!axios) {
    throw new Error('window.axios is not available');
  }

  try {
    const response = await axios({
      url: `${getBaseAdminPath()}${path}`,
      method: options.method || 'GET',
      data: options.body ? JSON.parse(options.body) : undefined,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      withCredentials: true,
    });

    return {
      ok: true,
      status: response.status,
      payload: response.data,
    };
  } catch (error) {
    return {
      ok: false,
      status: error?.response?.status || 500,
      payload: error?.response?.data || { error: error?.message || 'Request failed' },
    };
  }
}

function statusLabel(status, t) {
  const statusKey = String(status || '').toLowerCase();
  const statusMap = {
    pending: 'Pending',
    sent: 'Sent',
    failed: 'Failed',
    read: 'Read',
  };
  const key = statusMap[statusKey] || status || '—';
  const translated = t(key);
  return translated === key ? (status || '—') : translated;
}

function groupLabel(groupTo, t) {
  const groupKey = String(groupTo || '').toLowerCase();
  const groupMap = {
    user: 'User',
    manager: 'Manager',
  };
  const key = groupMap[groupKey] || groupTo || '—';
  const translated = t(key);
  return translated === key ? (groupTo || '—') : translated;
}

function badgeLabel(badge, t) {
  const badgeKey = String(badge || '').toLowerCase();
  const badgeMap = {
    info: 'Info',
    error: 'Error',
  };
  const key = badgeMap[badgeKey] || badge || '—';
  const translated = t(key);
  return translated === key ? (badge || '—') : translated;
}

function formatUserOption(user) {
  if (!user) return '';
  const parts = [];
  if (user.name) parts.push(user.name);
  if (user.phone) parts.push(user.phone);
  if (user.email) parts.push(user.email);
  if (user.login) parts.push(`@${user.login}`);
  return parts.join(' · ');
}

function getCurrentViewMode() {
  const pathname = (window.location.pathname || '').replace(/\/+$/, '');
  if (pathname.endsWith('/notification-channels')) return 'channels';
  return 'notifications';
}

function NotificationsManagerContent() {
  const { language, t } = useTranslation();
  const viewMode = getCurrentViewMode();
  const isChannelsView = viewMode === 'channels';
  const [appearance, setAppearance] = useState(getPreferredAppearance);
  const isDarkTheme = useMemo(() => isDarkAppearance(appearance), [appearance]);
  const theme = useMemo(() => (isDarkTheme ? NM_THEME.dark : NM_THEME.light), [isDarkTheme]);
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [channels, setChannels] = useState([]);
  const [createGroupTo, setCreateGroupTo] = useState('manager');
  const [createUserQuery, setCreateUserQuery] = useState('');
  const [userOptions, setUserOptions] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserAutocomplete, setShowUserAutocomplete] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createBody, setCreateBody] = useState('');
  const [createBadge, setCreateBadge] = useState('info');
  const [createPayload, setCreatePayload] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [groupTo, setGroupTo] = useState('');
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [error, setError] = useState('');

  const loadItems = async () => {
    setLoadingList(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('q', search.trim());
      if (status) params.set('status', status);
      if (groupTo) params.set('groupTo', groupTo);
      params.set('limit', '150');

      const response = await notificationsApi(`/core/notifications-manager/notifications?${params.toString()}`);
      const payload = response.payload;
      if (!response.ok) throw new Error(payload?.error || 'Failed to load notifications');
      setItems(Array.isArray(payload?.results) ? payload.results : []);
    } catch (loadError) {
      setError(String(loadError?.message || loadError));
    } finally {
      setLoadingList(false);
    }
  };

  const loadNotification = async (id) => {
    if (!id) {
      setSelectedNotification(null);
      return;
    }

    setLoadingDetails(true);
    setError('');
    try {
      const response = await notificationsApi(`/core/notifications-manager/notification?id=${encodeURIComponent(id)}`);
      const payload = response.payload;
      if (!response.ok) throw new Error(payload?.error || 'Failed to load notification');
      setSelectedNotification(payload?.notification || null);
    } catch (loadError) {
      setError(String(loadError?.message || loadError));
    } finally {
      setLoadingDetails(false);
    }
  };

  const loadChannels = async () => {
    setLoadingChannels(true);
    setError('');
    try {
      const response = await notificationsApi('/core/notifications-manager/channels');
      const payload = response.payload;
      if (!response.ok) throw new Error(payload?.error || 'Failed to load channels');
      setChannels(Array.isArray(payload?.results) ? payload.results : []);
    } catch (loadError) {
      setError(String(loadError?.message || loadError));
    } finally {
      setLoadingChannels(false);
    }
  };

  const searchUsers = async (query) => {
    const normalized = String(query || '').trim();
    if (normalized.length < 2) {
      setUserOptions([]);
      return;
    }

    try {
      const response = await notificationsApi(`/core/notifications-manager/users?q=${encodeURIComponent(normalized)}`);
      const payload = response.payload;
      if (!response.ok) throw new Error(payload?.error || 'Failed to load users');
      setUserOptions(Array.isArray(payload?.results) ? payload.results : []);
    } catch (loadError) {
      setError(String(loadError?.message || loadError));
    }
  };

  useEffect(() => {
    if (!isChannelsView) {
      loadItems();
    }
    loadChannels();
    if (isChannelsView) return undefined;

    const timer = window.setInterval(loadItems, 30000);
    return () => window.clearInterval(timer);
  }, [isChannelsView]);

  useEffect(() => {
    if (isChannelsView) return undefined;
    const timer = window.setTimeout(() => {
      loadItems();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search, status, groupTo, isChannelsView]);

  useEffect(() => {
    if (isChannelsView) return;
    if (!selectedId) {
      setSelectedNotification(null);
      return;
    }
    loadNotification(selectedId);
  }, [selectedId, isChannelsView]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (createGroupTo === 'user') {
        searchUsers(createUserQuery);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [createUserQuery, createGroupTo]);

  useEffect(() => {
    if (!selectedId || selectedNotification?.id === selectedId) return;
    if (!items.some((item) => item.id === selectedId)) {
      setSelectedId('');
    }
  }, [items, selectedId, selectedNotification]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const sync = () => setAppearance(getPreferredAppearance());
    const media = typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : null;
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

  const selectedSummary = useMemo(
    () => items.find((item) => item.id === selectedId) || null,
    [items, selectedId]
  );

  const performAction = async (path, id) => {
    setActionLoading(id);
    setError('');
    try {
      const response = await notificationsApi(path, {
        method: 'POST',
        body: JSON.stringify({ id }),
      });
      const payload = response.payload;
      if (!response.ok) throw new Error(payload?.error || 'Request failed');
      await loadItems();
      await loadNotification(id);
    } catch (actionError) {
      setError(t('Action failed: {error}', {
        error: String(actionError?.message || actionError),
      }));
    } finally {
      setActionLoading('');
    }
  };

  const submitCreate = async () => {
    setError('');

    if (createGroupTo === 'user' && !selectedUser?.id) {
      setError(t('Choose a user for user-targeted notification'));
      return;
    }

    let parsedPayload = null;
    if (createPayload.trim()) {
      try {
        parsedPayload = JSON.parse(createPayload);
      } catch {
        setError(t('Payload must be a valid JSON object'));
        return;
      }

      if (parsedPayload === null || Array.isArray(parsedPayload) || typeof parsedPayload !== 'object') {
        setError(t('Payload must be a valid JSON object'));
        return;
      }
    }

    setCreateLoading(true);
    try {
      const response = await notificationsApi('/core/notifications-manager/create', {
        method: 'POST',
        body: JSON.stringify({
          groupTo: createGroupTo,
          userId: createGroupTo === 'user' ? selectedUser?.id : null,
          title: createTitle,
          body: createBody,
          badge: createBadge,
          data: parsedPayload,
        }),
      });
      const payload = response.payload;
      if (!response.ok) throw new Error(payload?.error || 'Failed to create notification');

      setCreateTitle('');
      setCreateBody('');
      setCreateBadge('info');
      setCreatePayload('');
      setCreateUserQuery('');
      setSelectedUser(null);
      setUserOptions([]);
      await loadItems();
    } catch (createError) {
      setError(String(createError?.message || createError));
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, color: theme.textPrimary }}>
      {!isChannelsView ? (
      <section style={{ border: `1px solid ${theme.panelBorder}`, borderRadius: 14, background: theme.panelBackground, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 20, color: theme.textPrimary }}>{t('Create notification')}</h2>

        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'minmax(160px, 0.7fr) minmax(220px, 1fr) minmax(160px, 0.7fr)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ color: theme.textSecondary }}>{t('Target')}</label>
            <select value={createGroupTo} onChange={(event) => {
              const nextValue = event.target.value;
              setCreateGroupTo(nextValue);
              if (nextValue !== 'user') {
                setSelectedUser(null);
                setCreateUserQuery('');
                setUserOptions([]);
                setShowUserAutocomplete(false);
              }
            }} style={{ padding: '10px 12px', borderRadius: 10, border: `1px solid ${theme.controlBorder}`, background: theme.controlBackground, color: theme.controlText }}>
              <option value="manager">{t('Manager')}</option>
              <option value="user">{t('User')}</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ color: theme.textSecondary }}>{t('Search user by login, phone, email')}</label>
            <div style={{ position: 'relative' }}>
              <input
                value={createUserQuery}
                onFocus={() => {
                  if (createGroupTo === 'user') setShowUserAutocomplete(true);
                }}
                onChange={(event) => {
                  setCreateUserQuery(event.target.value);
                  setSelectedUser(null);
                  setShowUserAutocomplete(true);
                }}
                onBlur={() => {
                  window.setTimeout(() => setShowUserAutocomplete(false), 150);
                }}
                disabled={createGroupTo !== 'user'}
                placeholder={t('Search user by login, phone, email')}
                style={{ padding: '10px 12px', borderRadius: 10, border: `1px solid ${theme.controlBorder}`, background: createGroupTo === 'user' ? theme.controlBackground : theme.controlBackgroundDisabled, color: theme.controlText, width: '100%', boxSizing: 'border-box' }}
              />

              {createGroupTo === 'user' && showUserAutocomplete && createUserQuery.trim().length >= 2 ? (
                <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: theme.panelBackground, border: `1px solid ${theme.controlBorder}`, borderRadius: 12, boxShadow: '0 12px 24px rgba(15, 23, 42, 0.18)', maxHeight: 240, overflow: 'auto', zIndex: 20 }}>
                  {userOptions.length === 0 ? (
                    <div style={{ padding: '10px 12px', fontSize: 12, color: theme.textMuted }}>
                      {t('Found users')}
                    </div>
                  ) : userOptions.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onMouseDown={() => {
                        setSelectedUser(user);
                        setCreateUserQuery(formatUserOption(user));
                        setShowUserAutocomplete(false);
                      }}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', border: 'none', borderTop: `1px solid ${theme.rowBorder}`, background: theme.panelBackground, color: theme.textPrimary, cursor: 'pointer' }}
                    >
                      <div style={{ fontSize: 13, color: theme.textPrimary }}>{user.name || user.login || user.id}</div>
                      <div style={{ fontSize: 12, color: theme.textMuted }}>{formatUserOption(user)}</div>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ color: theme.textSecondary }}>{t('Select user')}</label>
            <div style={{ padding: '10px 12px', borderRadius: 10, border: `1px solid ${theme.controlBorder}`, background: theme.controlBackgroundDisabled, minHeight: 22, color: selectedUser ? theme.textPrimary : theme.textMuted }}>
              {selectedUser ? formatUserOption(selectedUser) : t('Found users')}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'minmax(220px, 1fr) minmax(160px, 0.5fr)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ color: theme.textSecondary }}>{t('Title')}</label>
            <input value={createTitle} onChange={(event) => setCreateTitle(event.target.value)} style={{ padding: '10px 12px', borderRadius: 10, border: `1px solid ${theme.controlBorder}`, background: theme.controlBackground, color: theme.controlText }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ color: theme.textSecondary }}>{t('Badge')}</label>
            <select value={createBadge} onChange={(event) => setCreateBadge(event.target.value)} style={{ padding: '10px 12px', borderRadius: 10, border: `1px solid ${theme.controlBorder}`, background: theme.controlBackground, color: theme.controlText }}>
              <option value="info">{badgeLabel('info', t)}</option>
              <option value="error">{badgeLabel('error', t)}</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ color: theme.textSecondary }}>{t('Body')}</label>
          <textarea value={createBody} onChange={(event) => setCreateBody(event.target.value)} rows={4} style={{ padding: '10px 12px', borderRadius: 10, border: `1px solid ${theme.controlBorder}`, background: theme.controlBackground, color: theme.controlText, resize: 'vertical' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ color: theme.textSecondary }}>{t('Payload JSON')}</label>
          <textarea value={createPayload} onChange={(event) => setCreatePayload(event.target.value)} rows={5} placeholder={t('Optional JSON object')} style={{ padding: '10px 12px', borderRadius: 10, border: `1px solid ${theme.controlBorder}`, background: theme.controlBackground, color: theme.controlText, resize: 'vertical', fontFamily: 'monospace' }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={submitCreate}
            disabled={createLoading}
            style={{ padding: '10px 14px', borderRadius: 10, border: `1px solid ${theme.buttonPrimaryBorder}`, background: theme.buttonPrimary, color: theme.buttonPrimaryText, cursor: 'pointer' }}
          >
            {createLoading ? t('Sending...') : t('Send notification')}
          </button>
        </div>
      </section>
      ) : null}

      {isChannelsView ? (
      <section style={{ border: `1px solid ${theme.panelBorder}`, borderRadius: 14, background: theme.panelBackground, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, fontSize: 20, color: theme.textPrimary }}>{t('Notification channels')}</h2>
          <button
            type="button"
            onClick={loadChannels}
            disabled={loadingChannels}
            style={{ padding: '8px 12px', borderRadius: 10, border: `1px solid ${theme.controlBorder}`, background: theme.controlBackground, color: theme.controlText, cursor: 'pointer' }}
          >
            {t('Refresh channels')}
          </button>
        </div>

        {channels.length === 0 ? (
          <div style={{ color: theme.textMuted }}>{t('No notification channels registered')}</div>
        ) : (
          <div style={{ border: `1px solid ${theme.panelBorder}`, borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, 1fr) minmax(120px, 0.8fr) minmax(180px, 1fr) minmax(90px, 0.6fr) minmax(90px, 0.6fr) minmax(100px, 0.7fr) minmax(140px, 1fr)', gap: 12, padding: '12px 14px', background: theme.headerBackground, fontSize: 12, fontWeight: 700, color: theme.headerText }}>
              <div>Type</div>
              <div>{t('Ready')}</div>
              <div>{t('Groups')}</div>
              <div>{t('Weight')}</div>
              <div>{t('Cost')}</div>
              <div>{t('Force send')}</div>
              <div>{t('Class')}</div>
            </div>

            {channels.map((channel) => (
              <div key={channel.type} style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, 1fr) minmax(120px, 0.8fr) minmax(180px, 1fr) minmax(90px, 0.6fr) minmax(90px, 0.6fr) minmax(100px, 0.7fr) minmax(140px, 1fr)', gap: 12, padding: '12px 14px', borderTop: `1px solid ${theme.rowBorder}`, background: theme.rowBackground, alignItems: 'start' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: theme.textPrimary }}>{channel.type || '-'}</div>
                <div style={{ fontSize: 12, color: channel.ready ? theme.successText : theme.dangerText }}>
                  {String(Boolean(channel.ready))}
                  {channel.readinessError ? (
                    <div style={{ marginTop: 4, color: theme.dangerText }}>
                      {t('Readiness error')}: {channel.readinessError}
                    </div>
                  ) : null}
                </div>
                <div style={{ fontSize: 12, color: theme.textSecondary }}>{Array.isArray(channel.forGroupTo) ? channel.forGroupTo.join(', ') : '-'}</div>
                <div style={{ fontSize: 12, color: theme.textSecondary }}>{channel.sortOrder ?? '-'}</div>
                <div style={{ fontSize: 12, color: theme.textSecondary }}>{channel.cost ?? '-'}</div>
                <div style={{ fontSize: 12, color: theme.textSecondary }}>{String(Boolean(channel.forceSend))}</div>
                <div style={{ fontSize: 12, color: theme.textSecondary }}>{channel.className || '-'}</div>
              </div>
            ))}
          </div>
        )}
      </section>
      ) : null}

      {!isChannelsView ? (
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 30, fontWeight: 700, margin: 0, color: theme.textPrimary }}>{t('Notifications')}</h1>
        <button
          type="button"
          onClick={loadItems}
          disabled={loadingList}
          style={{ padding: '10px 14px', borderRadius: 10, border: `1px solid ${theme.controlBorder}`, background: theme.controlBackground, color: theme.controlText, cursor: 'pointer' }}
        >
          {loadingList ? t('Refreshing...') : t('Refresh')}
        </button>
      </div>
      ) : null}

      {!isChannelsView ? (
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'minmax(220px, 1.6fr) minmax(160px, 0.8fr) minmax(160px, 0.8fr)' }}>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('Search by ID, title, body, user, order ID')}
          style={{ padding: '10px 12px', borderRadius: 10, border: `1px solid ${theme.controlBorder}`, background: theme.controlBackground, color: theme.controlText }}
        />
        <select value={status} onChange={(event) => setStatus(event.target.value)} style={{ padding: '10px 12px', borderRadius: 10, border: `1px solid ${theme.controlBorder}`, background: theme.controlBackground, color: theme.controlText }}>
          <option value="">{t('All statuses')}</option>
          <option value="pending">{statusLabel('pending', t)}</option>
          <option value="sent">{statusLabel('sent', t)}</option>
          <option value="failed">{statusLabel('failed', t)}</option>
          <option value="read">{statusLabel('read', t)}</option>
        </select>
        <select value={groupTo} onChange={(event) => setGroupTo(event.target.value)} style={{ padding: '10px 12px', borderRadius: 10, border: `1px solid ${theme.controlBorder}`, background: theme.controlBackground, color: theme.controlText }}>
          <option value="">{t('All groups')}</option>
          <option value="user">{groupLabel('user', t)}</option>
          <option value="manager">{groupLabel('manager', t)}</option>
        </select>
      </div>
      ) : null}

      {error ? (
        <div style={{ padding: '12px 14px', borderRadius: 10, background: theme.errorBackground, color: theme.errorText, border: `1px solid ${theme.errorBorder}` }}>
          {error}
        </div>
      ) : null}

      {!isChannelsView ? (
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'minmax(420px, 1.2fr) minmax(320px, 0.9fr)', alignItems: 'start' }}>
        <div style={{ border: `1px solid ${theme.panelBorder}`, borderRadius: 14, overflow: 'hidden', background: theme.panelBackground }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.8fr 0.7fr 1fr', gap: 12, padding: '14px 16px', background: theme.headerBackground, fontSize: 12, fontWeight: 700, color: theme.headerText }}>
            <div>{t('User')}</div>
            <div>{t('Status')}</div>
            <div>{t('Group')}</div>
            <div>{t('Created')}</div>
          </div>

          <div style={{ maxHeight: '70vh', overflow: 'auto' }}>
            {items.length === 0 ? (
              <div style={{ padding: 20, color: theme.textMuted }}>{t('No notifications found')}</div>
            ) : items.map((item) => {
              const isSelected = item.id === selectedId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  style={{
                    width: '100%',
                    border: 'none',
                    borderTop: `1px solid ${theme.rowBorder}`,
                    background: isSelected ? theme.rowBackgroundSelected : theme.rowBackground,
                    color: theme.textPrimary,
                    textAlign: 'left',
                    padding: '14px 16px',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.8fr 0.7fr 1fr', gap: 12, alignItems: 'start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <strong style={{ fontSize: 13, color: theme.textPrimary }}>{item.user?.name || t('Manager broadcast')}</strong>
                      <span style={{ fontSize: 12, color: theme.textSecondary }}>{item.title || '-'}</span>
                      <span style={{ fontSize: 11, color: theme.textMuted }}>{item.id}</span>
                    </div>
                    <div style={{ fontSize: 12, color: theme.textSecondary }}>{statusLabel(item.status, t)}</div>
                    <div style={{ fontSize: 12, color: theme.textSecondary }}>{groupLabel(item.groupTo, t)}</div>
                    <div style={{ fontSize: 12, color: theme.textSecondary }}>{formatDateTime(item.createdAt, language)}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ border: `1px solid ${theme.panelBorder}`, borderRadius: 14, background: theme.panelBackground, padding: 16, minHeight: 300 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ fontSize: 20, margin: 0, color: theme.textPrimary }}>{t('Notification details')}</h2>
            {selectedSummary ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => performAction('/core/notifications-manager/retry', selectedSummary.id)}
                  disabled={actionLoading === selectedSummary.id}
                  style={{ padding: '8px 12px', borderRadius: 10, border: `1px solid ${theme.controlBorder}`, background: theme.controlBackground, color: theme.controlText, cursor: 'pointer' }}
                >
                  {t('Retry delivery')}
                </button>
                <button
                  type="button"
                  onClick={() => performAction('/core/notifications-manager/escalate', selectedSummary.id)}
                  disabled={actionLoading === selectedSummary.id}
                  style={{ padding: '8px 12px', borderRadius: 10, border: `1px solid ${theme.controlBorder}`, background: theme.controlBackground, color: theme.controlText, cursor: 'pointer' }}
                >
                  {t('Escalate')}
                </button>
              </div>
            ) : null}
          </div>

          {!selectedId ? (
            <div style={{ color: theme.textMuted }}>{t('No notifications found')}</div>
          ) : loadingDetails ? (
            <div style={{ color: theme.textMuted }}>{t('loading')}</div>
          ) : selectedNotification ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><strong style={{ color: theme.textPrimary }}>{selectedNotification.title || '-'}</strong></div>
              <div style={{ color: theme.textSecondary }}>{selectedNotification.body || '-'}</div>
              <div style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr', color: theme.textSecondary }}>
                <div><strong style={{ color: theme.textPrimary }}>{t('Status')}:</strong> {statusLabel(selectedNotification.status, t)}</div>
                <div><strong style={{ color: theme.textPrimary }}>{t('Group')}:</strong> {groupLabel(selectedNotification.groupTo, t)}</div>
                <div><strong style={{ color: theme.textPrimary }}>{t('Badge')}:</strong> {badgeLabel(selectedNotification.badge, t)}</div>
                <div><strong style={{ color: theme.textPrimary }}>{t('Spent cost')}:</strong> {selectedNotification.spentCost ?? 0}</div>
                <div><strong style={{ color: theme.textPrimary }}>{t('Created')}:</strong> {formatDateTime(selectedNotification.createdAt, language)}</div>
                <div><strong style={{ color: theme.textPrimary }}>{t('Read at')}:</strong> {selectedNotification.readAt ? formatDateTime(selectedNotification.readAt, language) : '—'}</div>
                <div><strong style={{ color: theme.textPrimary }}>{t('User')}:</strong> {selectedNotification.user?.name || t('Manager broadcast')}</div>
                <div><strong style={{ color: theme.textPrimary }}>ID:</strong> {selectedNotification.id}</div>
              </div>

              {Array.isArray(selectedNotification.channels) && selectedNotification.channels.length > 0 ? (
                <section>
                  <h3 style={{ fontSize: 14, margin: '0 0 8px', color: theme.textPrimary }}>{t('Channels')}</h3>
                  <div style={{ border: `1px solid ${theme.panelBorder}`, borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 1fr', gap: 10, padding: '8px 12px', background: theme.headerBackground, fontSize: 11, fontWeight: 700, color: theme.headerText }}>
                      <div>{t('Channel type')}</div>
                      <div>{t('Channel cost')}</div>
                      <div>{t('Channel sent at')}</div>
                    </div>
                    {selectedNotification.channels.map((entry, idx) => (
                      <div key={`${entry.type}-${idx}`} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 1fr', gap: 10, padding: '8px 12px', borderTop: `1px solid ${theme.rowBorder}`, background: theme.rowBackground, fontSize: 12, color: theme.textSecondary }}>
                        <div style={{ fontWeight: 600, color: theme.textPrimary }}>{entry.type || '-'}</div>
                        <div>{entry.cost ?? 0}</div>
                        <div>{entry.sentAt ? formatDateTime(entry.sentAt, language) : '—'}</div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {selectedNotification.user?.id ? (
                  <a href={`${getBaseAdminPath()}/model/user/edit/${encodeURIComponent(selectedNotification.user.id)}`} style={{ color: theme.linkColor, textDecoration: 'none' }}>
                    {t('Open user')}
                  </a>
                ) : null}
                {selectedNotification?.data?.orderId ? (
                  <a href={`${getBaseAdminPath()}/model/order/edit/${encodeURIComponent(selectedNotification.data.orderId)}`} style={{ color: theme.linkColor, textDecoration: 'none' }}>
                    {t('Open order')}
                  </a>
                ) : null}
              </div>

              <section>
                <h3 style={{ fontSize: 15, color: theme.textPrimary }}>{t('Payload')}</h3>
                <pre style={{ whiteSpace: 'pre-wrap', overflow: 'auto', padding: 12, background: theme.codeBackground, color: theme.codeText, borderRadius: 12 }}>
                  {selectedNotification.data ? safeJson(selectedNotification.data) : t('No payload')}
                </pre>
              </section>

              <section>
                <h3 style={{ fontSize: 15, color: theme.textPrimary }}>{t('Logs')}</h3>
                {Array.isArray(selectedNotification.logs) && selectedNotification.logs.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedNotification.logs.map((entry, index) => (
                      <div key={`${entry.timestamp || 'log'}-${index}`} style={{ border: `1px solid ${theme.logBorder}`, borderRadius: 12, padding: 12, background: theme.logBackground }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6, fontSize: 12, color: theme.textSecondary }}>
                          <strong style={{ color: theme.textPrimary }}>{entry.level || 'info'}</strong>
                          <span>{formatDateTime(entry.timestamp, language)}</span>
                        </div>
                        <div style={{ fontSize: 13, marginBottom: 6, color: theme.textSecondary }}>{entry.module || '-'}: {entry.message || '-'}</div>
                        {entry.data !== undefined ? (
                          <pre style={{ whiteSpace: 'pre-wrap', overflow: 'auto', padding: 10, background: theme.logDataBackground, color: theme.textSecondary, borderRadius: 10, margin: 0 }}>
                            {safeJson(entry.data)}
                          </pre>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: theme.textMuted }}>{t('No logs yet')}</div>
                )}
              </section>

              <section>
                <h3 style={{ fontSize: 15, color: theme.textPrimary }}>{t('Raw record')}</h3>
                <pre style={{ whiteSpace: 'pre-wrap', overflow: 'auto', padding: 12, background: theme.rawBackground, color: theme.textSecondary, borderRadius: 12 }}>
                  {safeJson(selectedNotification.rawPayload)}
                </pre>
              </section>
            </div>
          ) : null}
        </div>
      </div>
      ) : null}
    </div>
  );
}

export default function NotificationsManager(props) {
  return (
    <I18nProvider initialLocale={props.locale} messages={props.messages}>
      <NotificationsManagerContent />
    </I18nProvider>
  );
}

if (typeof window !== 'undefined') {
  window.NotificationsManager = window.NotificationsManager || {};
  window.NotificationsManager.Component = NotificationsManager;
  window.NotificationsManager.mount = (el = null) => {
    try {
      const target = el || document.getElementById('notifications-manager-root') || (() => {
        const div = document.createElement('div');
        div.id = 'notifications-manager-root';
        (document.querySelector('#app') || document.body).appendChild(div);
        return div;
      })();

      if (window.ReactDOM && window.ReactDOM.render) {
        window.ReactDOM.render(React.createElement(NotificationsManager), target);
      } else if (window.ReactDOM && window.ReactDOM.hydrateRoot) {
        window.ReactDOM.hydrateRoot(target, React.createElement(NotificationsManager));
      }
    } catch (mountError) {
      void mountError;
    }
  };
}
