import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { I18nProvider, useTranslation } from './i18n/I18nContext';
import { ConfirmDialog } from './components/ConfirmDialog';
import {
  styles, toast, notificationsApi as api, useIsMobile,
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
    ready: 'Ready',
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

// ─────────────────────────────── editor panel ───────────────────────────────
const EMPTY_DRAFT = {
  id: '', key: '', title: '', type: 'custom', url: '',
  enabled: false, concepts: [], defaultConcept: '', allowConceptSwitch: true,
  countries: '', platforms: '', providerModule: null,
};

function slugifyClient(value) {
  return String(value || '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64);
}

function ChannelEditor({ draft, setDraft, types, concepts, onSave, onCancel, saving, t }) {
  const isNew = !draft.id;
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
        <StatusBadge status={draft.enabled ? (draft.status || 'ready') : 'disabled'} t={t} />
      </div>

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
        </div>

        <div style={styles.field}>
          <Label style={styles.fieldLabel}>{t('Type')}</Label>
          <Select value={draft.type} onValueChange={(v) => setField('type', v)}>
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

      <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Switch checked={draft.enabled} onCheckedChange={(v) => setField('enabled', Boolean(v))} />
        <span style={styles.fieldLabel}>{t('Enabled (valid order source)')}</span>
      </label>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <Button variant="outline" onClick={onCancel} disabled={saving}>{t('Cancel')}</Button>
        <Button onClick={onSave} disabled={saving || !draft.title.trim()}>{saving ? t('Saving…') : t('Save channel')}</Button>
      </div>
    </section>
  );
}

// ─────────────────────────────── channel card ───────────────────────────────
function ChannelCard({ channel, onEdit, onToggle, onDelete, canManage, isMobile, t }) {
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
        <StatusBadge status={channel.enabled ? (channel.status || 'ready') : 'disabled'} t={t} />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {channel.concepts.length === 0
          ? <Badge variant="secondary">{t('All concepts')}</Badge>
          : channel.concepts.map((c) => <Badge key={c} variant="secondary">{c}</Badge>)}
        {channel.countries.map((c) => <Badge key={`co-${c}`} variant="outline">{c}</Badge>)}
        {channel.platforms.map((p) => <Badge key={`pl-${p}`} variant="outline">{p}</Badge>)}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap', rowGap: 12 }}>
        {canManage ? (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Switch checked={channel.enabled} onCheckedChange={(v) => onToggle(channel, Boolean(v))} />
            <span style={styles.help}>{channel.enabled ? t('Enabled') : t('Disabled')}</span>
          </label>
        ) : (
          <span style={styles.help}>{channel.enabled ? t('Enabled') : t('Disabled')}</span>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, minWidth: 0, ...cardActionsStyle }}>
          {canManage && channel.settingsUrl && <Button variant="outline" size="sm" style={cardActionButtonStyle} onClick={() => openSelf(channel.settingsUrl)}>{t('Settings')}</Button>}
          {channel.url && <Button variant="outline" size="sm" style={cardActionButtonStyle} onClick={() => window.open(channel.url, '_blank', 'noopener')}>{t('Open')}</Button>}
          {canManage && <Button variant="outline" size="sm" style={cardActionButtonStyle} onClick={() => onEdit(channel)}>{t('Edit')}</Button>}
          {canManage && <Button variant="ghost" size="sm" style={cardActionButtonStyle} onClick={() => onDelete(channel)}>{t('Delete')}</Button>}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────── recommended card ───────────────────────────────
function RecommendedCard({ typeDef, onAdd, canManage, t }) {
  return (
    <div style={{ ...styles.subsection, gap: 10 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <MaterialIcon name={typeDef.icon || 'storefront'} size={26} style={{ color: 'var(--muted-foreground)' }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700 }}>{typeDef.title}</div>
          <div style={styles.help}>{typeDef.installed ? t('Provider installed') : t('Provider not installed')}</div>
        </div>
      </div>
      {canManage && typeDef.installed && typeDef.settingsUrl ? (
        <Button variant="outline" size="sm" onClick={() => openSelf(typeDef.settingsUrl)}>
          <MaterialIcon name="settings" size={16} style={{ marginRight: 4 }} />{t('Settings')}
        </Button>
      ) : canManage ? (
        <Button variant="outline" size="sm" onClick={() => onAdd(typeDef)}>
          <MaterialIcon name="add" size={16} style={{ marginRight: 4 }} />{t('Add channel')}
        </Button>
      ) : null}
    </div>
  );
}

// ─────────────────────────────── main content ───────────────────────────────
function SalesChannelsManagerContent({ permissions = { canView: true, canManage: false } }) {
  const canManage = permissions.canManage === true;
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  const [channels, setChannels] = useState([]);
  const [types, setTypes] = useState([]);
  const [recommendations, setRecommendations] = useState({ country: null, results: [] });
  const [concepts, setConcepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

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
    if (!canManage) return;
    setDraft({
      ...EMPTY_DRAFT,
      type: typeDef?.type || 'custom',
      title: typeDef ? typeDef.title : '',
      key: typeDef ? slugifyClient(typeDef.title) : '',
      providerModule: typeDef?.providerModule || null,
      countries: recommendations.country || '',
    });
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startEdit = (channel) => {
    if (!canManage) return;
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
      setDraft(null);
      await loadChannels();
    } else {
      toast('error', res.payload?.error || t('Failed to save channel'));
    }
  };

  const toggleChannel = async (channel, enabled) => {
    if (!canManage) return;
    const res = await api('/core/sales-channel-toggle', { method: 'POST', body: JSON.stringify({ id: channel.id, enabled }) });
    if (res.ok) {
      setChannels((prev) => prev.map((c) => (c.id === channel.id ? res.payload.result : c)));
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

  const cardGrid = { display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 };

  return (
    <div style={styles.pageShell}>
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 24, lineHeight: '32px', fontWeight: 700, margin: 0 }}>{t('Sales Channels')}</h1>
          <p style={{ margin: '6px 0 0', color: 'var(--muted-foreground)', fontSize: 14, maxWidth: 720 }}>
            {t('Manage the entry points that can create orders — websites, bots, kiosks and more.')}
          </p>
        </div>
        {canManage && !draft && (
          <Button onClick={() => startCreate(null)}>
            <MaterialIcon name="add" size={18} style={{ marginRight: 6 }} />{t('Add custom channel')}
          </Button>
        )}
      </header>

      {draft && (
        <ChannelEditor
          draft={draft} setDraft={setDraft} types={types} concepts={concepts}
          onSave={saveDraft} onCancel={() => setDraft(null)} saving={saving} t={t}
        />
      )}

      {loading ? (
        <div style={styles.help}>{t('Loading…')}</div>
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
                <p style={styles.help}>{t('Create your first channel, or pick a recommended one below.')}</p>
              </div>
            ) : (
              <div style={cardGrid}>
                {channels.map((c) => (
                  <ChannelCard key={c.id} channel={c} onEdit={startEdit} onToggle={toggleChannel} onDelete={setPendingDelete} canManage={canManage} isMobile={isMobile} t={t} />
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
                {recommendedToShow.map((ty) => <RecommendedCard key={ty.type} typeDef={ty} onAdd={startCreate} canManage={canManage} t={t} />)}
              </div>
            </section>
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
