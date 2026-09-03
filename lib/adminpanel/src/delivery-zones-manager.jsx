import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { I18nProvider, useTranslation } from './i18n/I18nContext';
import { ConfirmDialog } from './components/ConfirmDialog';
import WorktimeEditor from './components/WorktimeEditor';
import {
  styles, toast, notificationsApi as api, useIsMobile,
} from './components/notifications/shared';

// OpenLayers is by a wide margin the heaviest thing on this page, and the city
// picker has no use for it. It arrives once a city is chosen.
const ZoneMap = lazy(() => import('./components/ZoneMap'));

const {
  Button, Input, Label, Badge, Textarea,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  DialogStack, DialogStackTrigger, DialogStackOverlay, DialogStackBody,
  DialogStackContent, DialogStackHeader, DialogStackTitle, DialogStackDescription,
  DialogStackFooter,
} = window.UIComponents;

const APPEARANCE_STORAGE_KEY = 'appearance';
function getPreferredAppearance() {
  return localStorage.getItem(APPEARANCE_STORAGE_KEY) || 'system';
}
function isDarkAppearance(appearance) {
  if (appearance === 'dark') return true;
  if (appearance === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}
function useAppearance() {
  const [appearance, setAppearance] = useState(getPreferredAppearance);
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
  return useMemo(() => isDarkAppearance(appearance), [appearance]);
}

function MaterialIcon({ name, size = 20, style }) {
  return <span className="material-icons" style={{ fontSize: size, lineHeight: 1, ...style }}>{name}</span>;
}

// Radix selects treat an empty string as "nothing chosen", which is not the same
// statement as "this zone belongs to no layer".
const NO_LAYER = '__no_layer__';

/**
 * A dropdown opened inside a dialog.
 *
 * The dialog panel is z-1002 and a select's list is z-50, both portalled to the
 * body — so the list opens behind the panel and the field looks frozen. The
 * admin panel's own forms pass the same class for the same reason.
 */
const DROPDOWN_OVER_DIALOG = 'z-[9999999]';

// The stroke `ZoneMap` paints a pointed-at zone with. Repeated rather than
// shared because the map owns its palette in OpenLayers terms and this is a
// CSS colour — what has to match is what the operator sees.
const HOVER_COLOR = '#b45309';

const EMPTY_DRAFT = {
  id: '',
  name: '',
  description: '',
  enable: true,
  sortOrder: 0,
  polygon: [],
  worktime: [],
  minDeliveryTime: '',
  minOrderTotal: '',
  freeDeliveryFrom: '',
  deliveryCost: '',
  deliveryItem: '',
  deliveryMessage: '',
  city: '',
  parent: '',
  termsApplyToZones: true,
  source: '',
  externalId: '',
};

function toDraft(zone) {
  return {
    ...EMPTY_DRAFT,
    ...zone,
    minDeliveryTime: zone.minDeliveryTime ?? '',
    minOrderTotal: zone.minOrderTotal ?? '',
    freeDeliveryFrom: zone.freeDeliveryFrom ?? '',
    deliveryCost: zone.deliveryCost ?? '',
    deliveryItem: zone.deliveryItem ?? '',
    city: zone.city ?? '',
    parent: zone.parent ?? '',
    termsApplyToZones: zone.termsApplyToZones !== false,
    source: zone.source ?? '',
    externalId: zone.externalId ?? '',
  };
}

/** A row is a layer when it has no geometry. The server says so; this agrees. */
function isLayer(zone) {
  return zone.isLayer === true || !Array.isArray(zone.polygon) || zone.polygon.length === 0;
}

// ─────────────────────────── the tariff popup ───────────────────────────

/**
 * Delivery terms of one row.
 *
 * Opened from the gear next to a layer or next to a polygon, and — for a row
 * that has a shape — by double-clicking it on the map. It is the only place
 * these fields are edited.
 *
 * A zone inside a layer shows the terms read-only *when that layer says it
 * prices its zones* — a field an operator can type into but nothing reads is
 * worse than a locked one. When the layer only groups, the same fields are the
 * zone's own and stay editable.
 *
 * Two things are never the layer's and so are never locked here: whether the
 * zone is on, and where it sits in the matching order.
 */
function TariffDialog({ zone, layerName, layerTerms, canManage, onSave, onClose, saving, t }) {
  const [draft, setDraft] = useState(() => toDraft(zone));
  const inherited = Boolean(zone.parent) && layerTerms !== false;
  const editable = canManage && !inherited;

  const setField = (field, value) => setDraft((prev) => ({ ...prev, [field]: value }));

  // `own` marks the two fields a layer never lends: they stay editable inside one.
  const numberField = (field, label, tooltip, own = false) => (
    <div style={styles.field} key={field}>
      <Label style={styles.fieldLabel}>{t(label)}</Label>
      <Input
        type="number"
        value={draft[field]}
        disabled={own ? !canManage : !editable}
        onChange={(event) => setField(field, event.target.value)}
      />
      {tooltip && <span style={styles.help}>{t(tooltip)}</span>}
    </div>
  );

  const submit = async () => {
    if (await onSave(draft) !== false) onClose();
  };

  // Stable, and it has to be: DialogStack watches `onOpenChange` in the effect
  // that re-arms its opening animation, so a fresh arrow on every render made
  // the dialog play itself open again on every keystroke.
  const handleOpenChange = useCallback((isOpen) => { if (!isOpen) onClose(); }, [onClose]);

  // `open` is the initial state of a DialogStack and not a controlled prop —
  // it has none. That is enough here: the dialog is mounted only while a row
  // is chosen, so mounting it *is* opening it, and `onOpenChange` unmounts it.
  return (
    <DialogStack open onOpenChange={handleOpenChange}>
      <DialogStackOverlay />
      <DialogStackBody>
        <DialogStackContent>
          <DialogStackHeader>
            <DialogStackTitle>{zone.name || t('Untitled')}</DialogStackTitle>
            <DialogStackDescription>
              {isLayer(zone)
                ? t('Terms of this layer, and whether its zones take them.')
                : (inherited
                  ? t('Priced by its layer. What is left here is this zone\'s own.')
                  : t('Delivery terms of this zone.'))}
            </DialogStackDescription>
          </DialogStackHeader>

          <div className="flex flex-col p-6" style={{ gap: 14, overflowY: 'auto' }}>
            {isLayer(zone) && (
              <div style={styles.field}>
                <Label style={styles.fieldLabel}>{t('Terms of the zones in this layer')}</Label>
                <Select
                  value={draft.termsApplyToZones ? 'layer' : 'own'}
                  disabled={!canManage}
                  onValueChange={(value) => setField('termsApplyToZones', value === 'layer')}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className={DROPDOWN_OVER_DIALOG}>
                    <SelectItem value="layer">{t('Come from this layer')}</SelectItem>
                    <SelectItem value="own">{t('Each zone has its own')}</SelectItem>
                  </SelectContent>
                </Select>
                <span style={styles.help}>
                  {draft.termsApplyToZones
                    ? t('The fields below price every zone in the layer, and their own copies are ignored.')
                    : t('The layer only groups its zones. The fields below are kept but nothing reads them.')}
                </span>
              </div>
            )}

            {inherited && (
              <div style={{ ...styles.subsection, borderColor: 'var(--primary)' }}>
                <span style={styles.help}>
                  {t('This zone is in a layer that prices its zones')}
                  {layerName ? ` — ${layerName}. ` : '. '}
                  {t('Change the terms there, switch that layer to per-zone terms, or take the zone out of it.')}
                </span>
              </div>
            )}

            {numberField(
              'sortOrder',
              'Sorting order',
              isLayer(zone)
                ? 'Where this layer sits among the other zones and layers'
                : (zone.parent
                  ? 'Where this zone sits inside its layer; the layer decides where the layer sits'
                  : 'Zones are matched in this order and the search stops at the first hit'),
              true,
            )}
            {!inherited && (
              <>
                {numberField('minDeliveryTime', 'Delivery time, minutes')}
                {numberField('minOrderTotal', 'Minimum order total')}
                {numberField('freeDeliveryFrom', 'Free delivery from')}
                {numberField('deliveryCost', 'Delivery cost')}

                <div style={styles.field}>
                  <Label style={styles.fieldLabel}>{t('Delivery product')}</Label>
                  <Input
                    value={draft.deliveryItem}
                    disabled={!editable}
                    onChange={(event) => setField('deliveryItem', event.target.value)}
                  />
                  <span style={styles.help}>{t('Charged instead of the delivery cost, as a line added to the order')}</span>
                </div>

                <div style={styles.field}>
                  <Label style={styles.fieldLabel}>{t('Message')}</Label>
                  <Textarea
                    value={draft.deliveryMessage}
                    disabled={!editable}
                    onChange={(event) => setField('deliveryMessage', event.target.value)}
                  />
                  <span style={styles.help}>{t('Shown to the customer at checkout')}</span>
                </div>
              </>
            )}

            <div style={styles.field}>
              <Label style={styles.fieldLabel}>{t('Enabled')}</Label>
              <Select
                value={draft.enable ? 'yes' : 'no'}
                disabled={!canManage}
                onValueChange={(value) => setField('enable', value === 'yes')}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className={DROPDOWN_OVER_DIALOG}>
                  <SelectItem value="yes">{t('Yes')}</SelectItem>
                  <SelectItem value="no">{t('No')}</SelectItem>
                </SelectContent>
              </Select>
              {isLayer(zone) && (
                <span style={styles.help}>{t('Switching a layer off takes its zones with it')}</span>
              )}
            </div>

            {!inherited && (
              <div style={styles.field}>
                <Label style={styles.fieldLabel}>{t('Work Time')}</Label>
                <WorktimeEditor
                  value={draft.worktime}
                  onChange={(value) => setField('worktime', value)}
                  disabled={!editable}
                  t={t}
                />
                <span style={styles.help}>{t('Empty means the zone takes orders whenever the installation does')}</span>
              </div>
            )}
          </div>

          <DialogStackFooter>
            {canManage && (
              <Button onClick={submit} disabled={saving}>
                {saving ? t('Saving…') : t('Save')}
              </Button>
            )}
          </DialogStackFooter>
        </DialogStackContent>
      </DialogStackBody>
    </DialogStack>
  );
}

// ─────────────────────── the source settings popup ───────────────────────

/**
 * The gear next to the city: where the map comes from, what names its zones and
 * how often it is read.
 *
 * The middle one is here because the link answers it. A Google My Maps export
 * has no placemark ids and no ExtendedData, so anything but "by name" imports
 * nothing at all from the links this feature is pointed at.
 */
const ID_SOURCES = [
  { value: 'name', label: 'Zone name', help: 'What a Google My Maps export has. Renaming a zone in the map makes it arrive as a new one, and the terms set here stay on the old row.' },
  { value: 'extended-data', label: 'ExtendedData field', help: 'For a map built to carry its own identifiers. Renaming a zone is then safe.' },
  { value: 'placemark-id', label: 'Placemark id', help: 'The id attribute of the placemark, if the map writes one.' },
];
function SourceSettingsDialog({ cityId, cityName, canManage, onSaved, t }) {
  const [state, setState] = useState(null);
  const [url, setUrl] = useState('');
  const [idSource, setIdSource] = useState(ID_SOURCES[0].value);
  const [intervalSeconds, setIntervalSeconds] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  // Said in the dialog and not only as a toast: the popup stays open after a
  // save, so a toast that is missed leaves the button looking inert.
  const [result, setResult] = useState(null);

  const load = useCallback(async () => {
    const { ok, payload } = await api('/core/delivery-zone-source');
    if (!ok) {
      toast('error', payload?.error || t('Could not load the source settings'));
      return;
    }
    setState(payload);
    const entry = (payload.cities || []).find((item) => item.city === cityId);
    setUrl(entry?.url || '');
    setIdSource(entry?.externalIdSource || ID_SOURCES[0].value);
    setIntervalSeconds(String(payload.intervalSeconds ?? ''));
    setEnabled(payload.enabled === true);
    setResult(null);
  }, [cityId, t]);

  const save = async () => {
    setBusy(true);
    setResult(null);
    const { ok, payload } = await api('/core/delivery-zone-source', {
      method: 'post',
      body: JSON.stringify({
        city: cityId,
        url,
        externalIdSource: idSource,
        enabled,
        // Left out when the field is empty, which the server reads as “do not
        // touch it”. Sending `Number('')` instead would post a zero, and a zero
        // is floored to five minutes — an interval nobody asked to change.
        ...(intervalSeconds === '' ? {} : { intervalSeconds: Number(intervalSeconds) }),
      }),
    });
    setBusy(false);

    if (!ok) {
      const message = payload?.error || t('Could not save the source settings');
      setResult({ ok: false, message });
      toast('error', message);
      return;
    }

    setState(payload);
    // The save runs the synchronisation, so what comes back is the interesting
    // half: how many zones the map turned into.
    setResult(payload.run
      ? { ok: payload.run.ok, message: t(payload.run.text) }
      : { ok: true, message: t('Saved') });
    onSaved?.();
    // The server floors the interval, so show what it actually stored rather
    // than what was typed. The switch comes back for the same reason.
    setIntervalSeconds(String(payload.intervalSeconds ?? ''));
    setEnabled(payload.enabled === true);
    toast('success', t('Source settings saved'));
  };

  // Read when the popup opens, and from the popup rather than from the button:
  // DialogStackTrigger clones its child with an `onClick` of its own, so an
  // `onClick` on the button below is replaced and never runs. That is how this
  // dialog came up blank every time — and a blank dialog saved is a blank
  // dialog written back.
  const handleOpenChange = useCallback((isOpen) => { if (isOpen) load(); }, [load]);

  return (
    <DialogStack onOpenChange={handleOpenChange}>
      <DialogStackTrigger asChild>
        <Button variant="ghost" size="sm" title={t('Zone source')} style={{ padding: 4 }}>
          <MaterialIcon name="settings" size={18} />
        </Button>
      </DialogStackTrigger>
      <DialogStackOverlay />
      <DialogStackBody>
        <DialogStackContent>
          <DialogStackHeader>
            <DialogStackTitle>{t('Zone source')}</DialogStackTitle>
            <DialogStackDescription>{cityName}</DialogStackDescription>
          </DialogStackHeader>

          <div className="flex flex-col p-6" style={{ gap: 14, overflowY: 'auto' }}>
            {state && !state.source && (
              <span style={styles.help}>
                {t('No zone source module is registered, so the link below is stored but nothing reads it.')}
              </span>
            )}

            <div style={styles.field}>
              <Label style={styles.fieldLabel}>{t('Map link')}</Label>
              <Input
                value={url}
                disabled={!canManage}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://www.google.com/maps/d/kml?mid=…"
              />
              <span style={styles.help}>
                {t('The KML of this city. Emptying it means the city has no source and its zones stay as they are.')}
              </span>
            </div>

            <div style={styles.field}>
              <Label style={styles.fieldLabel}>{t('Zones are recognised by')}</Label>
              <Select value={idSource} disabled={!canManage} onValueChange={setIdSource}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className={DROPDOWN_OVER_DIALOG}>
                  {ID_SOURCES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{t(option.label)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span style={styles.help}>
                {t(ID_SOURCES.find((option) => option.value === idSource)?.help ?? '')}
              </span>
            </div>

            <div style={styles.field}>
              <Label style={styles.fieldLabel}>{t('Synchronisation interval, seconds')}</Label>
              <Input
                type="number"
                value={intervalSeconds}
                disabled={!canManage}
                onChange={(event) => setIntervalSeconds(event.target.value)}
              />
              <span style={styles.help}>
                {t('One timer for the whole installation, not per city. Anything below five minutes is raised to it.')}
              </span>
            </div>

            <div style={styles.field}>
              <Label style={styles.fieldLabel}>{t('Synchronisation')}</Label>
              <Select
                value={enabled ? 'on' : 'off'}
                disabled={!canManage}
                onValueChange={(value) => setEnabled(value === 'on')}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className={DROPDOWN_OVER_DIALOG}>
                  <SelectItem value="on">{t('Runs on the schedule')}</SelectItem>
                  <SelectItem value="off">{t('Off')}</SelectItem>
                </SelectContent>
              </Select>
              <span style={styles.help}>
                {t('Also installation-wide. Off means the links above are stored and nothing reads them.')}
              </span>
            </div>

          </div>

          <DialogStackFooter>
            {result && (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  borderRadius: 6,
                  fontSize: 13,
                  lineHeight: 1.35,
                  textAlign: 'left',
                  // Not --primary-foreground / --destructive-foreground: this
                  // theme resolves the destructive pair to red on red, and the
                  // error text — the one message worth reading — was invisible.
                  // Both backgrounds are dark and saturated, so white is right
                  // for either.
                  color: '#fff',
                  background: result.ok ? 'var(--primary)' : 'var(--destructive)',
                }}
              >
                <MaterialIcon name={result.ok ? 'check_circle' : 'error'} size={18} />
                <span>{result.message}</span>
              </div>
            )}
            {canManage && (
              <Button onClick={save} disabled={busy}>
                {busy ? t('Saving…') : t('Save')}
              </Button>
            )}
          </DialogStackFooter>
        </DialogStackContent>
      </DialogStackBody>
    </DialogStack>
  );
}

// ───────────────────────────── the left panel ─────────────────────────────

function PanelRow({ zone, selected, hovered, onSelect, onHover, onOpenTariff, indent, layerTerms, t }) {
  const pricedByLayer = Boolean(zone.parent) && layerTerms !== false;
  // Dimmed, not hidden: the shape is still edited here and an address still
  // matches it — only the terms belong to the row above.
  //
  // On the label and not on the row: an element with opacity below 1 opens a
  // stacking context, and dimming the whole row trapped a portalled backdrop at
  // the row's level — the admin sidebar stayed lit on top of an open popup.
  const dim = pricedByLayer && !selected ? 0.5 : 1;
  return (
    <div
      onMouseEnter={() => onHover?.(zone)}
      onMouseLeave={() => onHover?.(null)}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        paddingLeft: 8 + indent * 16, paddingRight: 4,
        background: selected ? 'var(--accent)' : 'transparent',
        borderRadius: 6,
        // A bar rather than a background: a row can be both selected and
        // pointed at, and the two answers must not overwrite each other.
        boxShadow: hovered ? `inset 3px 0 0 ${HOVER_COLOR}` : 'none',
      }}
    >
      <button
        type="button"
        onClick={() => onSelect(zone)}
        style={{
          flex: 1, textAlign: 'left', background: 'none', border: 'none',
          padding: '6px 0', cursor: 'pointer', color: 'inherit', minWidth: 0,
          opacity: dim,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <MaterialIcon name={isLayer(zone) ? 'folder' : 'pentagon'} size={14} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {zone.name || t('Untitled')}
          </span>
          {zone.enable === false && <Badge variant="secondary">{t('Off')}</Badge>}
          {zone.source && <Badge variant="outline">{zone.source}</Badge>}
        </span>
      </button>

      <Button
        variant="ghost"
        size="sm"
        title={t('Delivery terms')}
        onClick={() => onOpenTariff(zone)}
        style={{ padding: 4 }}
      >
        <MaterialIcon name="tune" size={16} />
      </Button>
    </div>
  );
}

function ZonePanel({ zones, selectedId, hoveredId, onSelect, onHover, onOpenTariff, canManage, onNew, t }) {
  const layers = zones.filter(isLayer);
  const loose = zones.filter((zone) => !isLayer(zone) && !zone.parent);
  const byParent = new Map();
  for (const zone of zones) {
    if (isLayer(zone) || !zone.parent) continue;
    if (!byParent.has(zone.parent)) byParent.set(zone.parent, []);
    byParent.get(zone.parent).push(zone);
  }

  const rowProps = { selectedId, onSelect, onHover, onOpenTariff, t };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
      {canManage && (
        <div style={{ display: 'flex', gap: 6, padding: '0 4px 8px' }}>
          <Button size="sm" variant="outline" onClick={() => onNew(false)} style={{ flex: 1 }}>
            <MaterialIcon name="add" size={14} style={{ marginRight: 4 }} />
            {t('Zone')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => onNew(true)} style={{ flex: 1 }}>
            <MaterialIcon name="create_new_folder" size={14} style={{ marginRight: 4 }} />
            {t('Layer')}
          </Button>
        </div>
      )}

      {zones.length === 0 && (
        <span style={{ ...styles.help, padding: '0 8px' }}>
          {t('No zones in this city yet. Delivery uses the default settings until a zone matches an address.')}
        </span>
      )}

      {layers.map((layer) => (
        <React.Fragment key={layer.id}>
          <PanelRow
            {...rowProps}
            zone={layer}
            indent={0}
            selected={selectedId === layer.id}
            hovered={hoveredId === layer.id}
            onSelect={onSelect}
          />
          {(byParent.get(layer.id) ?? []).map((zone) => (
            <PanelRow
              {...rowProps}
              key={zone.id}
              zone={zone}
              indent={1}
              layerTerms={layer.termsApplyToZones !== false}
              selected={selectedId === zone.id}
              hovered={hoveredId === zone.id}
              onSelect={onSelect}
            />
          ))}
        </React.Fragment>
      ))}

      {loose.map((zone) => (
        <PanelRow
          {...rowProps}
          key={zone.id}
          zone={zone}
          indent={0}
          selected={selectedId === zone.id}
          hovered={hoveredId === zone.id}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

// ──────────────────────────── the page ────────────────────────────

function DeliveryZonesContent({ canManage }) {
  const { t } = useTranslation();
  const dark = useAppearance();
  // Two widths matter here. Below 720 the list cannot stand beside the map at
  // all and becomes a column above it; below 1024 it still fits, narrower.
  const isMobile = useIsMobile();
  const isNarrow = useIsMobile(1024);

  const [zones, setZones] = useState([]);
  const [places, setPlaces] = useState([]);
  const [cities, setCities] = useState([]);
  const [ownership, setOwnership] = useState(null);
  const [mapConfig, setMapConfig] = useState(null);

  const [cityId, setCityId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // The page opens read-only. Every zone of the city is on the map, the mouse
  // does nothing to them, and a double click opens the terms of the one under
  // it. Editing is entered deliberately, for one zone at a time — before this
  // existed, picking a row in the list armed `Modify` on its shape and a stray
  // drag was an edit nobody meant to make.
  const [editing, setEditing] = useState(false);
  // The row whose terms are open, by id rather than by value: the list is
  // reloaded after every save and a captured copy would go stale.
  const [tariffZoneId, setTariffZoneId] = useState(null);

  const loadZones = useCallback(async () => {
    const { ok, payload } = await api('/core/delivery-zones');
    if (!ok) {
      toast('error', payload?.error || t('Could not load zones'));
      return;
    }
    setZones(payload.zones || []);
    setPlaces(payload.places || []);
    setCities(payload.cities || []);
    setOwnership(payload.ownership || null);
    setMapConfig(payload.map || null);
  }, [t]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadZones();
      setLoading(false);
    })();
  }, [loadZones]);

  // One city is not a choice. An installation that has never configured cities
  // has none at all, and its zones carry no city either — both go straight to
  // the map instead of asking a question with one answer.
  //
  // Not before the load finishes, though: on the first render `cities` is still
  // the empty initial state, and deciding then latches "no city" for good — the
  // effect never runs again once `cityId` stops being null.
  useEffect(() => {
    if (loading || cityId !== null) return;
    if (cities.length === 0) setCityId('');
    else if (cities.length === 1) setCityId(cities[0].id);
  }, [loading, cities, cityId]);

  const cityZones = useMemo(
    () => zones.filter((zone) => (zone.city ?? '') === (cityId ?? '')),
    [zones, cityId],
  );

  const cityName = useMemo(
    () => cities.find((city) => city.id === cityId)?.name ?? t('No city'),
    [cities, cityId, t],
  );

  // The kitchens, as points. They belong to no city, so every one of them is
  // drawn whichever city is open — see `ZoneMap`, where the same fact keeps
  // them out of the opening view.
  const points = useMemo(
    () => places
      .filter((place) => place.coordinate)
      .map((place) => ({
        id: place.id,
        title: place.title,
        lat: place.coordinate.lat,
        lon: place.coordinate.lon,
        enable: place.enable,
      })),
    [places],
  );

  // Passed to the terms dialog, which memoises on it — see the note there.
  const closeTariff = useCallback(() => setTariffZoneId(null), []);

  const save = async (values) => {
    setSaving(true);
    const { ok, payload } = await api('/core/delivery-zone', {
      method: 'post',
      body: JSON.stringify(values),
    });
    setSaving(false);

    if (!ok) {
      toast('error', payload?.error || t('Could not save the zone'));
      return false;
    }

    toast('success', t('Zone saved'));
    await loadZones();
    return true;
  };

  const onSaveDraft = async () => {
    if (await save(draft)) stopEditing();
  };

  const onDelete = async () => {
    setConfirmDelete(false);
    setSaving(true);
    const { ok, payload } = await api('/core/delivery-zone-delete', {
      method: 'post',
      body: JSON.stringify({ id: draft.id }),
    });
    setSaving(false);

    if (!ok) {
      toast('error', payload?.error || t('Could not delete the zone'));
      return;
    }

    toast('success', t('Zone deleted'));
    stopEditing();
    await loadZones();
  };

  // Back to reading the map. Also the whole of “cancel”: the draft is the edit,
  // so dropping it is undoing it.
  const stopEditing = () => {
    setDraft(null);
    setEditing(false);
  };

  const onNew = (asLayer) => {
    setDraft({
      ...EMPTY_DRAFT,
      city: cityId || '',
      // A layer is a row without geometry, so a new one simply never gets a ring.
      polygon: [],
      isLayer: asLayer,
    });
    // A new zone is nothing but a shape yet to be drawn, so it opens in the
    // mode where drawing is possible.
    setEditing(true);
  };

  // ── city first, and nothing else until one is chosen ──
  if (!loading && cityId === null) {
    return (
      <div className="absolute inset-0 overflow-auto" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
        <div style={styles.pageShell}>
          <header>
            <h1 style={styles.sectionTitle}>{t('Delivery zones')}</h1>
            <p style={styles.sectionDescription}>
              {t('Zones are drawn per city. Pick one to see its map.')}
            </p>
          </header>

          <section style={styles.panel}>
            <div style={{ display: 'grid', gap: 8, gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(220px, 1fr))' }}>
              {cities.map((city) => (
                <Button key={city.id} variant="outline" onClick={() => setCityId(city.id)} style={{ justifyContent: 'flex-start' }}>
                  <MaterialIcon name="location_city" size={16} style={{ marginRight: 8 }} />
                  {city.name}
                </Button>
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  const selected = draft;
  const locked = Boolean(selected?.locked);
  // The link belongs to the city being shown, not to the installation: one city
  // can be synchronised while the next is drawn by hand.
  const citySourceUrl = ownership?.sourceUrls?.[cityId ?? ''] ?? null;
  const canEditGeometry = canManage && !locked && !selected?.isLayer;
  const canEnterEditing = canManage && Boolean(selected) && !locked && !selected.isLayer;

  // What the map draws as context. In the reading mode that is every zone of
  // the city, the selected one included: nothing is being reshaped, so nothing
  // needs to be lifted out onto the editing layer.
  const contextZones = editing
    ? cityZones.filter((zone) => zone.id !== selected?.id && !isLayer(zone))
    : cityZones.filter((zone) => !isLayer(zone));

  // The row whose terms are open, re-read from the list on every render so a
  // save is reflected in the popup that caused it.
  const tariffZone = cityZones.find((zone) => zone.id === tariffZoneId) ?? null;
  const tariffLayer = tariffZone?.parent
    ? cityZones.find((zone) => zone.id === tariffZone.parent) ?? null
    : null;

  // A zone is a shape. Until one is drawn there is nothing to save, and the
  // model says so too — this is the same refusal, made before the round trip
  // and next to the map where the shape is drawn.
  const needsShape = Boolean(selected) && !selected.isLayer
    && (!Array.isArray(selected.polygon) || selected.polygon.length < 3);

  // Pointing at a layer points at everything in it: a layer has no shape of its
  // own, so the only thing to show on the map is what it groups.
  //
  // Plain, not memoised. Everything from here down runs after the city picker
  // returns early, so a hook here is a hook the previous render did not have —
  // which is React error #300 and a blank page.
  //
  // In the reading mode the selected row is highlighted too — it is on the same
  // layer as everything else there, and otherwise nothing on the map would say
  // which row the list has picked.
  const highlightIds = hovered
    ? (isLayer(hovered)
      ? cityZones.filter((zone) => zone.parent === hovered.id).map((zone) => zone.id)
      : [hovered.id])
    : (!editing && selected?.id ? [selected.id] : []);

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100%', minHeight: 0 }}>
        {/* the narrow second panel, next to the admin sidebar */}
        <aside
          style={{
            width: isMobile ? '100%' : (isNarrow ? 220 : 280),
            flexShrink: 0,
            // Stacked on a phone, so the border that divides it from the map
            // moves with it. Two fifths of the height at most: past that the
            // map is a strip, and a list of five zones needs nothing like it.
            ...(isMobile
              ? { maxHeight: '40vh', borderBottom: '1px solid var(--border)' }
              : { borderRight: '1px solid var(--border)' }),
            padding: 12,
            overflowY: 'auto',
            display: isMobile && editing ? 'none' : 'block',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10 }}>
            {cities.length > 1 && (
              <Button variant="ghost" size="sm" onClick={() => { stopEditing(); setCityId(null); }} style={{ padding: 4 }}>
                <MaterialIcon name="arrow_back" size={16} />
              </Button>
            )}
            <span style={{ flex: 1, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {cityName}
            </span>
            <SourceSettingsDialog
              cityId={cityId}
              cityName={cityName}
              canManage={canManage}
              onSaved={loadZones}
              t={t}
            />
          </div>

          {loading ? (
            <span style={styles.help}>{t('Loading…')}</span>
          ) : (
            <ZonePanel
              zones={cityZones}
              selectedId={selected?.id}
              hoveredId={hovered?.id}
              onSelect={(zone) => setDraft(toDraft(zone))}
              onHover={setHovered}
              onOpenTariff={(zone) => setTariffZoneId(zone.id)}
              canManage={canManage}
              onNew={onNew}
              t={t}
            />
          )}
        </aside>

        {/* the map, showing every zone of the city at once */}
        <main style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 4, border: '1px solid var(--border)', borderRadius: 6, padding: 2 }}>
              <Button
                variant={editing ? 'ghost' : 'default'}
                size="sm"
                onClick={stopEditing}
                title={t('Double-click a zone to open its delivery terms')}
              >
                <MaterialIcon name="visibility" size={14} style={{ marginRight: 4 }} />
                {t('View')}
              </Button>
              <Button
                variant={editing ? 'default' : 'ghost'}
                size="sm"
                disabled={!canEnterEditing}
                onClick={() => setEditing(true)}
                title={t('Draw and reshape the selected zone')}
              >
                <MaterialIcon name="edit" size={14} style={{ marginRight: 4 }} />
                {t('Edit')}
              </Button>
            </div>
            <span style={{ ...styles.help, flex: 1, minWidth: 0, flexBasis: isMobile ? '100%' : 'auto' }}>
              {editing
                ? t('Only the selected zone can be reshaped. Leaving this mode discards what is unsaved.')
                : (canEnterEditing
                  ? t('The map is read-only. Double-click a zone to open its delivery terms.')
                  : t('Pick a zone in the list, or start a new one, to change its shape.'))}
            </span>
          </div>

          {editing && selected && (
            <div style={{ padding: 12, borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ ...styles.field, flex: 1, minWidth: 200 }}>
                <Label style={styles.fieldLabel}>{t('Name')}</Label>
                <Input
                  value={selected.name}
                  disabled={!canManage || locked}
                  onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
                />
              </div>

              {!selected.isLayer && (
                <>
                  <div style={{ ...styles.field, minWidth: 180 }}>
                    <Label style={styles.fieldLabel}>{t('Layer')}</Label>
                    <Select
                      value={selected.parent || NO_LAYER}
                      disabled={!canManage || locked}
                      onValueChange={(value) => setDraft((prev) => ({ ...prev, parent: value === NO_LAYER ? '' : value }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_LAYER}>{t('No layer')}</SelectItem>
                        {cityZones.filter(isLayer).map((layer) => (
                          <SelectItem key={layer.id} value={layer.id}>{layer.name || t('Untitled')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>


                </>
              )}

              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {needsShape && (
                  <span style={{ ...styles.help, maxWidth: 260, color: 'var(--destructive)' }}>
                    {t('Draw the zone on the map first — click its corners, then click the first one again.')}
                  </span>
                )}
                <Button onClick={onSaveDraft} disabled={saving || !canManage || needsShape}>
                  {saving ? t('Saving…') : t('Save')}
                </Button>
                <Button variant="outline" onClick={stopEditing} disabled={saving}>
                  {t('Cancel')}
                </Button>
                {canManage && selected.id && (
                  <Button variant="outline" onClick={() => setConfirmDelete(true)} disabled={saving}>
                    <MaterialIcon name="delete" size={16} />
                  </Button>
                )}
              </div>
            </div>
          )}

          {locked && (
            <div style={{ padding: '8px 12px' }}>
              <span style={styles.help}>
                {t('Name and polygon are maintained in the source and would be overwritten by the next run. Delivery terms, working hours and the kitchen are yours to change here.')}
                {citySourceUrl ? ' ' : ''}
                {citySourceUrl && (
                  <a href={citySourceUrl} target="_blank" rel="noreferrer">{t('Open the source')}</a>
                )}
              </span>
            </div>
          )}

          <div style={{ flex: 1, minHeight: 0 }}>
            {editing && selected?.isLayer ? (
              <div style={{ padding: 24 }}>
                <span style={styles.help}>
                  {t('A layer has no shape of its own. It groups zones and sets the terms they all use.')}
                </span>
              </div>
            ) : (
              <Suspense fallback={<div style={{ padding: 24 }}><span style={styles.help}>{t('Loading the map…')}</span></div>}>
                <ZoneMap
                  value={editing ? (selected?.polygon ?? []) : []}
                  onChange={(ring) => setDraft((prev) => (prev ? { ...prev, polygon: ring } : prev))}
                  readOnly={!editing || !canEditGeometry}
                  // "Read-only" has three reasons and they read nothing alike:
                  // the reading mode, a zone whose shape belongs to the source,
                  // and no zone picked at all. The first is the state the page
                  // opens in, and the toolbar above already explains it.
                  readOnlyHint={editing
                    ? (selected ? undefined : t('Pick a zone in the list, or start a new one, to draw its shape.'))
                    : t('Double-click a zone to open its delivery terms.')}
                  otherZones={contextZones}
                  highlightIds={highlightIds}
                  points={points}
                  onZoneActivate={setTariffZoneId}
                  onZoneHover={(zoneId) => setHovered(zoneId ? cityZones.find((zone) => zone.id === zoneId) ?? null : null)}
                  dark={dark}
                  tileUrl={mapConfig?.tileUrl}
                  attribution={mapConfig?.attribution}
                  t={t}
                />
              </Suspense>
            )}
          </div>
        </main>
      </div>

      {tariffZone && (
        <TariffDialog
          key={tariffZone.id}
          zone={tariffZone}
          layerName={tariffLayer?.name}
          layerTerms={tariffLayer ? tariffLayer.termsApplyToZones !== false : undefined}
          canManage={canManage}
          saving={saving}
          onSave={save}
          onClose={closeTariff}
          t={t}
        />
      )}

      <ConfirmDialog
        isOpen={confirmDelete}
        title={t('Delete this zone?')}
        message={selected?.locked
          ? t('The source still lists this zone, so the next synchronisation will create it again — without the delivery terms set here.')
          : t('A synchronisation never deletes zones, so re-running it will not bring this one back.')}
        confirmText={t('Delete')}
        onConfirm={onDelete}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}

export default function DeliveryZonesManager({ props }) {
  return (
    <I18nProvider initialLocale={props?.locale || 'en'} messages={props?.messages}>
      <DeliveryZonesContent canManage={props?.canManage !== false} />
    </I18nProvider>
  );
}
