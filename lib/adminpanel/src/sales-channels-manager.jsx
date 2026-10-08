import React, { useEffect, useMemo, useState, useCallback } from 'react';
import slugifyLib from 'slugify';
import { I18nProvider, useTranslation } from './i18n/I18nContext';
import { ConfirmDialog } from './components/ConfirmDialog';
import {
  styles, toast, notificationsApi as api, useIsMobile, ModuleToaster,
} from './components/notifications/shared';

const {
  Button, Input, Label, Badge, Switch,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} = window.UIComponents;
const { MultiSelect } = window.JSComponents || {};

// ─────────────────────────────── status styling ───────────────────────────────
const STATUS_COLORS = {
  ready: '#16a34a',
  needs_setup: '#d97706',
  draft: '#64748b',
  disabled: '#64748b',
  error: '#dc2626',
};

function statusLabel(status, t) {
  const map = {
    ready: 'Working',
    needs_setup: 'Needs setup',
    draft: 'Draft',
    disabled: 'Disabled',
    error: 'Error',
  };
  return t(map[status] || status || '—');
}

// ─────────────────────────────── small UI atoms ───────────────────────────────
function StatusBadge({ status, t }) {
  const color = STATUS_COLORS[status] || '#64748b';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600,
      color, border: `1px solid ${color}`, borderRadius: 999, padding: '2px 10px',
    }}>
      <span style={{ width: 7, height: 7, borderRadius: 999, background: color }} />
      {statusLabel(status, t)}
    </span>
  );
}

function MaterialIcon({ name, size = 20, style }) {
  return <span className="material-icons" style={{ fontSize: size, lineHeight: 1, ...style }}>{name}</span>;
}

function openSelf(url) {
  if (!url) return;
  window.location.href = url;
}

function getBaseAdminPath() {
  if (typeof window !== 'undefined' && typeof window.routePrefix === 'string' && window.routePrefix.trim()) {
    return window.routePrefix.replace(/\/$/, '');
  }
  const parts = (window.location.pathname || '').split('/');
  return '/' + (parts[1] || 'admin');
}

// Module manager catalog: one exact module, or every module carrying a marketplace tag.
// Provider modules tag themselves "sales-channel" and "sales-channel:<type>" (package.json keywords).
function providerInstallUrl(appId) {
  return `${getBaseAdminPath()}/modules/catalog?appId=${encodeURIComponent(appId)}`;
}

function marketplaceTagUrl(tag) {
  return `${getBaseAdminPath()}/modules/catalog?tags=${encodeURIComponent(tag)}`;
}

function managerUrl(view) {
  return `${getBaseAdminPath()}/sales-channels-manager${view ? `?view=${view}` : ''}`;
}

function currentView() {
  if (typeof window === 'undefined') return 'main';
  return new URLSearchParams(window.location.search || '').get('view') === 'custom' ? 'custom' : 'main';
}

// A channel without a live provider never works: explain why and offer the install.
function ProviderMissingNotice({ channel, typeDef, canInstallProviders, t }) {
  const comingSoon = channel ? channel.typeComingSoon : !typeDef?.available;
  const appId = channel ? channel.marketplaceAppId : typeDef?.marketplaceAppId;
  const installed = channel ? channel.providerInstalled !== false : typeDef?.installed;
  let text;
  if (comingSoon) text = t('Channel type is coming soon');
  else if (!installed) text = `${t('Not working: provider is not installed')}${appId ? ` (${appId})` : ''}`;
  else text = t('Provider did not load: restart the server to finish installing it');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 12px', borderRadius: 10, border: '1px dashed var(--border)' }}>
      <span style={{ ...styles.help, color: comingSoon ? 'var(--muted-foreground)' : '#dc2626' }}>{text}</span>
      {!comingSoon && !installed && <span style={styles.help}>{t('Install the provider module to make this channel work.')}</span>}
      {!comingSoon && !installed && appId && canInstallProviders && (
        <div><Button variant="outline" size="sm" onClick={() => openSelf(providerInstallUrl(appId))}>
          <MaterialIcon name="download" size={16} style={{ marginRight: 4 }} />{t('Install provider')}
        </Button></div>
      )}
    </div>
  );
}

// ─────────────────────────────── editor panel ───────────────────────────────
const EMPTY_DRAFT = {
  id: '', key: '', title: '', type: 'custom', url: '',
  enabled: false, concepts: [], defaultConcept: '', allowConceptSwitch: true,
  countries: '', platforms: '', providerModule: null,
};

// Mirrors slugify() in src/controller/sales-channels-helpers.ts. `slugify` transliterates
// Cyrillic, so a Title of "Сайт" yields "sajt" instead of an empty key that the backend rejects.
function slugifyClient(value) {
  return slugifyLib(String(value || ''), { lower: true, strict: true, locale: 'en' })
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64);
}

function ChannelEditor({ draft, setDraft, types, concepts, onSave, onCancel, saving, error, t }) {
  const isNew = !draft.id;
  // A title in a script the slug charmap does not cover (CJK and the like) leaves the key
  // empty; saving it would come back as a 400, so the form asks for a key instead. The hint
  // waits for a title, otherwise a freshly opened empty form starts out complaining.
  const keyMissing = !String(draft.key || '').trim();
  const showKeyHint = keyMissing && Boolean(String(draft.title || '').trim());
  const [keyTouched, setKeyTouched] = useState(Boolean(draft.id));

  const setField = (field, value) => setDraft((prev) => ({ ...prev, [field]: value }));

  // Auto-derive the key from the title for new channels until the user edits it manually.
  const onTitleChange = (value) => {
    setDraft((prev) => ({
      ...prev,
      title: value,
      key: isNew && !keyTouched ? slugifyClient(value) : prev.key,
    }));
  };

  const typeOptions = useMemo(() => types.map((ty) => ({ label: ty.title, value: ty.type })), [types]);
  const conceptOptions = useMemo(() => concepts.map((c) => ({ label: c, value: c })), [concepts]);

  return (
    <section style={styles.panel}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h2 style={styles.subsectionTitle}>{isNew ? t('New sales channel') : t('Edit sales channel')}</h2>
        {!isNew && <StatusBadge status={draft.status || 'needs_setup'} t={t} />}
      </div>

      {error && (
        <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--destructive)', color: '#fff', opacity: 0.9 }}>
          {error}
        </div>
      )}

      <span style={styles.help}>
        {t('A sales channel is essentially a single backend client (a storefront, bot, kiosk, …). The same client can run on several platforms (web, PWA, native apps) — list those runtime platforms below instead of creating a separate channel for each.')}
      </span>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
        <div style={styles.field}>
          <Label style={styles.fieldLabel}>{t('Title')}</Label>
          <Input value={draft.title} onChange={(e) => onTitleChange(e.target.value)} placeholder={t('e.g. Main website')} />
        </div>

        <div style={styles.field}>
          <Label style={styles.fieldLabel}>{t('Channel key')}</Label>
          <Input
            value={draft.key}
            onChange={(e) => { setKeyTouched(true); setField('key', slugifyClient(e.target.value)); }}
            placeholder="web-main"
          />
          <span style={styles.help}>{t('Stable id written into the order source (orderedOnPlatform).')}</span>
          {showKeyHint && (
            <span style={{ ...styles.help, color: 'var(--destructive)' }}>{t('Channel key is required')}</span>
          )}
        </div>

        <div style={styles.field}>
          <Label style={styles.fieldLabel}>{t('Type')}</Label>
          {/* The type picks the provider: fixed once the channel exists. */}
          <Select value={draft.type} onValueChange={(v) => setField('type', v)} disabled={!isNew}>
            <SelectTrigger><SelectValue placeholder={t('Select type')} /></SelectTrigger>
            <SelectContent>
              {typeOptions.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div style={styles.field}>
          <Label style={styles.fieldLabel}>{t('URL / link')}</Label>
          <Input value={draft.url || ''} onChange={(e) => setField('url', e.target.value)} placeholder="https://…" />
        </div>

        <div style={styles.field}>
          <Label style={styles.fieldLabel}>{t('Countries (ISO, comma-separated)')}</Label>
          <Input value={draft.countries} onChange={(e) => setField('countries', e.target.value)} placeholder="VN, TH" />
        </div>

        <div style={styles.field}>
          <Label style={styles.fieldLabel}>{t('Platforms (comma-separated)')}</Label>
          <Input value={draft.platforms} onChange={(e) => setField('platforms', e.target.value)} placeholder="web, pwa-android, pwa-ios, app-ios" />
          <span style={styles.help}>{t('Runtime platform values (orderedOnPlatform) that report orders through this channel.')}</span>
        </div>
      </div>

      <div style={styles.subsection}>
        <h3 style={styles.subsectionTitle}>{t('Concept binding')}</h3>
        <span style={styles.help}>{t('Leave empty to allow all concepts. Otherwise this channel only writes the selected concepts.')}</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
          <div style={styles.field}>
            <Label style={styles.fieldLabel}>{t('Concepts')}</Label>
            {MultiSelect ? (
              <MultiSelect
                key={`concepts-${draft.id || 'new'}`}
                options={conceptOptions}
                defaultValue={draft.concepts}
                onValueChange={(v) => setField('concepts', v)}
                placeholder={t('All concepts')}
              />
            ) : <span style={styles.help}>MultiSelect unavailable</span>}
          </div>
          <div style={styles.field}>
            <Label style={styles.fieldLabel}>{t('Default concept')}</Label>
            <Select value={draft.defaultConcept || '__none__'} onValueChange={(v) => setField('defaultConcept', v === '__none__' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder={t('None')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t('None')}</SelectItem>
                {(draft.concepts.length ? draft.concepts : concepts).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Switch checked={draft.allowConceptSwitch} onCheckedChange={(v) => setField('allowConceptSwitch', Boolean(v))} />
          <span style={styles.fieldLabel}>{t('Allow concept switching on the frontend/bot')}</span>
        </label>
      </div>

      {isNew ? (
        <span style={styles.help}>{t('The channel is created switched off. Set it up with its provider, then enable it.')}</span>
      ) : (
        <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Switch checked={draft.enabled} onCheckedChange={(v) => setField('enabled', Boolean(v))} />
          <span style={styles.fieldLabel}>{t('Enabled (valid order source)')}</span>
        </label>
      )}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <Button variant="outline" onClick={onCancel} disabled={saving}>{t('Cancel')}</Button>
        <Button onClick={onSave} disabled={saving || !draft.title.trim() || keyMissing}>{saving ? t('Saving…') : t('Save channel')}</Button>
      </div>
    </section>
  );
}

// ─────────────────────────────── channel card ───────────────────────────────
function ChannelCard({ channel, onEdit, onToggle, onDelete, refusal, canManage, canInstallProviders, isMobile, t }) {
  // On mobile let the action buttons grow to fill the row so they don't overflow the card.
  const cardActionsStyle = isMobile ? { width: '100%' } : {};
  const cardActionButtonStyle = isMobile ? { flex: '1 1 auto', minWidth: 0 } : undefined;
  return (
    <div style={{ ...styles.subsection, gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 0 }}>
          <MaterialIcon name={channel.icon || 'storefront'} size={28} style={{ color: 'var(--muted-foreground)' }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{channel.title}</div>
            <div style={{ ...styles.help, ...styles.code }}>{channel.key} · {channel.typeTitle}</div>
          </div>
        </div>
        {/* Readiness (from the provider) and the switch (operator) are independent. */}
        <StatusBadge status={channel.status || 'draft'} t={t} />
      </div>

      {channel.statusMessage && channel.providerAlive && <span style={styles.help}>{channel.statusMessage}</span>}
      {!channel.providerAlive && <ProviderMissingNotice channel={channel} canInstallProviders={canInstallProviders} t={t} />}
      {refusal && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 12px', borderRadius: 10, border: '1px solid #d97706' }}>
          <span style={{ ...styles.help, color: '#d97706', fontWeight: 600 }}>{refusal.error}</span>
          {refusal.message && <span style={styles.help}>{refusal.message}</span>}
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {channel.concepts.length === 0
          ? <Badge variant="secondary">{t('All concepts')}</Badge>
          : channel.concepts.map((c) => <Badge key={c} variant="secondary">{c}</Badge>)}
        {channel.countries.map((c) => <Badge key={`co-${c}`} variant="outline">{c}</Badge>)}
        {channel.platforms.map((p) => <Badge key={`pl-${p}`} variant="outline">{p}</Badge>)}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap', rowGap: 12 }}>
        {canManage ? (
          // No live provider: shown off and locked, the stored flag is left as is.
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Switch
              checked={channel.providerAlive ? channel.enabled : false}
              disabled={!channel.providerAlive}
              onCheckedChange={(v) => onToggle(channel, Boolean(v))}
            />
            <span style={styles.help}>{channel.providerAlive && channel.enabled ? t('Enabled') : t('Disabled')}</span>
          </label>
        ) : (
          <span style={styles.help}>{channel.enabled ? t('Enabled') : t('Disabled')}</span>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, minWidth: 0, ...cardActionsStyle }}>
          {canManage && channel.settingsUrl && channel.status !== 'ready' && (
            <Button size="sm" style={cardActionButtonStyle} onClick={() => openSelf(channel.settingsUrl)}>{t('Set up')}</Button>
          )}
          {canManage && channel.settingsUrl && channel.status === 'ready' && (
            <Button variant="outline" size="sm" style={cardActionButtonStyle} onClick={() => openSelf(channel.settingsUrl)}>{t('Settings')}</Button>
          )}
          {channel.url && <Button variant="outline" size="sm" style={cardActionButtonStyle} onClick={() => window.open(channel.url, '_blank', 'noopener')}>{t('Open')}</Button>}
          {canManage && <Button variant="outline" size="sm" style={cardActionButtonStyle} onClick={() => onEdit(channel)}>{t('Edit')}</Button>}
          {/* A provider's channel is only switched off while its module is installed. */}
          {canManage && channel.canDelete && <Button variant="ghost" size="sm" style={cardActionButtonStyle} onClick={() => onDelete(channel)}>{t('Delete')}</Button>}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────── recommended / type card ───────────────────────────────
// What can be done with a channel type right now. Channels come from provider modules, so
// the main action is installing the provider from the marketplace; `onCreate` is passed only
// on the "Custom channel" screen.
function TypeActions({ typeDef, channelsOfType, onCreate, canManage, canInstallProviders, t }) {
  if (!canManage) return null;
  if (!typeDef.available) {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <Badge variant="secondary">{t('Coming soon')}</Badge>
        {typeDef.type !== 'custom' && typeDef.marketplaceTag && (
          <Button variant="outline" size="sm" onClick={() => openSelf(marketplaceTagUrl(typeDef.marketplaceTag))}>
            <MaterialIcon name="search" size={16} style={{ marginRight: 4 }} />{t('Search the marketplace')}
          </Button>
        )}
      </div>
    );
  }
  if (!typeDef.installed) {
    return canInstallProviders && typeDef.marketplaceAppId ? (
      <Button variant="outline" size="sm" onClick={() => openSelf(providerInstallUrl(typeDef.marketplaceAppId))}>
        <MaterialIcon name="download" size={16} style={{ marginRight: 4 }} />{t('Install from marketplace')}
      </Button>
    ) : <span style={styles.help}>{t('Provider not installed')}</span>;
  }
  if (!typeDef.alive) {
    return <span style={styles.help}>{t('Provider did not load: restart the server to finish installing it')}</span>;
  }
  if (onCreate) {
    if (typeDef.supportsMultipleInstances === false && channelsOfType > 0) {
      return <span style={styles.help}>{t('Only one channel of this type is allowed')}</span>;
    }
    return (
      <Button variant="outline" size="sm" onClick={() => onCreate(typeDef)}>
        <MaterialIcon name="add" size={16} style={{ marginRight: 4 }} />{t('Create channel')}
      </Button>
    );
  }
  return typeDef.settingsUrl ? (
    <Button variant="outline" size="sm" onClick={() => openSelf(typeDef.settingsUrl)}>
      <MaterialIcon name="settings" size={16} style={{ marginRight: 4 }} />{t('Settings')}
    </Button>
  ) : null;
}

function TypeCard({ typeDef, channelsOfType = 0, onCreate, canManage, canInstallProviders, t }) {
  const state = !typeDef.available ? null : !typeDef.installed ? t('Provider not installed') : t('Provider installed');
  return (
    <div style={{ ...styles.subsection, gap: 10 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <MaterialIcon name={typeDef.icon || 'storefront'} size={26} style={{ color: 'var(--muted-foreground)' }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700 }}>{typeDef.title}</div>
          {state && <div style={styles.help}>{state}</div>}
        </div>
      </div>
      <TypeActions
        typeDef={typeDef} channelsOfType={channelsOfType} onCreate={onCreate}
        canManage={canManage} canInstallProviders={canInstallProviders} t={t}
      />
    </div>
  );
}

// ─────────────────────────────── main content ───────────────────────────────
function SalesChannelsManagerContent({ permissions = { canView: true, canManage: false } }) {
  const canManage = permissions.canManage === true;
  const canInstallProviders = permissions.canInstallProviders === true;
  // "Custom channel" lives on its own screen (?view=custom), away from the main one.
  const view = currentView();
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  const [channels, setChannels] = useState([]);
  const [types, setTypes] = useState([]);
  const [recommendations, setRecommendations] = useState({ country: null, results: [] });
  const [concepts, setConcepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  // Toasts need a mounted <Toaster/>; a rejected save has to stay visible in the form either way.
  const [saveError, setSaveError] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  // A refused switch-on ("Finish setup first") stays on its card until the next toggle.
  const [toggleRefusal, setToggleRefusal] = useState(null);

  const loadChannels = useCallback(async () => {
    const res = await api('/core/sales-channels');
    if (res.ok) setChannels(res.payload.results || []);
    else toast('error', res.payload?.error || t('Failed to load channels'));
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [ch, ty, rec, co] = await Promise.all([
        api('/core/sales-channels'),
        api('/core/sales-channels/types'),
        api('/core/sales-channels/recommendations'),
        api('/core/sales-channels/concepts'),
      ]);
      if (cancelled) return;
      if (ch.ok) setChannels(ch.payload.results || []);
      if (ty.ok) setTypes(ty.payload.results || []);
      if (rec.ok) setRecommendations(rec.payload || { country: null, results: [] });
      if (co.ok) setConcepts(co.payload.results || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const startCreate = (typeDef) => {
    if (!canManage || !typeDef) return;
    setSaveError(null);
    setDraft({
      ...EMPTY_DRAFT,
      type: typeDef.type,
      title: typeDef.title,
      key: slugifyClient(typeDef.title),
      providerModule: typeDef.providerModule || null,
      countries: recommendations.country || '',
    });
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startEdit = (channel) => {
    if (!canManage) return;
    setSaveError(null);
    setDraft({
      id: channel.id,
      key: channel.key,
      title: channel.title,
      type: channel.type,
      url: channel.url || '',
      enabled: channel.enabled,
      status: channel.status,
      concepts: channel.concepts || [],
      defaultConcept: channel.defaultConcept || '',
      allowConceptSwitch: channel.allowConceptSwitch !== false,
      countries: (channel.countries || []).join(', '),
      platforms: (channel.platforms || []).join(', '),
      providerModule: channel.providerModule || null,
    });
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveDraft = async () => {
    if (!canManage || !draft) return;
    setSaving(true);
    setSaveError(null);
    const body = {
      id: draft.id || undefined,
      key: draft.key,
      title: draft.title,
      type: draft.type,
      url: draft.url,
      enabled: draft.enabled,
      concepts: draft.concepts,
      defaultConcept: draft.defaultConcept,
      allowConceptSwitch: draft.allowConceptSwitch,
      providerModule: draft.providerModule,
      countries: String(draft.countries || '').split(',').map((x) => x.trim().toUpperCase()).filter(Boolean),
      platforms: String(draft.platforms || '').split(',').map((x) => x.trim()).filter(Boolean),
    };
    const res = await api('/core/sales-channel', { method: 'POST', body: JSON.stringify(body) });
    setSaving(false);
    if (res.ok) {
      toast('success', t('Sales channel saved'));
      // A channel created on the "Custom channel" screen is managed from the main one.
      if (!draft.id && view === 'custom') {
        openSelf(managerUrl());
        return;
      }
      setDraft(null);
      await loadChannels();
    } else {
      const message = res.payload?.error || t('Failed to save channel');
      setSaveError(message);
      toast('error', message);
    }
  };

  const toggleChannel = async (channel, enabled) => {
    if (!canManage) return;
    setToggleRefusal(null);
    const res = await api('/core/sales-channel-toggle', { method: 'POST', body: JSON.stringify({ id: channel.id, enabled }) });
    if (res.ok) {
      setChannels((prev) => prev.map((c) => (c.id === channel.id ? res.payload.result : c)));
    } else if (res.status === 409) {
      // Not ready yet: the switch stays off, the card says why and offers "Set up".
      setToggleRefusal({ id: channel.id, error: res.payload?.error || t('Finish setup first'), message: res.payload?.message || null });
    } else {
      toast('error', res.payload?.error || t('Failed to update channel'));
    }
  };

  const confirmDelete = async () => {
    if (!canManage || !pendingDelete) return;
    const res = await api('/core/sales-channel-delete', { method: 'POST', body: JSON.stringify({ id: pendingDelete.id }) });
    if (res.ok) {
      toast('success', t('Sales channel deleted'));
      setChannels((prev) => prev.filter((c) => c.id !== pendingDelete.id));
    } else {
      toast('error', res.payload?.error || t('Failed to delete channel'));
    }
    setPendingDelete(null);
  };

  // Recommended types not already present as an installed channel of that type.
  const recommendedToShow = useMemo(() => {
    const existingTypes = new Set(channels.map((c) => c.type));
    return (recommendations.results || []).filter((ty) => !existingTypes.has(ty.type));
  }, [recommendations, channels]);

  const channelsPerType = useMemo(() => {
    const counts = {};
    for (const c of channels) counts[c.type] = (counts[c.type] || 0) + 1;
    return counts;
  }, [channels]);

  // Only types a channel can be created for right now feed the editor's type list.
  const creatableTypes = useMemo(
    () => types.filter((ty) => ty.available && ty.alive && !(ty.supportsMultipleInstances === false && channelsPerType[ty.type] > 0)),
    [types, channelsPerType]
  );

  const cardGrid = { display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 };

  return (
    <div style={styles.pageShell}>
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 24, lineHeight: '32px', fontWeight: 700, margin: 0 }}>
            {view === 'custom' ? t('Custom channel') : t('Sales Channels')}
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--muted-foreground)', fontSize: 14, maxWidth: 720 }}>
            {view === 'custom'
              ? t('Create another channel of a type whose provider module is installed, e.g. a second bot for another concept or a test bot. The provider sets each channel up separately.')
              : t('Manage the entry points that can create orders — websites, bots, kiosks and more.')}
          </p>
        </div>
        {view === 'custom' ? (
          <Button variant="outline" onClick={() => openSelf(managerUrl())}>
            <MaterialIcon name="arrow_back" size={18} style={{ marginRight: 6 }} />{t('Back to sales channels')}
          </Button>
        ) : canManage && canInstallProviders && (
          <Button variant="outline" onClick={() => openSelf(marketplaceTagUrl('sales-channel'))}>
            <MaterialIcon name="storefront" size={18} style={{ marginRight: 6 }} />{t('All sales channels in marketplace')}
          </Button>
        )}
      </header>

      {draft && (
        <ChannelEditor
          draft={draft} setDraft={setDraft}
          types={draft.id ? types.filter((ty) => ty.type === draft.type) : creatableTypes}
          concepts={concepts}
          onSave={saveDraft} onCancel={() => { setSaveError(null); setDraft(null); }}
          saving={saving} error={saveError} t={t}
        />
      )}

      {loading ? (
        <div style={styles.help}>{t('Loading…')}</div>
      ) : view === 'custom' ? (
        <section style={styles.panel}>
          <div>
            <h2 style={styles.sectionTitle}>{t('Channel types')}</h2>
            <p style={styles.sectionDescription}>{t('A channel can be created only for a type whose provider module is installed and running.')}</p>
          </div>
          <div style={cardGrid}>
            {types.map((ty) => (
              <TypeCard
                key={ty.type} typeDef={ty} channelsOfType={channelsPerType[ty.type] || 0} onCreate={startCreate}
                canManage={canManage} canInstallProviders={canInstallProviders} t={t}
              />
            ))}
          </div>
        </section>
      ) : (
        <>
          <section style={styles.panel}>
            <div>
              <h2 style={styles.sectionTitle}>{t('Your sales channels')}</h2>
              <p style={styles.sectionDescription}>{t('Configured channels. Only enabled channels are valid order sources.')}</p>
            </div>
            {channels.length === 0 ? (
              <div style={{ ...styles.subsection, alignItems: 'center', textAlign: 'center', padding: 32 }}>
                <MaterialIcon name="storefront" size={40} style={{ color: 'var(--muted-foreground)' }} />
                <div style={{ fontWeight: 700, fontSize: 16 }}>{t('No sales channels yet')}</div>
                <p style={styles.help}>{t('Channels appear when you install their provider module from the marketplace — pick a recommended one below.')}</p>
              </div>
            ) : (
              <div style={cardGrid}>
                {channels.map((c) => (
                  <ChannelCard
                    key={c.id} channel={c} onEdit={startEdit} onToggle={toggleChannel} onDelete={setPendingDelete}
                    refusal={toggleRefusal && toggleRefusal.id === c.id ? toggleRefusal : null}
                    canManage={canManage} canInstallProviders={canInstallProviders} isMobile={isMobile} t={t}
                  />
                ))}
              </div>
            )}
          </section>

          {recommendedToShow.length > 0 && (
            <section style={styles.panel}>
              <div>
                <h2 style={styles.sectionTitle}>
                  {recommendations.country
                    ? t('Recommended for {country}').replace('{country}', recommendations.country)
                    : t('Recommended channels')}
                </h2>
                <p style={styles.sectionDescription}>{t('Suggestions based on your project country. These are hints — you can install any channel.')}</p>
              </div>
              <div style={cardGrid}>
                {recommendedToShow.map((ty) => (
                  <TypeCard key={ty.type} typeDef={ty} canManage={canManage} canInstallProviders={canInstallProviders} t={t} />
                ))}
              </div>
            </section>
          )}

          {canManage && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Button variant="ghost" size="sm" onClick={() => openSelf(managerUrl('custom'))}>{t('Custom channel')}</Button>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title={t('Delete sales channel')}
        message={pendingDelete ? t('Delete “{title}”? Existing orders keep their source for reports.').replace('{title}', pendingDelete.title) : ''}
        confirmText={t('Delete')}
      />
    </div>
  );
}

export default function SalesChannelsManager(props) {
  const permissions = props.permissions || { canView: true, canManage: props.canManage === true };
  return (
    <I18nProvider initialLocale={props.locale} messages={props.messages}>
      <ModuleToaster />
      <SalesChannelsManagerContent permissions={permissions} />
    </I18nProvider>
  );
}

if (typeof window !== 'undefined') {
  window.SalesChannelsManager = window.SalesChannelsManager || {};
  window.SalesChannelsManager.Component = SalesChannelsManager;
  window.SalesChannelsManager.mount = (el = null) => {
    try {
      const target = el || document.getElementById('sales-channels-manager-root') || (() => {
        const div = document.createElement('div');
        div.id = 'sales-channels-manager-root';
        (document.querySelector('#app') || document.body).appendChild(div);
        return div;
      })();
      if (window.ReactDOM && window.ReactDOM.render) {
        window.ReactDOM.render(React.createElement(SalesChannelsManager), target);
      } else if (window.ReactDOM && window.ReactDOM.hydrateRoot) {
        window.ReactDOM.hydrateRoot(target, React.createElement(SalesChannelsManager));
      }
    } catch (mountError) {
      void mountError;
    }
  };
}
