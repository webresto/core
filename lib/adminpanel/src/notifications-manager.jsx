import React, { useEffect, useMemo, useState } from 'react';
import { I18nProvider, useTranslation } from './i18n/I18nContext';

const APPEARANCE_STORAGE_KEY = 'appearance';

const { Button, Input, Textarea, Label, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Badge } = window.UIComponents;

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
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(date);
}

function safeJson(value) {
  try { return JSON.stringify(value, null, 2); } catch { return String(value); }
}

async function notificationsApi(path, options = {}) {
  const axios = window.axios;
  if (!axios) throw new Error('window.axios is not available');
  try {
    const response = await axios({
      url: `${getBaseAdminPath()}${path}`,
      method: options.method || 'GET',
      data: options.body ? JSON.parse(options.body) : undefined,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      withCredentials: true,
    });
    return { ok: true, status: response.status, payload: response.data };
  } catch (error) {
    return { ok: false, status: error?.response?.status || 500, payload: error?.response?.data || { error: error?.message || 'Request failed' } };
  }
}

function statusLabel(status, t) {
  const map = { pending: 'Pending', sent: 'Sent', failed: 'Failed', read: 'Read' };
  const key = map[String(status || '').toLowerCase()] || status || '—';
  const tr = t(key);
  return tr === key ? (status || '—') : tr;
}

function groupLabel(groupTo, t) {
  const map = { user: 'User', manager: 'Manager' };
  const key = map[String(groupTo || '').toLowerCase()] || groupTo || '—';
  const tr = t(key);
  return tr === key ? (groupTo || '—') : tr;
}

function badgeLabel(badge, t) {
  const map = { info: 'Info', error: 'Error' };
  const key = map[String(badge || '').toLowerCase()] || badge || '—';
  const tr = t(key);
  return tr === key ? (badge || '—') : tr;
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
  const isDark = useMemo(() => isDarkAppearance(appearance), [appearance]);

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
      if (!response.ok) throw new Error(response.payload?.error || 'Failed to load notifications');
      setItems(Array.isArray(response.payload?.results) ? response.payload.results : []);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setLoadingList(false);
    }
  };

  const loadNotification = async (id) => {
    if (!id) { setSelectedNotification(null); return; }
    setLoadingDetails(true);
    setError('');
    try {
      const response = await notificationsApi(`/core/notifications-manager/notification?id=${encodeURIComponent(id)}`);
      if (!response.ok) throw new Error(response.payload?.error || 'Failed to load notification');
      setSelectedNotification(response.payload?.notification || null);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setLoadingDetails(false);
    }
  };

  const loadChannels = async () => {
    setLoadingChannels(true);
    setError('');
    try {
      const response = await notificationsApi('/core/notifications-manager/channels');
      if (!response.ok) throw new Error(response.payload?.error || 'Failed to load channels');
      setChannels(Array.isArray(response.payload?.results) ? response.payload.results : []);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setLoadingChannels(false);
    }
  };

  const searchUsers = async (query) => {
    const normalized = String(query || '').trim();
    if (normalized.length < 2) { setUserOptions([]); return; }
    try {
      const response = await notificationsApi(`/core/notifications-manager/users?q=${encodeURIComponent(normalized)}`);
      if (!response.ok) throw new Error(response.payload?.error || 'Failed to load users');
      setUserOptions(Array.isArray(response.payload?.results) ? response.payload.results : []);
    } catch (e) {
      setError(String(e?.message || e));
    }
  };

  useEffect(() => {
    if (!isChannelsView) loadItems();
    loadChannels();
    if (isChannelsView) return undefined;
    const timer = window.setInterval(loadItems, 30000);
    return () => window.clearInterval(timer);
  }, [isChannelsView]);

  useEffect(() => {
    if (isChannelsView) return undefined;
    const timer = window.setTimeout(() => loadItems(), 250);
    return () => window.clearTimeout(timer);
  }, [search, status, groupTo, isChannelsView]);

  useEffect(() => {
    if (isChannelsView) return;
    if (!selectedId) { setSelectedNotification(null); return; }
    loadNotification(selectedId);
  }, [selectedId, isChannelsView]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (createGroupTo === 'user') searchUsers(createUserQuery);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [createUserQuery, createGroupTo]);

  useEffect(() => {
    if (!selectedId || selectedNotification?.id === selectedId) return;
    if (!items.some((item) => item.id === selectedId)) setSelectedId('');
  }, [items, selectedId, selectedNotification]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const sync = () => setAppearance(getPreferredAppearance());
    const media = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: dark)') : null;
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

  const selectedSummary = useMemo(() => items.find((item) => item.id === selectedId) || null, [items, selectedId]);

  const performAction = async (path, id) => {
    setActionLoading(id);
    setError('');
    try {
      const response = await notificationsApi(path, { method: 'POST', body: JSON.stringify({ id }) });
      if (!response.ok) throw new Error(response.payload?.error || 'Request failed');
      await loadItems();
      await loadNotification(id);
    } catch (e) {
      setError(t('Action failed: {error}', { error: String(e?.message || e) }));
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
        body: JSON.stringify({ groupTo: createGroupTo, userId: createGroupTo === 'user' ? selectedUser?.id : null, title: createTitle, body: createBody, badge: createBadge, data: parsedPayload }),
      });
      if (!response.ok) throw new Error(response.payload?.error || 'Failed to create notification');
      setCreateTitle(''); setCreateBody(''); setCreateBadge('info'); setCreatePayload('');
      setCreateUserQuery(''); setSelectedUser(null); setUserOptions([]);
      await loadItems();
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setCreateLoading(false);
    }
  };

  const panel = { border: '1px solid var(--border)', borderRadius: 14, background: 'var(--card)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 };
  const inputStyle = { padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', width: '100%', boxSizing: 'border-box' };

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, color: 'var(--foreground)', background: 'var(--background)', minHeight: '100%' }}>

      {/* Create notification */}
      {!isChannelsView && (
        <section style={panel}>
          <h2 style={{ margin: 0, fontSize: 20 }}>{t('Create notification')}</h2>

          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'minmax(160px, 0.7fr) minmax(220px, 1fr) minmax(160px, 0.7fr)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Label>{t('Target')}</Label>
              <select value={createGroupTo} onChange={(e) => {
                const v = e.target.value;
                setCreateGroupTo(v);
                if (v !== 'user') { setSelectedUser(null); setCreateUserQuery(''); setUserOptions([]); setShowUserAutocomplete(false); }
              }} style={inputStyle}>
                <option value="manager">{t('Manager')}</option>
                <option value="user">{t('User')}</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Label>{t('Search user by login, phone, email')}</Label>
              <div style={{ position: 'relative' }}>
                <Input
                  value={createUserQuery}
                  onFocus={() => { if (createGroupTo === 'user') setShowUserAutocomplete(true); }}
                  onChange={(e) => { setCreateUserQuery(e.target.value); setSelectedUser(null); setShowUserAutocomplete(true); }}
                  onBlur={() => { window.setTimeout(() => setShowUserAutocomplete(false), 150); }}
                  disabled={createGroupTo !== 'user'}
                  placeholder={t('Search user by login, phone, email')}
                />
                {createGroupTo === 'user' && showUserAutocomplete && createUserQuery.trim().length >= 2 && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 12px 24px rgba(0,0,0,0.18)', maxHeight: 240, overflow: 'auto', zIndex: 20 }}>
                    {userOptions.length === 0 ? (
                      <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--muted-foreground)' }}>{t('Found users')}</div>
                    ) : userOptions.map((user) => (
                      <button key={user.id} type="button" onMouseDown={() => { setSelectedUser(user); setCreateUserQuery(formatUserOption(user)); setShowUserAutocomplete(false); }}
                        style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', border: 'none', borderTop: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)', cursor: 'pointer' }}>
                        <div style={{ fontSize: 13 }}>{user.name || user.login || user.id}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{formatUserOption(user)}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Label>{t('Select user')}</Label>
              <div style={{ ...inputStyle, minHeight: 22, color: selectedUser ? 'var(--foreground)' : 'var(--muted-foreground)', background: 'var(--muted)' }}>
                {selectedUser ? formatUserOption(selectedUser) : t('Found users')}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'minmax(220px, 1fr) minmax(160px, 0.5fr)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Label>{t('Title')}</Label>
              <Input value={createTitle} onChange={(e) => setCreateTitle(e.target.value)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Label>{t('Badge')}</Label>
              <select value={createBadge} onChange={(e) => setCreateBadge(e.target.value)} style={inputStyle}>
                <option value="info">{badgeLabel('info', t)}</option>
                <option value="error">{badgeLabel('error', t)}</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Label>{t('Body')}</Label>
            <Textarea value={createBody} onChange={(e) => setCreateBody(e.target.value)} rows={4} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Label>{t('Payload JSON')}</Label>
            <Textarea value={createPayload} onChange={(e) => setCreatePayload(e.target.value)} rows={5} placeholder={t('Optional JSON object')} style={{ fontFamily: 'monospace' }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="default" onClick={submitCreate} disabled={createLoading}>
              {createLoading ? t('Sending...') : t('Send notification')}
            </Button>
          </div>
        </section>
      )}

      {/* Channels view */}
      {isChannelsView && (
        <section style={panel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: 20 }}>{t('Notification channels')}</h2>
            <Button variant="outline" size="sm" onClick={loadChannels} disabled={loadingChannels}>{t('Refresh channels')}</Button>
          </div>

          {channels.length === 0 ? (
            <div style={{ color: 'var(--muted-foreground)' }}>{t('No notification channels registered')}</div>
          ) : (
            <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, 1fr) minmax(120px, 0.8fr) minmax(180px, 1fr) minmax(90px, 0.6fr) minmax(90px, 0.6fr) minmax(100px, 0.7fr) minmax(140px, 1fr)', gap: 12, padding: '12px 14px', background: 'var(--muted)', fontSize: 12, fontWeight: 700, color: 'var(--muted-foreground)' }}>
                <div>Type</div><div>{t('Ready')}</div><div>{t('Groups')}</div><div>{t('Weight')}</div><div>{t('Cost')}</div><div>{t('Force send')}</div><div>{t('Class')}</div>
              </div>
              {channels.map((channel) => (
                <div key={channel.type} style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, 1fr) minmax(120px, 0.8fr) minmax(180px, 1fr) minmax(90px, 0.6fr) minmax(90px, 0.6fr) minmax(100px, 0.7fr) minmax(140px, 1fr)', gap: 12, padding: '12px 14px', borderTop: '1px solid var(--border)', background: 'var(--card)', alignItems: 'start' }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{channel.type || '-'}</div>
                  <div style={{ fontSize: 12, color: channel.ready ? '#16a34a' : '#dc2626' }}>
                    {String(Boolean(channel.ready))}
                    {channel.readinessError && <div style={{ marginTop: 4, color: '#dc2626' }}>{t('Readiness error')}: {channel.readinessError}</div>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{Array.isArray(channel.forGroupTo) ? channel.forGroupTo.join(', ') : '-'}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{channel.sortOrder ?? '-'}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{channel.cost ?? '-'}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{String(Boolean(channel.forceSend))}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{channel.className || '-'}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Notifications list header */}
      {!isChannelsView && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 30, fontWeight: 700, margin: 0 }}>{t('Notifications')}</h1>
          <Button variant="outline" size="sm" onClick={loadItems} disabled={loadingList}>
            {loadingList ? t('Refreshing...') : t('Refresh')}
          </Button>
        </div>
      )}

      {/* Filters */}
      {!isChannelsView && (
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'minmax(220px, 1.6fr) minmax(160px, 0.8fr) minmax(160px, 0.8fr)' }}>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('Search by ID, title, body, user, order ID')} />
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle}>
            <option value="">{t('All statuses')}</option>
            <option value="pending">{statusLabel('pending', t)}</option>
            <option value="sent">{statusLabel('sent', t)}</option>
            <option value="failed">{statusLabel('failed', t)}</option>
            <option value="read">{statusLabel('read', t)}</option>
          </select>
          <select value={groupTo} onChange={(e) => setGroupTo(e.target.value)} style={inputStyle}>
            <option value="">{t('All groups')}</option>
            <option value="user">{groupLabel('user', t)}</option>
            <option value="manager">{groupLabel('manager', t)}</option>
          </select>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--destructive)', color: '#fff', opacity: 0.9 }}>
          {error}
        </div>
      )}

      {/* Notifications list + detail */}
      {!isChannelsView && (
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'minmax(420px, 1.2fr) minmax(320px, 0.9fr)', alignItems: 'start' }}>

          {/* List */}
          <div style={{ border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', background: 'var(--card)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.8fr 0.7fr 1fr', gap: 12, padding: '14px 16px', background: 'var(--muted)', fontSize: 12, fontWeight: 700, color: 'var(--muted-foreground)' }}>
              <div>{t('User')}</div><div>{t('Status')}</div><div>{t('Group')}</div><div>{t('Created')}</div>
            </div>
            <div style={{ maxHeight: '70vh', overflow: 'auto' }}>
              {items.length === 0 ? (
                <div style={{ padding: 20, color: 'var(--muted-foreground)' }}>{t('No notifications found')}</div>
              ) : items.map((item) => {
                const isSelected = item.id === selectedId;
                return (
                  <button key={item.id} type="button" onClick={() => setSelectedId(item.id)}
                    style={{
                      width: '100%', border: 'none', borderTop: '1px solid var(--border)',
                      background: isSelected ? 'var(--accent)' : 'var(--card)',
                      color: 'var(--foreground)', textAlign: 'left', padding: '14px 16px', cursor: 'pointer',
                      borderLeft: isSelected ? '3px solid var(--primary)' : '3px solid transparent',
                    }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.8fr 0.7fr 1fr', gap: 12, alignItems: 'start' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <strong style={{ fontSize: 13 }}>{item.user?.name || t('Manager broadcast')}</strong>
                        <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{item.title || '-'}</span>
                        <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{item.id}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{statusLabel(item.status, t)}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{groupLabel(item.groupTo, t)}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{formatDateTime(item.createdAt, language)}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detail panel */}
          <div style={{ border: '1px solid var(--border)', borderRadius: 14, background: 'var(--card)', padding: 16, minHeight: 300 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ fontSize: 20, margin: 0 }}>{t('Notification details')}</h2>
              {selectedSummary && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Button variant="outline" size="sm" onClick={() => performAction('/core/notifications-manager/retry', selectedSummary.id)} disabled={actionLoading === selectedSummary.id}>
                    {t('Retry delivery')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => performAction('/core/notifications-manager/escalate', selectedSummary.id)} disabled={actionLoading === selectedSummary.id}>
                    {t('Escalate')}
                  </Button>
                </div>
              )}
            </div>

            {!selectedId ? (
              <div style={{ color: 'var(--muted-foreground)' }}>{t('No notifications found')}</div>
            ) : loadingDetails ? (
              <div style={{ color: 'var(--muted-foreground)' }}>{t('loading')}</div>
            ) : selectedNotification ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div><strong>{selectedNotification.title || '-'}</strong></div>
                <div style={{ color: 'var(--muted-foreground)' }}>{selectedNotification.body || '-'}</div>
                <div style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr', color: 'var(--muted-foreground)' }}>
                  <div><strong style={{ color: 'var(--foreground)' }}>{t('Status')}:</strong> {statusLabel(selectedNotification.status, t)}</div>
                  <div><strong style={{ color: 'var(--foreground)' }}>{t('Group')}:</strong> {groupLabel(selectedNotification.groupTo, t)}</div>
                  <div><strong style={{ color: 'var(--foreground)' }}>{t('Badge')}:</strong> {badgeLabel(selectedNotification.badge, t)}</div>
                  <div><strong style={{ color: 'var(--foreground)' }}>{t('Spent cost')}:</strong> {selectedNotification.spentCost ?? 0}</div>
                  <div><strong style={{ color: 'var(--foreground)' }}>{t('Created')}:</strong> {formatDateTime(selectedNotification.createdAt, language)}</div>
                  <div><strong style={{ color: 'var(--foreground)' }}>{t('Read at')}:</strong> {selectedNotification.readAt ? formatDateTime(selectedNotification.readAt, language) : '—'}</div>
                  <div><strong style={{ color: 'var(--foreground)' }}>{t('User')}:</strong> {selectedNotification.user?.name || t('Manager broadcast')}</div>
                  <div><strong style={{ color: 'var(--foreground)' }}>ID:</strong> {selectedNotification.id}</div>
                </div>

                {Array.isArray(selectedNotification.channels) && selectedNotification.channels.length > 0 && (
                  <section>
                    <h3 style={{ fontSize: 14, margin: '0 0 8px' }}>{t('Channels')}</h3>
                    <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 1fr', gap: 10, padding: '8px 12px', background: 'var(--muted)', fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)' }}>
                        <div>{t('Channel type')}</div><div>{t('Channel cost')}</div><div>{t('Channel sent at')}</div>
                      </div>
                      {selectedNotification.channels.map((entry, idx) => (
                        <div key={`${entry.type}-${idx}`} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 1fr', gap: 10, padding: '8px 12px', borderTop: '1px solid var(--border)', background: 'var(--card)', fontSize: 12, color: 'var(--muted-foreground)' }}>
                          <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>{entry.type || '-'}</div>
                          <div>{entry.cost ?? 0}</div>
                          <div>{entry.sentAt ? formatDateTime(entry.sentAt, language) : '—'}</div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {selectedNotification.user?.id && (
                    <a href={`${getBaseAdminPath()}/model/user/edit/${encodeURIComponent(selectedNotification.user.id)}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                      {t('Open user')}
                    </a>
                  )}
                  {selectedNotification?.data?.orderId && (
                    <a href={`${getBaseAdminPath()}/model/order/edit/${encodeURIComponent(selectedNotification.data.orderId)}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                      {t('Open order')}
                    </a>
                  )}
                </div>

                <section>
                  <h3 style={{ fontSize: 15 }}>{t('Payload')}</h3>
                  <pre style={{ whiteSpace: 'pre-wrap', overflow: 'auto', padding: 12, background: '#0f172a', color: '#e2e8f0', borderRadius: 12 }}>
                    {selectedNotification.data ? safeJson(selectedNotification.data) : t('No payload')}
                  </pre>
                </section>

                <section>
                  <h3 style={{ fontSize: 15 }}>{t('Logs')}</h3>
                  {Array.isArray(selectedNotification.logs) && selectedNotification.logs.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {selectedNotification.logs.map((entry, index) => (
                        <div key={`${entry.timestamp || 'log'}-${index}`} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 12, background: 'var(--muted)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6, fontSize: 12, color: 'var(--muted-foreground)' }}>
                            <strong style={{ color: 'var(--foreground)' }}>{entry.level || 'info'}</strong>
                            <span>{formatDateTime(entry.timestamp, language)}</span>
                          </div>
                          <div style={{ fontSize: 13, marginBottom: 6, color: 'var(--muted-foreground)' }}>{entry.module || '-'}: {entry.message || '-'}</div>
                          {entry.data !== undefined && (
                            <pre style={{ whiteSpace: 'pre-wrap', overflow: 'auto', padding: 10, background: 'var(--card)', color: 'var(--muted-foreground)', borderRadius: 10, margin: 0 }}>
                              {safeJson(entry.data)}
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: 'var(--muted-foreground)' }}>{t('No logs yet')}</div>
                  )}
                </section>

                <section>
                  <h3 style={{ fontSize: 15 }}>{t('Raw record')}</h3>
                  <pre style={{ whiteSpace: 'pre-wrap', overflow: 'auto', padding: 12, background: 'var(--muted)', color: 'var(--muted-foreground)', borderRadius: 12 }}>
                    {safeJson(selectedNotification.rawPayload)}
                  </pre>
                </section>
              </div>
            ) : null}
          </div>
        </div>
      )}
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
