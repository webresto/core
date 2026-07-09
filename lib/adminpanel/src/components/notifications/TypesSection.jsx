import React, { useMemo, useState } from 'react';
import { styles, toast, TYPE_KEY_REGEX, useIsMobile } from './shared';
import { ConfirmDialog } from '../ConfirmDialog';
import TemplatesTab from './TemplatesTab';
import SendTestPanel from './SendTestPanel';
import EventsSection from './EventsSection';

const {
  Button, Input, Textarea, Label, Badge, Switch,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator,
} = window.UIComponents;
const { MultiSelect } = window.JSComponents || {};

const DETAIL_TABS = [
  { id: 'general', label: 'General' },
  { id: 'delivery', label: 'Delivery Rules' },
  { id: 'templates', label: 'Templates' },
  { id: 'logs', label: 'Logs & Test' },
];

function blankType(eventKey) {
  return {
    key: '', name: '', description: '', eventKey: eventKey || '',
    enabled: false, priority: 'normal', sendDelaySec: 0, important: false,
    maxDeliveryCost: 0, useGlobalFallback: false,
    channelsMode: 'waterfall', escalateBy: 'read', fixedChannels: [], defaultChannels: [],
    templates: { default: {}, locales: {}, channels: {} },
  };
}

function validateType(draft, t) {
  const errors = [];
  const key = String(draft.key || '').trim();
  if (!key) errors.push(t('Key is required'));
  else if (!TYPE_KEY_REGEX.test(key)) errors.push(t('Key must be snake_case (lowercase, digits, underscores)'));
  if (!String(draft.eventKey || '').trim()) errors.push(t('Event is required'));
  const delay = Number(draft.sendDelaySec);
  if (!Number.isFinite(delay) || delay < 0 || !Number.isInteger(delay)) errors.push(t('Send delay must be a non-negative integer'));
  if (!draft.useGlobalFallback && draft.maxDeliveryCost != null && draft.maxDeliveryCost !== '') {
    const c = Number(draft.maxDeliveryCost);
    if (!Number.isFinite(c) || c < 0) errors.push(t('Delivery budget must be a non-negative number'));
  }
  if (draft.channelsMode === 'fixed' && (!Array.isArray(draft.fixedChannels) || draft.fixedChannels.length === 0)) {
    errors.push(t('Fixed mode requires at least one channel'));
  }
  return errors;
}

function budgetSummary(typeItem, t) {
  if (typeItem.useGlobalFallback) return t('global');
  if (typeItem.maxDeliveryCost == null) return t('one paid');
  return `${typeItem.maxDeliveryCost}`;
}

export default function TypesSection({
  t, language, notificationsApi, types, events, channels, locales, defaultLocale,
  onChanged, canManage = false,
}) {
  const isMobile = useIsMobile();
  const typeList = Array.isArray(types) ? types : [];
  const eventList = Array.isArray(events) ? events : [];

  const [selectedKey, setSelectedKey] = useState('');
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState(null);
  const [baseline, setBaseline] = useState('');
  const [detailTab, setDetailTab] = useState('general');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [eventFilter, setEventFilter] = useState('all');

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pendingSelect, setPendingSelect] = useState(undefined); // undefined=none, null=create, string=key
  const [pendingEventCreate, setPendingEventCreate] = useState(undefined);
  const [showEventsCatalog, setShowEventsCatalog] = useState(false);

  const dirty = useMemo(() => (draft ? JSON.stringify(draft) !== baseline : false), [draft, baseline]);

  const beginEdit = (typeItem) => {
    const clone = JSON.parse(JSON.stringify(typeItem));
    if (!clone.templates) clone.templates = { default: {}, locales: {}, channels: {} };
    setDraft(clone);
    setBaseline(JSON.stringify(clone));
    setCreating(false);
    setSelectedKey(typeItem.key);
    setErrors([]);
    setDetailTab('general');
  };

  const beginCreate = (eventKey) => {
    if (!canManage) return;
    const clone = blankType(eventKey);
    setDraft(clone);
    setBaseline(JSON.stringify(clone));
    setCreating(true);
    setSelectedKey('');
    setErrors([]);
    setDetailTab('general');
  };

  const addTypeForEvent = (eventKey) => {
    if (dirty) {
      setPendingEventCreate(eventKey || '');
      return;
    }
    beginCreate(eventKey || '');
    setShowEventsCatalog(false);
  };

  const resolvePendingEventCreate = (proceed) => {
    const eventKey = pendingEventCreate;
    setPendingEventCreate(undefined);
    if (!proceed) return;
    beginCreate(eventKey || '');
    setShowEventsCatalog(false);
  };

  const guardedSelect = (target) => {
    if (dirty) { setPendingSelect(target === null ? null : target); return; }
    if (target === null) beginCreate('');
    else { const ti = typeList.find((x) => x.key === target); if (ti) beginEdit(ti); }
  };

  const resolvePendingSelect = (proceed) => {
    const target = pendingSelect;
    setPendingSelect(undefined);
    if (!proceed) return;
    if (target === null) beginCreate('');
    else { const ti = typeList.find((x) => x.key === target); if (ti) beginEdit(ti); }
  };

  const updateDraft = (next) => setDraft(next);
  const setField = (field, value) => setDraft((d) => ({ ...d, [field]: value }));

  const save = async () => {
    if (!canManage || !draft) return;
    const validation = validateType(draft, t);
    if (validation.length > 0) { setErrors(validation); toast('error', validation[0]); return; }
    setSaving(true);
    setErrors([]);
    try {
      const payload = { ...draft };
      if (payload.useGlobalFallback) payload.maxDeliveryCost = null;
      else payload.maxDeliveryCost = payload.maxDeliveryCost === '' || payload.maxDeliveryCost == null ? null : Number(payload.maxDeliveryCost);
      payload.sendDelaySec = Number(payload.sendDelaySec) || 0;
      payload.escalateBy = payload.escalateBy === 'delivered' ? 'delivered' : 'read';
      const response = await notificationsApi('/core/notifications-manager/type', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!response.ok || response.payload?.success === false) {
        const errs = Array.isArray(response.payload?.errors) ? response.payload.errors : [response.payload?.error || t('Save failed')];
        setErrors(errs);
        toast('error', errs[0]);
        return;
      }
      const saved = response.payload?.type || payload;
      toast('success', t('Notification type saved'));
      setBaseline(JSON.stringify(draft));
      setCreating(false);
      setSelectedKey(saved.key);
      if (onChanged) await onChanged();
    } catch (e) {
      setErrors([String(e?.message || e)]);
      toast('error', String(e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    if (creating) { setDraft(null); setSelectedKey(''); return; }
    const ti = typeList.find((x) => x.key === selectedKey);
    if (ti) beginEdit(ti);
  };

  const doDelete = async () => {
    if (!canManage || !selectedKey) return;
    setSaving(true);
    try {
      const response = await notificationsApi('/core/notifications-manager/type-delete', {
        method: 'POST', body: JSON.stringify({ key: selectedKey }),
      });
      if (!response.ok || response.payload?.success === false) throw new Error(response.payload?.error || t('Delete failed'));
      toast('success', t('Notification type deleted'));
      setDraft(null); setSelectedKey('');
      if (onChanged) await onChanged();
    } catch (e) {
      toast('error', String(e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  const duplicate = () => {
    if (!canManage || !draft) return;
    const clone = JSON.parse(JSON.stringify(draft));
    clone.key = `${clone.key}_copy`;
    clone.enabled = false;
    setDraft(clone);
    setBaseline(JSON.stringify(blankType())); // force dirty
    setCreating(true);
    setSelectedKey('');
    setDetailTab('general');
  };

  const toggleEnabled = () => {
    if (!canManage) return;
    setField('enabled', !draft.enabled);
  };

  // ── Filtering + sorting of the list (enabled first, then name) ──
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = typeList.filter((ti) => {
      if (q && ![ti.key, ti.name, ti.eventKey].some((v) => String(v || '').toLowerCase().includes(q))) return false;
      if (statusFilter === 'enabled' && !ti.enabled) return false;
      if (statusFilter === 'disabled' && ti.enabled) return false;
      if (priorityFilter !== 'all' && (ti.priority || 'normal') !== priorityFilter) return false;
      if (eventFilter !== 'all' && ti.eventKey !== eventFilter) return false;
      return true;
    });
    list = list.slice().sort((a, b) => {
      if (Boolean(a.enabled) !== Boolean(b.enabled)) return a.enabled ? -1 : 1;
      return String(a.name || a.key).localeCompare(String(b.name || b.key));
    });
    return list;
  }, [typeList, search, statusFilter, priorityFilter, eventFilter]);

  const selectedEvent = useMemo(() => eventList.find((e) => e.key === draft?.eventKey) || null, [eventList, draft]);
  const channelOptions = useMemo(
    () => (Array.isArray(channels) ? channels : []).map((c) => ({
      label: `${c.type}${typeof c.cost === 'number' ? ` · ${c.cost}` : ''}`,
      value: String(c.type),
    })).filter((o) => o.value),
    [channels],
  );

  const segBtn = (active) => ({
    padding: '8px 12px', borderRadius: 9, border: active ? '1px solid var(--primary)' : '1px solid var(--border)',
    background: active ? 'var(--accent)' : 'var(--card)', color: 'var(--foreground)', cursor: 'pointer', fontSize: 13, fontWeight: 700,
  });

  if (showEventsCatalog) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <section style={{ ...styles.panel, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h2 style={styles.sectionTitle}>{t('Events')}</h2>
            <p style={styles.sectionDescription}>{t('Read-only catalog of business triggers. Registered in code; bind notification types to them.')}</p>
          </div>
          <Button type="button" variant="outline" onClick={() => setShowEventsCatalog(false)}>
            {t('Back to settings')}
          </Button>
        </section>
        <EventsSection
          t={t}
          events={eventList}
          types={typeList}
          onAddTypeForEvent={canManage ? addTypeForEvent : undefined}
        />
        <ConfirmDialog
          isOpen={pendingEventCreate !== undefined}
          onClose={() => resolvePendingEventCreate(false)}
          onConfirm={() => resolvePendingEventCreate(true)}
          title={t('Discard unsaved changes?')}
          message={t('You have unsaved changes that will be lost.')}
          confirmText={t('Discard')}
          cancelText={t('Cancel')}
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: isMobile ? 16 : 24, gridTemplateColumns: isMobile ? '1fr' : 'minmax(320px, 360px) minmax(420px, 1fr)', alignItems: 'start' }}>
      {/* ── Left panel: filters + list ── */}
      <section style={styles.panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <h2 style={styles.sectionTitle}>{t('Types')}</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button type="button" size="sm" variant="outline" onClick={() => setShowEventsCatalog(true)}>{t('Events')}</Button>
            {canManage && <Button type="button" size="sm" onClick={() => guardedSelect(null)}>+ {t('Add Type')}</Button>}
          </div>
        </div>
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('Search by key, name, event')} />
        <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr' }}>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('All statuses')}</SelectItem>
              <SelectItem value="enabled">{t('Enabled')}</SelectItem>
              <SelectItem value="disabled">{t('Disabled')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('All priorities')}</SelectItem>
              <SelectItem value="normal">{t('Normal')}</SelectItem>
              <SelectItem value="high">{t('High')}</SelectItem>
              <SelectItem value="critical">{t('Critical')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Select value={eventFilter} onValueChange={setEventFilter}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('All events')}</SelectItem>
            {eventList.map((e) => <SelectItem key={e.key} value={e.key}>{e.name || e.key}</SelectItem>)}
          </SelectContent>
        </Select>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '64vh', overflow: 'auto' }}>
          {filtered.length === 0 ? (
            <div style={styles.help}>{typeList.length === 0 ? t('Create first notification type') : t('No types match the filters')}</div>
          ) : filtered.map((ti) => {
            const active = ti.key === selectedKey;
            const isUnsaved = active && dirty;
            return (
              <button key={ti.key} type="button" onClick={() => guardedSelect(ti.key)}
                style={{
                  textAlign: 'left', border: active ? '1px solid var(--primary)' : '1px solid var(--border)',
                  borderRadius: 12, padding: 12, background: active ? 'var(--accent)' : 'var(--card)', color: 'var(--foreground)', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', gap: 6,
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                  <strong style={{ fontSize: 14 }}>{ti.name || ti.key}</strong>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {isUnsaved && <Badge variant="outline">{t('Unsaved')}</Badge>}
                    <Badge variant={ti.enabled ? 'secondary' : 'outline'}>{ti.enabled ? t('Enabled') : t('Disabled')}</Badge>
                  </div>
                </div>
                <code style={{ ...styles.code, fontSize: 12, color: 'var(--muted-foreground)' }}>{ti.key}</code>
                <div style={{ ...styles.help, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span>→ {ti.eventKey}</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{ti.channelsMode || 'waterfall'}</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{t('escalate by')}: {ti.escalateBy === 'delivered' ? t('delivered') : t('read')}</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{t('budget')}: {budgetSummary(ti, t)}</span>
                  {ti.sendDelaySec > 0 && <span style={{ fontVariantNumeric: 'tabular-nums' }}>{t('delay')}: {ti.sendDelaySec}s</span>}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Right panel: detail ── */}
      <section style={styles.panel}>
        {!draft ? (
          <div style={styles.help}>{t('Select a type or create a new one.')}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Sticky header */}
            <div style={{ position: 'sticky', top: 0, zIndex: 2, background: 'var(--card)', display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem><BreadcrumbLink>{t('Notifications')}</BreadcrumbLink></BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem><BreadcrumbLink>{t('Settings')}</BreadcrumbLink></BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem><BreadcrumbPage>{creating ? t('New type') : (draft.name || draft.key)}</BreadcrumbPage></BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Badge variant={draft.enabled ? 'secondary' : 'outline'}>{draft.enabled ? t('Enabled') : t('Disabled')}</Badge>
                  <Badge variant="outline">{draft.priority || 'normal'}</Badge>
                  {draft.eventKey && <Badge variant="outline">→ {draft.eventKey}</Badge>}
                  {dirty && <Badge variant="outline">{t('Unsaved')}</Badge>}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {canManage && <Button type="button" onClick={save} disabled={saving || !dirty}>{saving ? t('Saving...') : t('Save')}</Button>}
                  {canManage && <Button type="button" variant="outline" onClick={discard} disabled={saving || !dirty}>{t('Discard')}</Button>}
                  {canManage && DropdownMenu && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button type="button" variant="outline">⋯</Button></DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={duplicate}>{t('Duplicate')}</DropdownMenuItem>
                        <DropdownMenuItem onClick={toggleEnabled}>{draft.enabled ? t('Disable') : t('Enable')}</DropdownMenuItem>
                        {!creating && <DropdownMenuItem onClick={() => setConfirmDelete(true)}>{t('Delete')}</DropdownMenuItem>}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
              {errors.length > 0 && (
                <div style={{ ...styles.help, color: 'var(--destructive)' }}>{errors.join('; ')}</div>
              )}
              {/* Detail tabs */}
              <div style={{ display: 'inline-flex', gap: 4 }}>
                {DETAIL_TABS.map((tab) => (
                  <button key={tab.id} type="button" onClick={() => setDetailTab(tab.id)} style={segBtn(detailTab === tab.id)}>
                    {t(tab.label)}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab content */}
            {detailTab === 'general' && (
              <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px,100%),1fr))' }}>
                <div style={styles.field}>
                  <Label style={styles.fieldLabel}>{t('Name')}</Label>
                  <Input value={draft.name || ''} onChange={(e) => setField('name', e.target.value)} disabled={!canManage} />
                </div>
                <div style={styles.field}>
                  <Label style={styles.fieldLabel}>{t('Key')}</Label>
                  <Input value={draft.key || ''} onChange={(e) => setField('key', e.target.value)} disabled={!canManage || !creating} style={styles.code} placeholder="snake_case" />
                  <span style={styles.help}>{creating ? t('Lowercase, digits, underscores. Read-only after creation.') : t('Read-only after creation.')}</span>
                </div>
                <div style={{ ...styles.field, gridColumn: '1 / -1' }}>
                  <Label style={styles.fieldLabel}>{t('Description')}</Label>
                  <Textarea value={draft.description || ''} onChange={(e) => setField('description', e.target.value)} rows={2} disabled={!canManage} />
                </div>
                <div style={styles.field}>
                  <Label style={styles.fieldLabel}>{t('Event')}</Label>
                  <Select value={draft.eventKey || ''} onValueChange={(v) => setField('eventKey', v)}>
                    <SelectTrigger><SelectValue placeholder={t('Select event')} /></SelectTrigger>
                    <SelectContent>
                      {eventList.map((e) => <SelectItem key={e.key} value={e.key}>{e.name || e.key}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {selectedEvent && (
                    <span style={styles.help}>
                      {selectedEvent.description}
                      {Array.isArray(selectedEvent.contextKeys) && selectedEvent.contextKeys.length > 0 && ` · ${t('context')}: ${selectedEvent.contextKeys.join(', ')}`}
                    </span>
                  )}
                </div>
                <div style={styles.field}>
                  <Label style={styles.fieldLabel}>{t('Priority')}</Label>
                  <Select value={draft.priority || 'normal'} onValueChange={(v) => setField('priority', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">{t('Normal')}</SelectItem>
                      <SelectItem value="high">{t('High')}</SelectItem>
                      <SelectItem value="critical">{t('Critical')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <span style={styles.help}>{t('Informational only; does not affect delivery.')}</span>
                </div>
                <div style={{ ...styles.field, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div><Label style={styles.fieldLabel}>{t('Enabled')}</Label><div style={styles.help}>{t('Registration ≠ sending; sends only when on.')}</div></div>
                  <Switch checked={Boolean(draft.enabled)} onCheckedChange={(v) => setField('enabled', v === true)} />
                </div>
                <div style={{ ...styles.field, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div><Label style={styles.fieldLabel}>{t('Important')}</Label><div style={styles.help}>{t('Ignores the waterfall channel limit (OTP, incidents).')}</div></div>
                  <Switch checked={Boolean(draft.important)} onCheckedChange={(v) => setField('important', v === true)} />
                </div>
                <div style={styles.field}>
                  <Label style={styles.fieldLabel}>{t('Send delay (sec)')}</Label>
                  <Input type="number" min="0" step="1" value={draft.sendDelaySec ?? 0} onChange={(e) => setField('sendDelaySec', e.target.value === '' ? 0 : Number(e.target.value))} />
                  <span style={styles.help}>{t('Delay of the first send. 0 = immediately.')}</span>
                </div>
              </div>
            )}

            {detailTab === 'delivery' && (
              <div style={{ display: 'grid', gap: 16 }}>
                <section style={styles.subsection}>
                  <h3 style={styles.subsectionTitle}>{t('Cost Budget')}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div><Label style={styles.fieldLabel}>{t('Use global fallback')}</Label><div style={styles.help}>{t('Budget comes from NOTIFICATION_MAX_COST_PER_MESSAGE.')}</div></div>
                    <Switch checked={Boolean(draft.useGlobalFallback)} onCheckedChange={(v) => setField('useGlobalFallback', v === true)} />
                  </div>
                  <div style={styles.field}>
                    <Label style={styles.fieldLabel}>{t('Max delivery cost')}</Label>
                    <Input type="number" min="0" step="0.01" disabled={Boolean(draft.useGlobalFallback)}
                      value={draft.maxDeliveryCost ?? ''} onChange={(e) => setField('maxDeliveryCost', e.target.value)} />
                    <span style={styles.help}>{t('Free channels (cost=0) are always allowed. If unset and global is empty — only one paid channel per delivery.')}</span>
                  </div>
                </section>

                <section style={styles.subsection}>
                  <h3 style={styles.subsectionTitle}>{t('Channels Strategy')}</h3>
                  <div style={{ display: 'inline-flex', gap: 6 }}>
                    <button type="button" style={segBtn(draft.channelsMode !== 'fixed')} onClick={() => setField('channelsMode', 'waterfall')}>{t('Waterfall')}</button>
                    <button type="button" style={segBtn(draft.channelsMode === 'fixed')} onClick={() => setField('channelsMode', 'fixed')}>{t('Fixed channels only')}</button>
                  </div>
                  <div style={styles.field}>
                    <Label style={styles.fieldLabel}>{draft.channelsMode === 'fixed' ? t('Fixed channels') : t('Default channels')}</Label>
                    {MultiSelect ? (
                      <MultiSelect
                        options={channelOptions}
                        defaultValue={draft.channelsMode === 'fixed' ? (draft.fixedChannels || []) : (draft.defaultChannels || [])}
                        onValueChange={(vals) => setField(draft.channelsMode === 'fixed' ? 'fixedChannels' : 'defaultChannels', vals)}
                        placeholder={t('Select channels')}
                      />
                    ) : (
                      <span style={styles.help}>MultiSelect unavailable</span>
                    )}
                    <span style={styles.help}>{t('Delivery and escalation stay within the selected channels.')}</span>
                  </div>
                </section>

                <section style={styles.subsection}>
                  <h3 style={styles.subsectionTitle}>{t('Escalation Trigger')}</h3>
                  <div style={{ display: 'inline-flex', gap: 6 }}>
                    <button type="button" style={segBtn(draft.escalateBy !== 'delivered')} onClick={() => setField('escalateBy', 'read')}>{t('By read')}</button>
                    <button type="button" style={segBtn(draft.escalateBy === 'delivered')} onClick={() => setField('escalateBy', 'delivered')}>{t('By delivered')}</button>
                  </div>
                  <span style={styles.help}>
                    {draft.escalateBy === 'delivered'
                      ? t('Waterfall stops once the device confirms receipt (deliveredAt), even if not read. Reliable for web push; native apps can only confirm on tap.')
                      : t('Waterfall escalates to the next channel until the recipient opens the notification (readAt). Default behavior.')}
                  </span>
                </section>
              </div>
            )}

            {detailTab === 'templates' && (
              <TemplatesTab
                key={`${draft.key || ''}:${draft.eventKey || ''}`}
                draft={draft}
                updateDraft={updateDraft}
                t={t}
                locales={locales}
                channels={channels}
                contextKeys={selectedEvent?.contextKeys || []}
                contextPaths={selectedEvent?.contextPaths || []}
                defaultLocale={defaultLocale}
              />
            )}

            {detailTab === 'logs' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={styles.help}>{t('Run a dry-run for this type\'s event. Full delivery logs live in the Activity section.')}</p>
                {canManage && draft.eventKey ? (
                  <SendTestPanel
                    t={t}
                    notificationsApi={notificationsApi}
                    events={eventList}
                    locales={locales}
                    defaultLocale={defaultLocale}
                    lockedEventKey={draft.eventKey}
                  />
                ) : !canManage ? (
                  <div style={styles.help}>{t('Test delivery is available to notification managers.')}</div>
                ) : (
                  <div style={styles.help}>{t('Select an event first.')}</div>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      <ConfirmDialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={doDelete}
        title={t('Delete notification type?')}
        message={t('This permanently removes the type from the catalog.')}
        confirmText={t('Delete')}
        cancelText={t('Cancel')}
      />
      <ConfirmDialog
        isOpen={pendingSelect !== undefined}
        onClose={() => resolvePendingSelect(false)}
        onConfirm={() => resolvePendingSelect(true)}
        title={t('Discard unsaved changes?')}
        message={t('You have unsaved changes that will be lost.')}
        confirmText={t('Discard')}
        cancelText={t('Cancel')}
      />
      <ConfirmDialog
        isOpen={pendingEventCreate !== undefined}
        onClose={() => resolvePendingEventCreate(false)}
        onConfirm={() => resolvePendingEventCreate(true)}
        title={t('Discard unsaved changes?')}
        message={t('You have unsaved changes that will be lost.')}
        confirmText={t('Discard')}
        cancelText={t('Cancel')}
      />
    </div>
  );
}
