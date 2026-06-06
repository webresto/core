import React, { useEffect, useMemo, useState } from 'react';
import { styles, safeJson, toast } from './shared';
import { ConfirmDialog } from '../ConfirmDialog';

const { Button, Input, Label, Badge, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } = window.UIComponents;
const { VanillaJSONEditor } = window.JSComponents || {};

// Wrapper around VanillaJSONEditor mirroring settings-manager.jsx: stable onChange ref so the
// editor isn't corrupted on parent re-renders; invalid JSON simply doesn't propagate onChange.
function JsonEditor({ value, onChange }) {
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;
  const stableOnChange = React.useCallback((content) => {
    if (content?.json !== undefined) onChangeRef.current(content.json);
    else if (content?.text !== undefined) {
      try { onChangeRef.current(JSON.parse(content.text)); } catch { /* invalid JSON: ignore */ }
    }
  }, []);
  if (!VanillaJSONEditor) {
    return (
      <textarea
        style={{ ...styles.input, fontFamily: 'monospace', minHeight: 160 }}
        value={typeof value === 'string' ? value : safeJson(value)}
        onChange={(e) => { try { onChange(JSON.parse(e.target.value)); } catch { /* ignore */ } }}
      />
    );
  }
  return <VanillaJSONEditor content={value ?? {}} onChange={stableOnChange} />;
}

function ResultCard({ entry, t }) {
  const render = entry.render || {};
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12, background: 'var(--card)', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <strong style={styles.code}>{entry.typeKey}</strong>
        <Badge variant={entry.status === 'error' ? 'destructive' : 'secondary'}>{entry.status}</Badge>
        {entry.scheduledAt && <Badge variant="outline">{t('Scheduled')}: {new Date(entry.scheduledAt).toLocaleString()}</Badge>}
        {typeof entry.maxDeliveryCost === 'number' && <Badge variant="outline">{t('Budget')}: {entry.maxDeliveryCost}</Badge>}
      </div>
      {entry.reason && <div style={{ ...styles.help, color: 'var(--destructive)' }}>{entry.reason}</div>}
      {(render.title || render.body) && (
        <div style={{ ...styles.help }}>
          <div><strong style={{ color: 'var(--foreground)' }}>{t('Title')}:</strong> {render.title || '—'}</div>
          <div><strong style={{ color: 'var(--foreground)' }}>{t('Body')}:</strong> {render.body || '—'}</div>
        </div>
      )}
      {Array.isArray(entry.requestedChannels) && entry.requestedChannels.length > 0 && (
        <div style={styles.help}><strong style={{ color: 'var(--foreground)' }}>{t('Would send via')}:</strong> {entry.requestedChannels.join(', ')}</div>
      )}
    </div>
  );
}

/**
 * Send-test panel (§7 "Send test"). Fires an event through /emit-test. dryRun shows matched types
 * + rendered content without creating records; "Send real" (ConfirmDialog) actually delivers.
 */
export default function SendTestPanel({ t, notificationsApi, events, locales, defaultLocale, lockedEventKey }) {
  const eventList = Array.isArray(events) ? events : [];
  const localeList = Array.isArray(locales) ? locales : [];

  const [eventKey, setEventKey] = useState(lockedEventKey || (eventList[0]?.key || ''));
  const [userId, setUserId] = useState('');
  const [locale, setLocale] = useState(defaultLocale || '');
  const [context, setContext] = useState({});
  const [results, setResults] = useState(null);
  const [registered, setRegistered] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [confirmReal, setConfirmReal] = useState(false);

  useEffect(() => { if (lockedEventKey) setEventKey(lockedEventKey); }, [lockedEventKey]);

  const selectedEvent = useMemo(() => eventList.find((e) => e.key === eventKey) || null, [eventList, eventKey]);

  // Seed the context editor with the event's documented context branches as a hint.
  useEffect(() => {
    const keys = Array.isArray(selectedEvent?.contextKeys) ? selectedEvent.contextKeys : [];
    if (keys.length === 0) return;
    setContext((current) => {
      if (current && Object.keys(current).length > 0) return current;
      const seed = {};
      for (const k of keys) seed[k] = {};
      return seed;
    });
  }, [selectedEvent]);

  const run = async (dryRun) => {
    if (!eventKey) { setError(t('Event key is required')); return; }
    setRunning(true);
    setError('');
    try {
      const recipient = {};
      if (userId.trim()) recipient.userId = userId.trim();
      if (locale) recipient.locale = locale;
      const response = await notificationsApi('/core/notifications-manager/emit-test', {
        method: 'POST',
        body: JSON.stringify({ eventKey, recipient, context, dryRun }),
      });
      if (!response.ok) throw new Error(response.payload?.error || 'Request failed');
      setResults(Array.isArray(response.payload?.results) ? response.payload.results : []);
      setRegistered(response.payload?.registered ?? null);
      toast(dryRun ? 'success' : 'success', dryRun ? t('Dry-run complete') : t('Test notification sent'));
    } catch (e) {
      setError(String(e?.message || e));
      toast('error', String(e?.message || e));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))' }}>
        {!lockedEventKey && (
          <div style={styles.field}>
            <Label style={styles.fieldLabel}>{t('Event')}</Label>
            <Select value={eventKey} onValueChange={setEventKey}>
              <SelectTrigger><SelectValue placeholder={t('Select event')} /></SelectTrigger>
              <SelectContent>
                {eventList.map((e) => <SelectItem key={e.key} value={e.key}>{e.name || e.key}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <div style={styles.field}>
          <Label style={styles.fieldLabel}>{t('Recipient user id')}</Label>
          <Input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder={t('Optional')} />
        </div>
        <div style={styles.field}>
          <Label style={styles.fieldLabel}>{t('Locale')}</Label>
          <Select value={locale || '__none'} onValueChange={(v) => setLocale(v === '__none' ? '' : v)}>
            <SelectTrigger><SelectValue placeholder={t('Auto')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">{t('Auto')}</SelectItem>
              {localeList.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedEvent && Array.isArray(selectedEvent.contextKeys) && selectedEvent.contextKeys.length > 0 && (
        <div style={styles.help}>
          {t('Context branches')}: {selectedEvent.contextKeys.map((k) => <code key={k} style={{ ...styles.code, marginRight: 6 }}>{k}</code>)}
        </div>
      )}

      <div style={styles.field}>
        <Label style={styles.fieldLabel}>{t('Test context (JSON)')}</Label>
        <JsonEditor value={context} onChange={setContext} />
      </div>

      {error && <div style={{ ...styles.help, color: 'var(--destructive)' }}>{error}</div>}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button type="button" onClick={() => run(true)} disabled={running || !eventKey}>
          {running ? t('Running...') : t('Run dry-run')}
        </Button>
        <Button type="button" variant="destructive" onClick={() => setConfirmReal(true)} disabled={running || !eventKey}>
          {t('Send real')}
        </Button>
      </div>

      {registered === false && (
        <div style={{ ...styles.help, color: 'var(--destructive)' }}>{t('Event is not registered; nothing will be emitted.')}</div>
      )}

      {Array.isArray(results) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <strong style={{ fontSize: 14 }}>{t('Matched types')}: {results.length}</strong>
          {results.length === 0
            ? <div style={styles.help}>{t('No enabled types matched this event.')}</div>
            : results.map((entry) => <ResultCard key={entry.typeKey} entry={entry} t={t} />)}
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmReal}
        onClose={() => setConfirmReal(false)}
        onConfirm={() => run(false)}
        title={t('Send real notification?')}
        message={t('This will create notification records and run the delivery waterfall for all matched enabled types.')}
        confirmText={t('Send real')}
        cancelText={t('Cancel')}
      />
    </div>
  );
}
