import React, { useEffect, useMemo, useState } from 'react';
import { I18nProvider, useTranslation } from './i18n/I18nContext';

const APPEARANCE_STORAGE_KEY = 'appearance';

const { Button, Input, Textarea, Label, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Badge, Switch } = window.UIComponents;

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

function channelLabel(channel, t) {
  const type = String(channel?.type || '');
  const map = {
    'fcm-web': 'Browser push',
    'fcm-mobile': 'Mobile push',
    'sms': 'SMS',
    'email': 'Email',
  };
  const key = map[type] || type || '—';
  const tr = t(key);
  return tr === key ? key : tr;
}

function channelNameWithAdapter(channel, t) {
  const adapter = String(channel?.type || '').trim();
  if (!adapter) return '—';
  return `${channelLabel(channel, t)} (${adapter})`;
}

function formatTargetTimestamp(value) {
  if (!value) return '';
  const ms = typeof value === 'number' ? (value < 1e12 ? value * 1000 : value) : Date.parse(value);
  if (!ms || Number.isNaN(ms)) return '';
  try { return new Date(ms).toLocaleString(); } catch { return ''; }
}

function formatUserOption(user) {
  if (!user) return '';

  // Корзина: показываем shortId, состояние, дату и устройство
  if (user.kind === 'cart') {
    const parts = [`🛒 ${user.shortId || user.orderId || ''}`];
    if (user.state) parts.push(user.state);
    const created = formatTargetTimestamp(user.createdAt);
    if (created) parts.push(created);
    if (user.deviceId) parts.push(`📱${user.deviceId}`);
    if (!user.userId) parts.push('гость');
    return parts.join(' · ');
  }

  // Устройство (гостевое): показываем имя, последнюю активность
  if (user.kind === 'device') {
    const parts = [`📱 ${user.name || user.deviceId || ''}`];
    const active = formatTargetTimestamp(user.lastActivity);
    if (active) parts.push(`акт. ${active}`);
    if (!user.hasToken) parts.push('без токена');
    return parts.join(' · ');
  }

  const parts = [];
  if (user.name) parts.push(user.name);
  if (user.phone) parts.push(user.phone);
  if (user.email) parts.push(user.email);
  if (user.login) parts.push(`@${user.login}`);
  if (user.deviceId) parts.push(`📱${user.deviceId}`);
  return parts.join(' · ');
}

function getCurrentViewMode() {
  const pathname = (window.location.pathname || '').replace(/\/+$/, '');
  if (pathname.endsWith('/notification-channels')) return 'channels';
  return 'notifications';
}

function getNotificationSectionFromHash() {
  if (typeof window === 'undefined') return 'history';
  const hash = String(window.location.hash || '').replace(/^#/, '').toLowerCase();
  return hash === 'send' ? 'send' : 'history';
}

function setNotificationSectionHash(section) {
  if (typeof window === 'undefined') return;
  const nextHash = section === 'send' ? '#send' : '#history';
  if (window.location.hash === nextHash) return;
  window.history.pushState(null, '', `${window.location.pathname}${window.location.search}${nextHash}`);
}

function buildNotificationContext(notification) {
  const lines = [
    `Notification ID: ${notification.id}`,
    `Title: ${notification.title || '-'}`,
    `Body: ${notification.body || '-'}`,
    `Status: ${notification.status || '-'}`,
    `Group: ${notification.groupTo || '-'}`,
    `Badge: ${notification.badge || '-'}`,
    `Created: ${notification.createdAt || '-'}`,
    `Read at: ${notification.readAt || '-'}`,
  ];
  if (notification.user) {
    lines.push(`User ID: ${notification.user.id}`);
    lines.push(`User name: ${notification.user.name || '-'}`);
    lines.push(`User phone: ${notification.user.phone || '-'}`);
  }
  if (notification.requestedChannels?.length) {
    lines.push(`Requested channels: ${notification.requestedChannels.join(', ')}`);
  }
  if (notification.channels?.length) {
    lines.push(`Delivery channels:`);
    for (const ch of notification.channels) {
      lines.push(`  - ${ch.type}: cost=${ch.cost ?? 0}, sentAt=${ch.sentAt || '-'}`);
    }
  }
  if (notification.data) {
    lines.push(`\nPayload:\n${JSON.stringify(notification.data, null, 2)}`);
  }
  if (notification.logs?.length) {
    lines.push(`\nLogs (${notification.logs.length}):`);
    for (const entry of notification.logs) {
      lines.push(`  [${entry.level || 'info'}] ${entry.timestamp || ''} ${entry.module || ''}: ${entry.message || ''}`);
      if (entry.data !== undefined) {
        lines.push(`    ${JSON.stringify(entry.data)}`);
      }
    }
  }
  return lines.join('\n');
}

function CopyContextButton({ notification, t }) {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = React.useCallback(() => {
    const text = buildNotificationContext(notification);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {});
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
      document.body.removeChild(ta);
    }
  }, [notification]);
  return (
    <Button variant="outline" size="sm" onClick={handleCopy}>
      {copied ? t('Copied!') : t('Copy context')}
    </Button>
  );
}

function NotificationsManagerContent() {
  const { language, t } = useTranslation();
  const viewMode = getCurrentViewMode();
  const isChannelsView = viewMode === 'channels';
  const [notificationSection, setNotificationSection] = useState(getNotificationSectionFromHash);

  const [appearance, setAppearance] = useState(getPreferredAppearance);
  const isDark = useMemo(() => isDarkAppearance(appearance), [appearance]);

  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [channels, setChannels] = useState([]);
  const [channelDrafts, setChannelDrafts] = useState({});
  const [createGroupTo, setCreateGroupTo] = useState('user');
  const [createUserQuery, setCreateUserQuery] = useState('');
  const [userOptions, setUserOptions] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserAutocomplete, setShowUserAutocomplete] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createBody, setCreateBody] = useState('');
  const [createBadge, setCreateBadge] = useState('info');
  const [createPayload, setCreatePayload] = useState('');
  const [createChannelTypes, setCreateChannelTypes] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [groupTo, setGroupTo] = useState('');
  const [filterUser, setFilterUser] = useState(null);
  const [filterUserQuery, setFilterUserQuery] = useState('');
  const [filterUserOptions, setFilterUserOptions] = useState([]);
  const [showFilterUserAutocomplete, setShowFilterUserAutocomplete] = useState(false);
  const [filterOrderId, setFilterOrderId] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(null);
  const PAGE_SIZE = 50;
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [error, setError] = useState('');

  const loadItems = async (pageArg) => {
    setLoadingList(true);
    setError('');
    const currentPage = pageArg ?? page;
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('q', search.trim());
      if (status) params.set('status', status);
      if (groupTo) params.set('groupTo', groupTo);
      if (filterUser?.id) params.set('userId', filterUser.id);
      if (filterOrderId.trim()) params.set('orderId', filterOrderId.trim());
      params.set('limit', String(PAGE_SIZE));
      params.set('skip', String(currentPage * PAGE_SIZE));
      const response = await notificationsApi(`/core/notifications-manager/notifications?${params.toString()}`);
      if (!response.ok) throw new Error(response.payload?.error || 'Failed to load notifications');
      setItems(Array.isArray(response.payload?.results) ? response.payload.results : []);
      setTotal(response.payload?.meta?.total ?? null);
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

  const updateChannelEnabled = async (channel, enabled) => {
    const type = String(channel?.type || '');
    if (!type) return;
    setActionLoading(`channel:${type}`);
    setError('');
    try {
      const response = await notificationsApi('/core/notifications-manager/channel-settings', {
        method: 'POST',
        body: JSON.stringify({ type, enabled }),
      });
      if (!response.ok) throw new Error(response.payload?.error || 'Failed to update channel');
      await loadChannels();
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setActionLoading('');
    }
  };

  const updateChannelDraft = (type, field, value) => {
    setChannelDrafts((current) => ({
      ...current,
      [type]: {
        ...(current[type] || {}),
        [field]: value,
      },
    }));
  };

  const parseChannelNumber = (value, field) => {
    const normalized = String(value ?? '').trim();
    if (normalized === '') return null;
    const numberValue = Number(normalized);
    if (!Number.isFinite(numberValue)) return null;
    if (field === 'cost' && numberValue < 0) return null;
    return numberValue;
  };

  const saveChannelNumber = async (channel, field) => {
    const type = String(channel?.type || '');
    if (!type) return;
    const draftValue = channelDrafts[type]?.[field] ?? '';
    const numberValue = parseChannelNumber(draftValue, field);
    if (numberValue === null) {
      setError(field === 'cost' ? t('Invalid channel cost') : t('Invalid channel weight'));
      return;
    }
    if (Number(channel?.[field]) === numberValue) return;

    setActionLoading(`channel:${type}:${field}`);
    setError('');
    try {
      const response = await notificationsApi('/core/notifications-manager/channel-settings', {
        method: 'POST',
        body: JSON.stringify({ type, [field]: numberValue }),
      });
      if (!response.ok) throw new Error(response.payload?.error || 'Failed to update channel');
      await loadChannels();
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setActionLoading('');
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

  const searchFilterUsers = async (query) => {
    const normalized = String(query || '').trim();
    if (normalized.length < 2) { setFilterUserOptions([]); return; }
    try {
      const response = await notificationsApi(`/core/notifications-manager/users?q=${encodeURIComponent(normalized)}`);
      if (!response.ok) return;
      setFilterUserOptions(Array.isArray(response.payload?.results) ? response.payload.results : []);
    } catch {}
  };

  useEffect(() => {
    if (!isChannelsView) loadItems(0);
    loadChannels();
    if (isChannelsView) return undefined;
    const timer = window.setInterval(() => loadItems(page), 30000);
    return () => window.clearInterval(timer);
  }, [isChannelsView]);

  useEffect(() => {
    setChannelDrafts(() => {
      const next = {};
      for (const channel of channels) {
        const type = String(channel?.type || '');
        if (!type) continue;
        next[type] = {
          sortOrder: String(channel.sortOrder ?? ''),
          cost: String(channel.cost ?? ''),
        };
      }
      return next;
    });
  }, [channels]);

  useEffect(() => {
    if (isChannelsView) return undefined;
    setPage(0);
    const timer = window.setTimeout(() => loadItems(0), 250);
    return () => window.clearTimeout(timer);
  }, [search, status, groupTo, filterUser, filterOrderId, isChannelsView]);

  useEffect(() => {
    const timer = window.setTimeout(() => searchFilterUsers(filterUserQuery), 250);
    return () => window.clearTimeout(timer);
  }, [filterUserQuery]);

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

  useEffect(() => {
    if (isChannelsView || typeof window === 'undefined') return undefined;
    const syncSectionFromHash = () => setNotificationSection(getNotificationSectionFromHash());
    syncSectionFromHash();
    window.addEventListener('hashchange', syncSectionFromHash);
    window.addEventListener('popstate', syncSectionFromHash);
    return () => {
      window.removeEventListener('hashchange', syncSectionFromHash);
      window.removeEventListener('popstate', syncSectionFromHash);
    };
  }, [isChannelsView]);

  const changeNotificationSection = (section) => {
    setNotificationSection(section);
    setNotificationSectionHash(section);
  };

  const goToPage = (newPage) => {
    setPage(newPage);
    setSelectedId('');
    loadItems(newPage);
  };

  const selectedSummary = useMemo(() => items.find((item) => item.id === selectedId) || null, [items, selectedId]);
  const availableCreateChannels = useMemo(() => {
    return channels.filter((channel) => {
      const groups = Array.isArray(channel?.forGroupTo) ? channel.forGroupTo : [];
      return groups.includes(createGroupTo)
        && channel.enabled !== false
        && channel.configured !== false
        && Boolean(channel.ready)
        && String(channel.type || '').trim() !== '';
    });
  }, [channels, createGroupTo]);

  useEffect(() => {
    const availableTypes = availableCreateChannels.map((channel) => String(channel.type));
    setCreateChannelTypes((current) => {
      const preserved = current.filter((type) => availableTypes.includes(type));
      if (preserved.length > 0 || current.length === 0) return preserved.length > 0 ? preserved : availableTypes;
      return preserved;
    });
  }, [availableCreateChannels]);

  const toggleCreateChannel = (type, checked) => {
    setCreateChannelTypes((current) => {
      if (checked) return current.includes(type) ? current : [...current, type];
      return current.filter((item) => item !== type);
    });
  };

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
    // Корзина/устройство адресуются по deviceId и не требуют userId
    const isDeviceTarget = createGroupTo === 'user'
      && (selectedUser?.kind === 'cart' || selectedUser?.kind === 'device')
      && selectedUser?.deviceId;
    if (createGroupTo === 'user' && !isDeviceTarget && !selectedUser?.id) {
      setError(t('Choose a user for user-targeted notification'));
      return;
    }
    if (createChannelTypes.length === 0) {
      setError(t('Choose at least one notification channel'));
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
          userId: createGroupTo === 'user' && !isDeviceTarget ? selectedUser?.id : null,
          deviceId: isDeviceTarget ? selectedUser.deviceId : null,
          title: createTitle,
          body: createBody,
          badge: createBadge,
          data: parsedPayload,
          channelTypes: createChannelTypes,
        }),
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

  const pageShell = { padding: 24, display: 'flex', flexDirection: 'column', gap: 24, color: 'var(--foreground)', background: 'var(--background)', minHeight: '100%' };
  const pageHeader = { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' };
  const pageTitle = { fontSize: 24, lineHeight: '32px', fontWeight: 700, margin: 0, letterSpacing: 0 };
  const pageDescription = { margin: '6px 0 0', color: 'var(--muted-foreground)', fontSize: 14, lineHeight: '20px', maxWidth: 720 };
  const sectionStack = { display: 'grid', gap: 24 };
  const panel = { border: '1px solid var(--border)', borderRadius: 14, background: 'var(--card)', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 };
  const panelHeader = { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' };
  const sectionTitle = { margin: 0, fontSize: 20, lineHeight: '28px', fontWeight: 700, letterSpacing: 0 };
  const sectionDescription = { margin: '4px 0 0', color: 'var(--muted-foreground)', fontSize: 14, lineHeight: '20px', maxWidth: 680 };
  const inputStyle = { padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', width: '100%', boxSizing: 'border-box' };
  const tabsStyle = { display: 'inline-flex', gap: 4, padding: 4, border: '1px solid var(--border)', borderRadius: 12, background: 'var(--muted)' };
  const tabButtonStyle = (active) => ({
    border: '1px solid transparent',
    borderRadius: 9,
    background: active ? 'var(--card)' : 'transparent',
    color: active ? 'var(--foreground)' : 'var(--muted-foreground)',
    padding: '8px 12px',
    minHeight: 36,
    fontSize: 14,
    lineHeight: '20px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: active ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
  });
  const formGroupStyle = { border: '1px solid var(--border)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 14, background: 'var(--card)' };
  const formGroupTitle = { margin: 0, fontSize: 16, lineHeight: '24px', fontWeight: 700, letterSpacing: 0 };
  const radioOptionStyle = (active) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    border: '1px solid var(--border)',
    borderRadius: 10,
    background: active ? 'var(--muted)' : 'var(--background)',
    color: 'var(--foreground)',
    padding: '10px 12px',
    minHeight: 40,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
  });

  return (
    <div style={pageShell}>
      <header style={pageHeader}>
        <div>
          <h1 style={pageTitle}>{isChannelsView ? t('Notification channels') : t('Notifications')}</h1>
          <p style={pageDescription}>
            {isChannelsView
              ? t('Manage delivery channels and their routing settings.')
              : t('Send messages and review delivery history in separate notification sections.')}
          </p>
        </div>

        {!isChannelsView && (
          <div role="tablist" aria-label={t('Notifications')} style={tabsStyle}>
            <button
              type="button"
              role="tab"
              aria-selected={notificationSection === 'history'}
              onClick={() => changeNotificationSection('history')}
              style={tabButtonStyle(notificationSection === 'history')}
            >
              {t('Notification history')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={notificationSection === 'send'}
              onClick={() => changeNotificationSection('send')}
              style={tabButtonStyle(notificationSection === 'send')}
            >
              {t('Send notification')}
            </button>
          </div>
        )}
      </header>

      {error && (
        <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--destructive)', color: '#fff', opacity: 0.9 }}>
          {error}
        </div>
      )}

      {/* Create notification */}
      {!isChannelsView && notificationSection === 'send' && (
        <section style={panel}>
          <div style={panelHeader}>
            <div>
              <h2 style={sectionTitle}>{t('Create notification')}</h2>
            </div>
          </div>

          <div style={formGroupStyle}>
            <h3 style={formGroupTitle}>{t('Recipient group')}</h3>
            <div role="radiogroup" aria-label={t('Recipient group')} style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
              {[
                { value: 'user', label: t('User') },
                { value: 'manager', label: t('Manager') },
              ].map((option) => (
                <label
                  key={option.value}
                  style={radioOptionStyle(createGroupTo === option.value)}
                >
                  <input
                    type="radio"
                    name="notification-recipient-group"
                    value={option.value}
                    checked={createGroupTo === option.value}
                    onChange={(e) => {
                      const v = e.target.value;
                      setCreateGroupTo(v);
                      setCreateChannelTypes([]);
                      if (v !== 'user') { setSelectedUser(null); setCreateUserQuery(''); setUserOptions([]); setShowUserAutocomplete(false); }
                    }}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          {createGroupTo === 'user' && (
            <div style={formGroupStyle}>
              <h3 style={formGroupTitle}>{t('User selection')}</h3>
              <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <Label>{t('Search user by login, phone, email, device id')}</Label>
                  <div style={{ position: 'relative' }}>
                    <Input
                      value={createUserQuery}
                      onFocus={() => setShowUserAutocomplete(true)}
                      onChange={(e) => { setCreateUserQuery(e.target.value); setSelectedUser(null); setShowUserAutocomplete(true); }}
                      onBlur={() => { window.setTimeout(() => setShowUserAutocomplete(false), 150); }}
                      placeholder={t('Search user by login, phone, email, device id')}
                    />
                    {showUserAutocomplete && createUserQuery.trim().length >= 2 && (
                      <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 12px 24px rgba(0,0,0,0.18)', maxHeight: 240, overflow: 'auto', zIndex: 20 }}>
                        {userOptions.length === 0 ? (
                          <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--muted-foreground)' }}>{t('No users found')}</div>
                        ) : userOptions.map((user) => (
                          <button key={`${user.kind || 'user'}-${user.id}`} type="button" onMouseDown={() => { setSelectedUser(user); setCreateUserQuery(formatUserOption(user)); setShowUserAutocomplete(false); }}
                            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', border: 'none', borderTop: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)', cursor: 'pointer' }}>
                            <div style={{ fontSize: 13 }}>
                              {user.kind === 'cart' ? `🛒 ${t('Cart')} ${user.shortId || user.orderId || ''}`
                                : user.kind === 'device' ? `📱 ${t('Device')} ${user.name || user.deviceId || ''}`
                                : (user.name || user.login || user.id)}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{formatUserOption(user)}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <Label>{t('Selected user')}</Label>
                  <div style={{ ...inputStyle, minHeight: 22, color: selectedUser ? 'var(--foreground)' : 'var(--muted-foreground)', background: 'var(--muted)' }}>
                    {selectedUser ? formatUserOption(selectedUser) : t('No user selected')}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div style={formGroupStyle}>
            <h3 style={formGroupTitle}>{t('Message')}</h3>
            <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Label>{t('Title')}</Label>
                <Input value={createTitle} onChange={(e) => setCreateTitle(e.target.value)} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Label>{t('Notification type')}</Label>
                <select value={createBadge} onChange={(e) => setCreateBadge(e.target.value)} style={inputStyle}>
                  <option value="info">{badgeLabel('info', t)}</option>
                  <option value="error">{badgeLabel('error', t)}</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Label>{t('Message text')}</Label>
              <Textarea value={createBody} onChange={(e) => setCreateBody(e.target.value)} rows={4} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Label>{t('Additional data JSON')}</Label>
              <Textarea value={createPayload} onChange={(e) => setCreatePayload(e.target.value)} rows={5} placeholder={t('Optional JSON object')} style={{ fontFamily: 'monospace' }} />
            </div>
          </div>

          <div style={formGroupStyle}>
            <h3 style={formGroupTitle}>{t('Delivery channels')}</h3>
            {availableCreateChannels.length === 0 ? (
              <div style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--muted)', color: 'var(--muted-foreground)', fontSize: 13 }}>
                {loadingChannels ? t('Loading...') : t('No available notification channels for selected group')}
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {availableCreateChannels.map((channel) => {
                  const type = String(channel.type);
                  const checked = createChannelTypes.includes(type);
                  return (
                    <label key={type} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 36, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 10, background: checked ? 'var(--muted)' : 'var(--card)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => toggleCreateChannel(type, e.target.checked)}
                      />
                      <span>{channelLabel(channel, t)}</span>
                    </label>
                  );
                })}
              </div>
            )}
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
            <div style={{ color: 'var(--muted-foreground)' }}>
              {t('No notification channels registered')}
            </div>
          ) : (
            <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, 1fr) minmax(150px, 0.9fr) minmax(150px, 0.8fr) minmax(180px, 1fr) minmax(90px, 0.6fr) minmax(90px, 0.6fr) minmax(100px, 0.7fr) minmax(140px, 1fr)', gap: 12, padding: '12px 14px', background: 'var(--muted)', fontSize: 12, fontWeight: 700, color: 'var(--muted-foreground)' }}>
                <div>{t('Channel')}</div><div>{t('Status')}</div><div>{t('Enabled')}</div><div>{t('Groups')}</div><div>{t('Weight')}</div><div>{t('Cost')}</div><div>{t('Force send')}</div><div>{t('Class')}</div>
              </div>
              {channels.map((channel) => {
                const isConfigured = channel.configured !== false;
                const isEnabled = channel.enabled !== false;
                const isReady = Boolean(channel.ready);
                const hasChannelError = String(channel.status || '').toLowerCase() === 'error' || Boolean(channel.error);
                const channelError = channel.error || channel.readinessError || channel.configurationError || '';
                const status = hasChannelError
                  ? { color: '#dc2626', label: t('Error') }
                  : !isEnabled
                  ? { color: '#64748b', label: t('Disabled') }
                  : !isConfigured
                  ? { color: '#d97706', label: t('Not configured') }
                  : !isReady
                    ? { color: '#dc2626', label: t('Not ready to send') }
                    : { color: '#16a34a', label: t('Ready to send') };
                const adminPrefix = getBaseAdminPath();
                const href = channel.configUrl
                  ? (/^https?:\/\//i.test(channel.configUrl)
                      ? channel.configUrl
                      : channel.configUrl.startsWith(adminPrefix + '/')
                        ? channel.configUrl
                        : `${adminPrefix}${channel.configUrl.startsWith('/') ? '' : '/'}${channel.configUrl}`)
                  : null;
                const draft = channelDrafts[channel.type] || {};
                const numberCellStyle = {
                  ...inputStyle,
                  height: 34,
                  padding: '6px 8px',
                  borderRadius: 8,
                  fontSize: 12,
                };
                return (
                  <div key={channel.type} style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, 1fr) minmax(150px, 0.9fr) minmax(150px, 0.8fr) minmax(180px, 1fr) minmax(90px, 0.6fr) minmax(90px, 0.6fr) minmax(100px, 0.7fr) minmax(140px, 1fr)', gap: 12, padding: '12px 14px', borderTop: '1px solid var(--border)', background: 'var(--card)', alignItems: 'start' }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{channelNameWithAdapter(channel, t)}</div>
                    <div style={{ fontSize: 12, color: status.color, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontWeight: 600 }}>{status.label}</span>
                      {href && (
                        <a href={href} style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
                          {t('Configure')} →
                        </a>
                      )}
                      {channelError && (
                        <span style={{ color: '#dc2626' }}>{channelError}</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', minHeight: 34 }}>
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(checked) => updateChannelEnabled(channel, checked === true)}
                        disabled={actionLoading === `channel:${channel.type}`}
                        aria-label={`${t('Enabled')}: ${channel.type || '-'}`}
                      />
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{Array.isArray(channel.forGroupTo) ? channel.forGroupTo.join(', ') : '-'}</div>
                    <div>
                      <Input
                        type="number"
                        step="1"
                        value={draft.sortOrder ?? String(channel.sortOrder ?? '')}
                        onChange={(e) => updateChannelDraft(channel.type, 'sortOrder', e.target.value)}
                        onBlur={() => saveChannelNumber(channel, 'sortOrder')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.currentTarget.blur();
                          if (e.key === 'Escape') updateChannelDraft(channel.type, 'sortOrder', String(channel.sortOrder ?? ''));
                        }}
                        disabled={actionLoading === `channel:${channel.type}:sortOrder`}
                        style={numberCellStyle}
                      />
                    </div>
                    <div>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={draft.cost ?? String(channel.cost ?? '')}
                        onChange={(e) => updateChannelDraft(channel.type, 'cost', e.target.value)}
                        onBlur={() => saveChannelNumber(channel, 'cost')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.currentTarget.blur();
                          if (e.key === 'Escape') updateChannelDraft(channel.type, 'cost', String(channel.cost ?? ''));
                        }}
                        disabled={actionLoading === `channel:${channel.type}:cost`}
                        style={numberCellStyle}
                      />
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{String(Boolean(channel.forceSend))}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{channel.className || '-'}</div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Notifications list + detail */}
      {!isChannelsView && notificationSection === 'history' && (
        <div style={sectionStack}>
          <section style={panel}>
            <div style={panelHeader}>
              <div>
                <h2 style={sectionTitle}>{t('Notification history')}</h2>
                <p style={sectionDescription}>{t('Search sent notifications, check delivery status, and inspect details.')}</p>
              </div>
              <Button variant="outline" size="sm" onClick={loadItems} disabled={loadingList}>
                {loadingList ? t('Refreshing...') : t('Refresh')}
              </Button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'minmax(200px, 2fr) minmax(140px, 1fr) minmax(140px, 1fr)' }}>
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('Search by title, body, ID, order ID')} />
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
              {/* Order ID filter */}
              <div style={{ maxWidth: 300 }}>
                <Input
                  value={filterOrderId}
                  onChange={(e) => setFilterOrderId(e.target.value)}
                  placeholder={t('Filter by order ID')}
                />
              </div>
              {/* User / device filter */}
              <div style={{ position: 'relative', maxWidth: 420 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <Input
                      value={filterUserQuery}
                      onFocus={() => setShowFilterUserAutocomplete(true)}
                      onChange={(e) => { setFilterUserQuery(e.target.value); setFilterUser(null); setShowFilterUserAutocomplete(true); }}
                      onBlur={() => { window.setTimeout(() => setShowFilterUserAutocomplete(false), 150); }}
                      placeholder={t('Filter by user: name, phone, email, device ID')}
                    />
                    {showFilterUserAutocomplete && filterUserQuery.trim().length >= 2 && (
                      <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 12px 24px rgba(0,0,0,0.18)', maxHeight: 240, overflow: 'auto', zIndex: 20 }}>
                        {filterUserOptions.length === 0 ? (
                          <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--muted-foreground)' }}>{t('No users found')}</div>
                        ) : filterUserOptions.map((user) => (
                          <button key={`fu-${user.kind || 'user'}-${user.id}`} type="button"
                            onMouseDown={() => {
                              setFilterUser(user);
                              setFilterUserQuery(formatUserOption(user));
                              setShowFilterUserAutocomplete(false);
                            }}
                            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', border: 'none', borderTop: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)', cursor: 'pointer' }}>
                            <div style={{ fontSize: 13 }}>
                              {user.kind === 'cart' ? `🛒 ${t('Cart')} ${user.shortId || user.orderId || ''}`
                                : user.kind === 'device' ? `📱 ${t('Device')} ${user.name || user.deviceId || ''}`
                                : (user.name || user.login || user.id)}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{formatUserOption(user)}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {filterUser && (
                    <Button variant="outline" size="sm" onClick={() => { setFilterUser(null); setFilterUserQuery(''); setFilterUserOptions([]); }}>✕</Button>
                  )}
                </div>
                {filterUser && (
                  <div style={{ marginTop: 6, fontSize: 12, color: 'var(--muted-foreground)' }}>
                    {t('Filtered by')}: <strong style={{ color: 'var(--foreground)' }}>{formatUserOption(filterUser)}</strong>
                  </div>
                )}
              </div>
            </div>
          </section>

          <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'minmax(420px, 1.2fr) minmax(320px, 0.9fr)', alignItems: 'start' }}>

          {/* List */}
          <div style={{ border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', background: 'var(--card)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.8fr 0.7fr 1fr', gap: 12, padding: '14px 16px', background: 'var(--muted)', fontSize: 12, fontWeight: 700, color: 'var(--muted-foreground)' }}>
              <div>{t('User')}</div><div>{t('Status')}</div><div>{t('Group')}</div><div>{t('Created')}</div>
            </div>
            <div style={{ maxHeight: '60vh', overflow: 'auto' }}>
              {loadingList && items.length === 0 ? (
                <div style={{ padding: 20, color: 'var(--muted-foreground)' }}>{t('loading')}</div>
              ) : items.length === 0 ? (
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
            {/* Pagination */}
            {(total !== null && total > PAGE_SIZE) && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 16px', borderTop: '1px solid var(--border)', background: 'var(--muted)' }}>
                <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
                  {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} {t('of')} {total}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Button variant="outline" size="sm" onClick={() => goToPage(page - 1)} disabled={page === 0 || loadingList}>←</Button>
                  <Button variant="outline" size="sm" onClick={() => goToPage(page + 1)} disabled={(page + 1) * PAGE_SIZE >= total || loadingList}>→</Button>
                </div>
              </div>
            )}
            {(total !== null && total <= PAGE_SIZE && total > 0) && (
              <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border)', background: 'var(--muted)', fontSize: 12, color: 'var(--muted-foreground)' }}>
                {total} {t('notifications')}
              </div>
            )}
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
                  <div style={{ gridColumn: '1 / -1' }}><strong style={{ color: 'var(--foreground)' }}>{t('Requested channels')}:</strong> {Array.isArray(selectedNotification.requestedChannels) && selectedNotification.requestedChannels.length > 0 ? selectedNotification.requestedChannels.join(', ') : '—'}</div>
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

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
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
                  <CopyContextButton notification={selectedNotification} t={t} />
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
