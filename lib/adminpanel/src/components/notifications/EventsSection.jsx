import React, { useMemo, useState } from 'react';
import { styles, useIsMobile } from './shared';

const { Input, Badge, Button } = window.UIComponents;

/**
 * Events section (§6) — read-only catalog. Events are registered in code, never created/edited
 * from the UI. Shows each event with its contextKeys and bound-types counter; lets the operator
 * jump to creating a new type for an event (prefilled eventKey).
 */
export default function EventsSection({ t, events, types, onAddTypeForEvent }) {
  const isMobile = useIsMobile();
  const [search, setSearch] = useState('');
  const [selectedKey, setSelectedKey] = useState('');

  const eventList = Array.isArray(events) ? events : [];
  const typeList = Array.isArray(types) ? types : [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return eventList;
    return eventList.filter((e) =>
      [e.key, e.name, e.description, e.sourceModule].some((v) => String(v || '').toLowerCase().includes(q)));
  }, [eventList, search]);

  const selected = useMemo(() => eventList.find((e) => e.key === selectedKey) || null, [eventList, selectedKey]);
  const boundTypes = useMemo(
    () => (selected ? typeList.filter((typeItem) => typeItem.eventKey === selected.key) : []),
    [selected, typeList],
  );

  return (
    <div style={{ display: 'grid', gap: isMobile ? 16 : 24, gridTemplateColumns: isMobile ? '1fr' : 'minmax(320px, 0.9fr) minmax(360px, 1.1fr)', alignItems: 'start' }}>
      {/* List */}
      <section style={styles.panel}>
        <div>
          <h2 style={styles.sectionTitle}>{t('Events')}</h2>
          <p style={styles.sectionDescription}>{t('Read-only catalog of business triggers. Registered in code; bind notification types to them.')}</p>
        </div>
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('Search events')} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.length === 0 ? (
            <div style={styles.help}>{t('No events found')}</div>
          ) : filtered.map((e) => {
            const active = e.key === selectedKey;
            return (
              <button key={e.key} type="button" onClick={() => setSelectedKey(e.key)}
                style={{
                  textAlign: 'left', border: active ? '1px solid var(--primary)' : '1px solid var(--border)',
                  borderRadius: 12, padding: 12, background: active ? 'var(--accent)' : 'var(--card)', color: 'var(--foreground)', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', gap: 6,
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                  <strong style={{ fontSize: 14 }}>{e.name || e.key}</strong>
                  {e.sourceModule && <Badge variant="outline">{e.sourceModule}</Badge>}
                </div>
                <code style={{ ...styles.code, fontSize: 12, color: 'var(--muted-foreground)' }}>{e.key}</code>
                {e.description && <span style={styles.help}>{e.description}</span>}
                <span style={styles.help}>{t('{n} types ({m} enabled)', { n: e.typesCount ?? 0, m: e.enabledTypesCount ?? 0 })}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Detail */}
      <section style={styles.panel}>
        {!selected ? (
          <div style={styles.help}>{t('Select an event to see details.')}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div>
                <h2 style={styles.sectionTitle}>{selected.name || selected.key}</h2>
                <code style={{ ...styles.code, fontSize: 12, color: 'var(--muted-foreground)' }}>{selected.key}</code>
              </div>
              {onAddTypeForEvent && (
                <Button type="button" onClick={() => onAddTypeForEvent(selected.key)}>+ {t('Add type for this event')}</Button>
              )}
            </div>
            {selected.description && <p style={styles.sectionDescription}>{selected.description}</p>}

            <div>
              <h3 style={styles.subsectionTitle}>{t('Context branches')}</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {(Array.isArray(selected.contextKeys) ? selected.contextKeys : []).map((k) => (
                  <code key={k} style={{ ...styles.code, fontSize: 12, padding: '2px 8px', borderRadius: 6, background: 'var(--muted)' }}>{k}</code>
                ))}
                {(!selected.contextKeys || selected.contextKeys.length === 0) && <span style={styles.help}>—</span>}
              </div>
            </div>

            <div>
              <h3 style={styles.subsectionTitle}>{t('Bound notification types')}</h3>
              {boundTypes.length === 0 ? (
                <p style={styles.help}>{t('No types bound to this event yet.')}</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
                  {boundTypes.map((typeItem) => (
                    <div key={typeItem.key} style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between', border: '1px solid var(--border)', borderRadius: 10, padding: 10, background: 'var(--card)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <strong style={{ fontSize: 13 }}>{typeItem.name || typeItem.key}</strong>
                        <code style={{ ...styles.code, fontSize: 11, color: 'var(--muted-foreground)' }}>{typeItem.key}</code>
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <Badge variant={typeItem.enabled ? 'secondary' : 'outline'}>{typeItem.enabled ? t('Enabled') : t('Disabled')}</Badge>
                        <Badge variant="outline">{typeItem.channelsMode || 'waterfall'}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
