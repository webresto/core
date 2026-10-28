import React, { useEffect, useState } from 'react';
import { I18nProvider, useTranslation } from './i18n/I18nContext';
import { requireAdminApi, extractApiErrorMessage } from './lib/admin-api';
import { useAsk } from './components/AskDialog';

// The page "Scheduled maintenance" (controller/maintenance-manager.ts): the periods the site is closed for orders.
// A maintenance closes it while switched on and its period - none, or from-to - holds; the storefront shows its
// title and text. The text is plain here: a line is a paragraph, it is stored as the HTML the storefront shows.

const { Button, Input, Label, Switch, Textarea, Toaster } = window.UIComponents;
const Icons = window.LucideReact;

const styles = {
  page: { display: 'flex', flexDirection: 'column', gap: 20, color: 'var(--foreground)' },
  title: { fontSize: 22, fontWeight: 600, margin: 0 },
  hint: { fontSize: 13, color: 'var(--muted-foreground)', margin: 0 },
  card: { border: '1px solid var(--border)', borderRadius: 10, padding: 16, background: 'var(--background)', display: 'flex', flexDirection: 'column', gap: 12 },
  bar: { position: 'sticky', top: 0, zIndex: 20, background: 'var(--background)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: '8px 0 12px', borderBottom: '1px solid var(--border)' },
  row: { display: 'flex', alignItems: 'center', gap: 12, padding: '8px 4px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' },
  muted: { fontSize: 13, color: 'var(--muted-foreground)' },
  // the title of a row opens the editor: a link of the panel's colour, underlined under the pointer (class hover:underline)
  link: { background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--ring)', fontWeight: 500, fontSize: 15, textAlign: 'left' },
  closed: { fontSize: 12, fontWeight: 600, color: '#dc2626', border: '1px solid #dc2626', borderRadius: 999, padding: '2px 10px', marginLeft: 'auto' },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  fields: { display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' },
  invalid: { borderColor: 'var(--destructive)' },
};

const decode = (text) => text.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const encode = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** the stored HTML as lines: a paragraph or a break - a line, the other tags dropped */
const toText = (html) => decode(String(html || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|h\d)>/gi, '\n').replace(/<[^>]+>/g, ''))
  .split('\n').map((line) => line.trim()).filter(Boolean).join('\n');
/** the lines as the storefront's HTML: a paragraph each */
const toHtml = (text) => text.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => `<p>${encode(line)}</p>`).join('');

/** an ISO moment as the value of a datetime-local field, in the browser's time */
const toLocal = (iso) => {
  if (!iso) return '';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const holdsNow = (item) => (!item.startDate || new Date(item.startDate) <= new Date()) && (!item.stopDate || new Date(item.stopDate) >= new Date());

export default function MaintenanceManager(props) {
  return (
    <I18nProvider initialLocale={props?.locale} messages={props?.messages}>
      <MaintenanceManagerContent routePrefix={props?.routePrefix} />
    </I18nProvider>
  );
}

function MaintenanceManagerContent({ routePrefix }) {
  const { t, language } = useTranslation();
  const [ask, dialog] = useAsk();
  const base = `${routePrefix || '/admin'}/core/maintenance`;
  const toast = (kind, message) => window.sonner?.toast?.[kind]?.(message);
  const failed = (error, fallback) => toast('error', t(extractApiErrorMessage(error) || fallback));

  const [list, setList] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [open, setOpen] = useState(null);
  const [draft, setDraft] = useState(null);
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  const FIELDS = ['title', 'text', 'enable', 'startDate', 'stopDate'];
  const dirty = !!open && !!draft && (open.id === null || FIELDS.some((field) => draft[field] !== open[field]));
  const take = (data) => { setList(data.maintenances); setActiveId(data.activeId); return data; };

  async function load() {
    try {
      take((await requireAdminApi().get(base)).data);
    } catch (error) {
      setList([]);
      failed(error, 'The maintenances are not loaded');
    }
  }
  useEffect(() => { load(); }, []);

  function edit(item) {
    const values = item && { id: item.id ?? null, title: item.title || '', text: toText(item.description), enable: item.enable === true, startDate: toLocal(item.startDate), stopDate: toLocal(item.stopDate) };
    setOpen(values);
    setDraft(values);
    setChecked(false);
  }
  const set = (patch) => setDraft((current) => ({ ...current, ...patch }));
  const leave = async () => !dirty || ask({ title: t('Unsaved changes'), text: t('Unsaved changes will be lost. Continue?'), yes: t('Continue'), no: t('Cancel') });
  /** switching on a maintenance whose period holds now closes the site: asked first */
  const closesSite = (item) => ask({ title: t('Close the site?'), text: t('The site takes no orders while the maintenance lasts.'), yes: t('Switch on'), no: t('Cancel'), danger: true });

  async function toggle(item, enable) {
    if (enable && holdsNow(item) && !(await closesSite(item))) return;
    try {
      take((await requireAdminApi().post(`${base}/${item.id}`, { enable })).data);
      toast('success', t(enable ? 'Switched on' : 'Switched off'));
    } catch (error) {
      failed(error, 'The maintenance is not saved');
    }
  }

  async function save() {
    setChecked(true);
    if (!draft.title.trim()) {
      toast('error', t('A maintenance needs a title'));
      return;
    }
    const period = { startDate: draft.startDate && new Date(draft.startDate).toISOString(), stopDate: draft.stopDate && new Date(draft.stopDate).toISOString() };
    const wasOn = open.id !== null && open.enable && holdsNow({ startDate: open.startDate && new Date(open.startDate).toISOString(), stopDate: open.stopDate && new Date(open.stopDate).toISOString() });
    if (draft.enable && holdsNow(period) && !wasOn && !(await closesSite(draft))) return;
    setSaving(true);
    try {
      const url = open.id === null ? base : `${base}/${open.id}`;
      const data = take((await requireAdminApi().post(url, { title: draft.title, description: toHtml(draft.text), enable: draft.enable, ...period })).data);
      edit(data.maintenances.find((item) => item.id === data.id));
      toast('success', t('Saved'));
    } catch (error) {
      failed(error, 'The maintenance is not saved');
    } finally {
      setSaving(false);
    }
  }

  async function remove(item) {
    if (!(await ask({ title: t('Delete'), text: t('Delete the maintenance «{title}»?', { title: item.title }), yes: t('Delete'), no: t('Cancel'), danger: true }))) return;
    try {
      take((await requireAdminApi().post(`${base}/${item.id}/delete`, {})).data);
      if (open) edit(null);
    } catch (error) {
      failed(error, 'The maintenance is not saved');
    }
  }

  const when = (iso) => (iso ? new Date(iso).toLocaleString(language, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');
  const period = (item) => {
    if (item.startDate && item.stopDate) return t('from {start} to {stop}', { start: when(item.startDate), stop: when(item.stopDate) });
    if (item.startDate) return t('from {start}', { start: when(item.startDate) });
    if (item.stopDate) return t('until {stop}', { stop: when(item.stopDate) });
    return t('no period: while switched on');
  };

  return (
    <div style={styles.page}>
      <Toaster position="top-center" richColors closeButton />
      {dialog}
      <div>
        <h1 style={styles.title}>{t('Scheduled maintenance')}</h1>
        <p style={styles.hint}>{t('While a maintenance is switched on and its period holds, the site takes no orders and shows its title and text.')}</p>
      </div>

      {list === null && <p style={styles.hint}>{t('Loading…')}</p>}

      {list !== null && !open && (
        <div style={styles.card}>
          <div><Button variant="default" size="sm" onClick={() => edit({ id: null, enable: false })}><Icons.Plus /> {t('New maintenance')}</Button></div>
          {list.length === 0 && <p style={styles.hint}>{t('No maintenances yet')}</p>}
          <div>
            {list.map((item) => (
              <div key={item.id} data-maintenance={item.id} style={styles.row}>
                <span title={t('Switched on')} style={{ display: 'flex' }}>
                  <Switch checked={item.enable === true} onCheckedChange={(value) => toggle(item, value)} />
                </span>
                <Button variant="outline" size="sm" onClick={() => edit(item)}><Icons.Pencil /> {t('Edit')}</Button>
                <Button variant="destructive" size="icon" title={t('Delete')} aria-label={t('Delete')} onClick={() => remove(item)}><Icons.Trash2 /></Button>
                <button type="button" className="hover:underline" style={styles.link} onClick={() => edit(item)}>{item.title}</button>
                <span style={styles.muted}>{period(item)}</span>
                {item.id === activeId && <span style={styles.closed}>{t('The site is closed now')}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {open && draft && (
        <div style={styles.card}>
          <div style={styles.bar}>
            <Button variant="ghost" size="sm" onClick={async () => (await leave()) && edit(null)}><Icons.ArrowLeft /> {t('To the list')}</Button>
            <Button variant="default" disabled={!dirty || saving} onClick={save}>{t('Save')}</Button>
            {open.id !== null && <Button variant="outline" disabled={!dirty || saving} onClick={() => edit(list.find((item) => item.id === open.id))}>{t('Undo changes')}</Button>}
            {open.id !== null && <Button variant="destructive" size="icon" style={{ marginLeft: 'auto' }} title={t('Delete')} aria-label={t('Delete')} onClick={() => remove(list.find((item) => item.id === open.id))}><Icons.Trash2 /></Button>}
          </div>
          <div style={styles.fields}>
            <div style={{ ...styles.field, flex: '2 1 320px' }}>
              <Label>{t('Title')}</Label>
              <Input value={draft.title} style={checked && !draft.title.trim() ? styles.invalid : undefined} onChange={(event) => set({ title: event.target.value })} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 8 }}>
              <Switch checked={draft.enable} onCheckedChange={(value) => set({ enable: value })} />
              <span>{t('Switched on')}</span>
            </label>
          </div>
          <div style={styles.field}>
            <Label>{t('Text for the customers')}</Label>
            <Textarea value={draft.text} rows={5} onChange={(event) => set({ text: event.target.value })} />
            <p style={styles.hint}>{t('A line is a paragraph.')}</p>
          </div>
          <div style={styles.fields}>
            <div style={styles.field}>
              <Label>{t('From')}</Label>
              <Input type="datetime-local" value={draft.startDate} onChange={(event) => set({ startDate: event.target.value })} />
            </div>
            <div style={styles.field}>
              <Label>{t('To')}</Label>
              <Input type="datetime-local" value={draft.stopDate} onChange={(event) => set({ stopDate: event.target.value })} />
            </div>
            <p style={{ ...styles.hint, paddingBottom: 10 }}>{t('Empty - no bound: while switched on')}</p>
          </div>
        </div>
      )}
    </div>
  );
}
