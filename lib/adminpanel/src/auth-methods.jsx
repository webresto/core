import React, { useEffect, useRef, useState } from 'react';
import { I18nProvider, useTranslation } from './i18n/I18nContext';
import { requireAdminApi, extractApiErrorMessage } from './lib/admin-api';
import { useAsk } from './components/AskDialog';

// The page "Sign-in methods" (controller/auth-methods.ts): the rows the modules declared (AuthMethod.alive), each
// with its switch and order, and a row's button - caption, hint, icon, colours - with its limits under "More".

const { Button, Input, Label, Switch, Toaster } = window.UIComponents;
const Icons = window.LucideReact;

const HEALTH = {
  ready: ['Ready', '#16a34a'],
  needs_setup: ['Needs setup', '#d97706'],
  error: ['Error', '#dc2626'],
  conflict: ['Conflict', '#dc2626'],
};

const PURPOSES = {
  'login': 'Sign in',
  'link': 'Link to the account',
  'verify:phone': 'Confirm the phone',
  'verify:phone_change': 'Change the phone',
  'verify:delete_account': 'Delete the account',
  'verify:link_identity': 'Link a sign-in service',
  'verify:unlink_identity': 'Unlink a sign-in service',
};

/** the fields the editor changes; the list's switch sends `enable` alone */
const FIELDS = ['titleKey', 'hintKey', 'iconUrl', 'buttonColor', 'buttonTextColor', 'enable', 'purposes', 'countries', 'salesChannels', 'ttlSec', 'resendAfterSec', 'cost', 'requirePhoneVerification', 'maxPerUser'];

const styles = {
  page: { display: 'flex', flexDirection: 'column', gap: 20, color: 'var(--foreground)' },
  title: { fontSize: 22, fontWeight: 600, margin: 0 },
  hint: { fontSize: 13, color: 'var(--muted-foreground)', margin: 0 },
  card: { border: '1px solid var(--border)', borderRadius: 10, padding: 16, background: 'var(--background)', display: 'flex', flexDirection: 'column', gap: 12 },
  bar: { position: 'sticky', top: 0, zIndex: 20, background: 'var(--background)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: '8px 0 12px', borderBottom: '1px solid var(--border)' },
  row: (dragged) => ({ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 4px', borderBottom: '1px solid var(--border)', background: dragged ? 'var(--muted)' : 'transparent' }),
  handle: { cursor: 'grab', color: 'var(--muted-foreground)', display: 'flex' },
  link: { background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' },
  muted: { fontSize: 12, color: 'var(--muted-foreground)' },
  badge: (color) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color, border: `1px solid ${color}`, borderRadius: 999, padding: '2px 10px', marginLeft: 'auto' }),
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  fields: { display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' },
  check: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 },
  actions: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  more: { border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px' },
};

/** the button as the storefront draws it: the icon, the caption, the colours of the row */
function ButtonPreview({ method }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [method.iconUrl]);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 8, fontSize: 14, fontWeight: 500, minWidth: 160,
      background: method.buttonColor || 'var(--muted)', color: method.buttonTextColor || 'var(--foreground)', border: '1px solid var(--border)',
    }}>
      {method.iconUrl && !broken && <img src={method.iconUrl} alt="" style={{ width: 18, height: 18 }} onError={() => setBroken(true)} />}
      {method.titleKey || method.adapter}
    </span>
  );
}

function Colour({ label, value, onChange, t }) {
  return (
    <div style={styles.field}>
      <Label>{t(label)}</Label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#ffffff'} onChange={(event) => onChange(event.target.value)}
          style={{ width: 36, height: 36, padding: 0, border: '1px solid var(--border)', borderRadius: 6, background: 'none' }} />
        <Input value={value} placeholder={t('Default')} style={{ width: 150 }} onChange={(event) => onChange(event.target.value.trim())} />
      </div>
    </div>
  );
}

export default function AuthMethods(props) {
  return (
    <I18nProvider initialLocale={props?.locale} messages={props?.messages}>
      <AuthMethodsContent routePrefix={props?.routePrefix} />
    </I18nProvider>
  );
}

function AuthMethodsContent({ routePrefix }) {
  const { t } = useTranslation();
  const [ask, dialog] = useAsk();
  const base = `${routePrefix || '/admin'}/core/auth-methods`;
  const toast = (kind, message) => window.sonner?.toast?.[kind]?.(message);
  const failed = (error, fallback) => toast('error', t(extractApiErrorMessage(error) || fallback));

  const [methods, setMethods] = useState(null);
  const [channels, setChannels] = useState([]);
  const [open, setOpen] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dragged, setDragged] = useState(null);
  const orderBefore = useRef(null);

  const pick = (method) => Object.fromEntries(FIELDS.map((field) => [field, method[field] ?? null]));
  const dirty = !!open && !!draft && JSON.stringify(pick(draft)) !== JSON.stringify(pick(open));

  async function load() {
    try {
      const { data } = await requireAdminApi().get(base);
      setMethods(data.methods);
      setChannels(data.salesChannels);
    } catch (error) {
      setMethods([]);
      failed(error, 'The sign-in methods are not loaded');
    }
  }
  useEffect(() => { load(); }, []);

  function edit(method) {
    const values = method && {
      ...method,
      titleKey: method.titleKey || '', hintKey: method.hintKey || '', iconUrl: method.iconUrl || '',
      buttonColor: method.buttonColor || '', buttonTextColor: method.buttonTextColor || '',
      purposes: method.purposes || [], countries: method.countries || [], salesChannels: method.salesChannels || [],
      ttlSec: method.ttlSec || 0, resendAfterSec: method.resendAfterSec || 0, cost: method.cost || 0,
      requirePhoneVerification: method.requirePhoneVerification === true, maxPerUser: method.maxPerUser ?? null,
    };
    setOpen(values);
    setDraft(values);
  }
  const leave = async () => !dirty || ask({ title: t('Unsaved changes'), text: t('Unsaved changes will be lost. Continue?'), yes: t('Continue'), no: t('Cancel') });
  const set = (patch) => setDraft((current) => ({ ...current, ...patch }));
  const toggleIn = (list, item, on) => (on ? [...new Set([...list, item])] : list.filter((value) => value !== item));

  async function toggle(method, enable) {
    try {
      await requireAdminApi().post(`${base}/${method.id}`, { enable });
      setMethods((current) => current.map((item) => (item.id === method.id ? { ...item, enable } : item)));
      toast('success', t(enable ? 'Switched on' : 'Switched off'));
    } catch (error) {
      failed(error, 'The sign-in method is not saved');
    }
  }

  function move(from, to) {
    setMethods((current) => {
      const next = [...current];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  async function saveOrder() {
    const ids = methods.map((method) => method.id);
    if (JSON.stringify(ids) === JSON.stringify(orderBefore.current)) return;
    try {
      const { data } = await requireAdminApi().post(`${base}/order`, { ids });
      setMethods(data.methods);
      toast('success', t('Order saved'));
    } catch (error) {
      failed(error, 'The sign-in method is not saved');
      await load();
    }
  }

  async function save() {
    setSaving(true);
    try {
      const values = pick(draft);
      if (draft.kind !== 'phone_proof') { delete values.ttlSec; delete values.resendAfterSec; }
      if (draft.kind !== 'identity') { delete values.requirePhoneVerification; delete values.maxPerUser; }
      const { data } = await requireAdminApi().post(`${base}/${open.id}`, values);
      setMethods((current) => current.map((item) => (item.id === data.method.id ? data.method : item)));
      edit(data.method);
      toast('success', t('Saved'));
    } catch (error) {
      failed(error, 'The sign-in method is not saved');
    } finally {
      setSaving(false);
    }
  }

  const kindText = (method) => (method.kind === 'identity' ? t('Sign in through a service') : t('A code to the phone'));

  return (
    <div style={styles.page}>
      <Toaster position="top-center" richColors closeButton />
      {dialog}
      <div>
        <h1 style={styles.title}>{t('Sign-in methods')}</h1>
        <p style={styles.hint}>{t('The buttons and the ways to confirm a phone a customer gets at the login. A method works when it is switched on and ready; the modules add them.')}</p>
      </div>

      {methods === null && <p style={styles.hint}>{t('Loading…')}</p>}

      {methods !== null && !open && (
        <div style={styles.card}>
          {methods.length === 0 && <p style={styles.hint}>{t('No sign-in methods: the modules add them')}</p>}
          <div>
            {methods.map((method, index) => {
              const [health, color] = HEALTH[method.healthStatus] || [method.healthStatus || '—', '#64748b'];
              return (
                <div key={method.id} data-method={`${method.adapter}:${method.offer}`} style={styles.row(dragged === index)}
                  onDragOver={(event) => {
                    event.preventDefault();
                    if (dragged === null || dragged === index) return;
                    move(dragged, index);
                    setDragged(index);
                  }}>
                  <span draggable title={t('Drag to reorder')} style={styles.handle}
                    onDragStart={(event) => {
                      orderBefore.current = methods.map((item) => item.id);
                      setDragged(index);
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('text/plain', String(index));
                    }}
                    onDragEnd={() => { setDragged(null); saveOrder(); }}>
                    <Icons.GripVertical size={18} />
                  </span>
                  <span title={t('Shown on the site')} style={{ display: 'flex' }}>
                    <Switch checked={method.enable === true} onCheckedChange={(value) => toggle(method, value)} />
                  </span>
                  <Button variant="outline" size="sm" onClick={() => edit(method)}><Icons.Pencil /> {t('Edit')}</Button>
                  <button type="button" style={styles.link} onClick={() => edit(method)}><ButtonPreview method={method} /></button>
                  <span style={styles.muted}>{kindText(method)} · {method.adapter}:{method.offer}</span>
                  <span style={styles.badge(color)}>{t(health)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {open && draft && (
        <div style={styles.card}>
          <div style={styles.bar}>
            <Button variant="ghost" size="sm" onClick={async () => (await leave()) && edit(null)}><Icons.ArrowLeft /> {t('To the list')}</Button>
            <Button variant="default" disabled={!dirty || saving} onClick={save}>{t('Save')}</Button>
            <Button variant="outline" disabled={!dirty || saving} onClick={() => edit(methods.find((method) => method.id === open.id))}>{t('Undo changes')}</Button>
          </div>
          <p style={styles.muted}>
            {kindText(open)} · {open.adapter}:{open.offer}{open.providerModule ? ` · ${t('Module')}: ${open.providerModule}` : ''} · {t(HEALTH[open.healthStatus]?.[0] || open.healthStatus || '—')}
          </p>

          <div style={styles.fields}>
            <div style={{ ...styles.field, flex: '1 1 240px' }}>
              <Label>{t('Caption')}</Label>
              <Input value={draft.titleKey} placeholder={open.adapter} onChange={(event) => set({ titleKey: event.target.value })} />
            </div>
            <div style={{ ...styles.field, flex: '2 1 320px' }}>
              <Label>{t('Hint')}</Label>
              <Input value={draft.hintKey} onChange={(event) => set({ hintKey: event.target.value })} />
            </div>
            <label style={{ ...styles.check, paddingBottom: 8 }}>
              <Switch checked={draft.enable === true} onCheckedChange={(value) => set({ enable: value })} />
              <span>{t('Shown on the site')}</span>
            </label>
          </div>
          <div style={styles.fields}>
            <div style={{ ...styles.field, flex: '2 1 320px' }}>
              <Label>{t('Icon')}</Label>
              <Input value={draft.iconUrl} placeholder="https://…/icon.svg" onChange={(event) => set({ iconUrl: event.target.value })} />
            </div>
            <Colour label="Button colour" value={draft.buttonColor} t={t} onChange={(buttonColor) => set({ buttonColor })} />
            <Colour label="Text colour" value={draft.buttonTextColor} t={t} onChange={(buttonTextColor) => set({ buttonTextColor })} />
          </div>
          <div style={styles.field}>
            <Label>{t('The button')}</Label>
            <div><ButtonPreview method={draft} /></div>
          </div>

          <details style={styles.more}>
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{t('More')}</summary>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 12 }}>
              <div style={styles.field}>
                <Label>{t('What it is used for')}</Label>
                {open.purposeOptions.map((purpose) => (
                  <label key={purpose} style={styles.check}>
                    <input type="checkbox" checked={draft.purposes.includes(purpose)} onChange={(event) => set({ purposes: toggleIn(draft.purposes, purpose, event.target.checked) })} />
                    {t(PURPOSES[purpose] || purpose)}
                  </label>
                ))}
              </div>
              <div style={styles.field}>
                <Label>{t('Countries')}</Label>
                <Input value={draft.countries.join(', ')} placeholder="RU, KZ" style={{ maxWidth: 320 }}
                  onChange={(event) => set({ countries: event.target.value.split(',').map((item) => item.trim().toUpperCase()).filter(Boolean) })} />
                <p style={styles.hint}>{t('Two-letter codes; empty - every country')}</p>
              </div>
              {channels.length > 0 && (
                <div style={styles.field}>
                  <Label>{t('Sales channels')}</Label>
                  {channels.map((channel) => (
                    <label key={channel.key} style={styles.check}>
                      <input type="checkbox" checked={draft.salesChannels.includes(channel.key)} onChange={(event) => set({ salesChannels: toggleIn(draft.salesChannels, channel.key, event.target.checked) })} />
                      {channel.title || channel.key}
                    </label>
                  ))}
                  <p style={styles.hint}>{t('None ticked - every channel')}</p>
                </div>
              )}
              <div style={styles.fields}>
                {draft.kind === 'phone_proof' && (
                  <>
                    <div style={styles.field}>
                      <Label>{t('Code lives, sec')}</Label>
                      <Input type="number" min="0" value={draft.ttlSec} style={{ width: 140 }} onChange={(event) => set({ ttlSec: Number(event.target.value) })} />
                    </div>
                    <div style={styles.field}>
                      <Label>{t('Pause between sends, sec')}</Label>
                      <Input type="number" min="0" value={draft.resendAfterSec} style={{ width: 140 }} onChange={(event) => set({ resendAfterSec: Number(event.target.value) })} />
                    </div>
                  </>
                )}
                <div style={styles.field}>
                  <Label>{t('Cost of a use')}</Label>
                  <Input type="number" min="0" value={draft.cost} style={{ width: 140 }} onChange={(event) => set({ cost: Number(event.target.value) })} />
                </div>
                {draft.kind === 'identity' && (
                  <div style={styles.field}>
                    <Label>{t('Accounts of a customer in it')}</Label>
                    <Input type="number" min="1" value={draft.maxPerUser ?? ''} placeholder={t('General setting')} style={{ width: 160 }}
                      onChange={(event) => set({ maxPerUser: event.target.value === '' ? null : Number(event.target.value) })} />
                  </div>
                )}
              </div>
              {draft.kind === 'phone_proof' && <p style={styles.hint}>{t('0 - the general setting')}</p>}
              {draft.kind === 'identity' && (
                <label style={styles.check}>
                  <input type="checkbox" checked={draft.requirePhoneVerification} onChange={(event) => set({ requirePhoneVerification: event.target.checked })} />
                  {t('Confirm the phone by a code after this sign-in')}
                </label>
              )}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
