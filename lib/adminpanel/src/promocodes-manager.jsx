import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { I18nProvider, useTranslation } from './i18n/I18nContext';
import { ConfirmDialog } from './components/ConfirmDialog';
import WorktimeEditor from './components/WorktimeEditor';
import {
  styles, toast, getBaseAdminPath, notificationsApi as api,
  formatDateTime, COST_NUM_STYLE, useIsMobile,
} from './components/notifications/shared';

const {
  Button, Input, Textarea, Label, Badge, Switch,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} = window.UIComponents;
const { MultiSelect } = window.JSComponents || {};

const STATUS_COLORS = { active: '#16a34a', scheduled: '#d97706', expired: '#64748b' };
const APPLY_STATUS_COLORS = { applied: '#16a34a', invalid: '#dc2626' };
const TREND_COLOR = '#6366f1';
const TOP_COLOR = '#0ea5e9';
const PAGE_SIZE = 50;
const RANGE_OPTIONS = [{ days: 7, key: '7 days' }, { days: 30, key: '30 days' }, { days: 90, key: '90 days' }];

// ─────────────────────────────── formatting helpers ───────────────────────────────
function formatCount(value, language) {
  const n = Number(value) || 0;
  try { return new Intl.NumberFormat(language, { notation: 'compact', maximumFractionDigits: 1 }).format(n); }
  catch { return String(n); }
}
function formatMoney(value, language) {
  const n = Number(value) || 0;
  try { return new Intl.NumberFormat(language, { maximumFractionDigits: 2 }).format(n); }
  catch { return n.toFixed(2); }
}
function formatDayLabel(dateStr, language) {
  const parts = String(dateStr || '').split('-');
  if (parts.length !== 3) return dateStr || '';
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  if (Number.isNaN(d.getTime())) return dateStr;
  try { return new Intl.DateTimeFormat(language, { month: 'short', day: 'numeric' }).format(d); }
  catch { return `${parts[2]}.${parts[1]}`; }
}

function statusLabel(status, t) {
  const map = { active: 'Active', scheduled: 'Scheduled', expired: 'Expired', applied: 'Applied', invalid: 'Invalid' };
  return t(map[status] || status || '—');
}

// Human-readable summary of a promotion's discount (server sends a structured `discount`).
function discountText(discount, t, language) {
  if (!discount || !discount.type) return t('No discount configured');
  const value = discount.type === 'percentage' ? `−${discount.amount}%` : `−${formatMoney(discount.amount, language)}`;
  let scope = '';
  if (discount.scope === 'all') scope = t('on the whole cart');
  else if (discount.scope === 'groups') scope = `${t('on groups')} (${discount.groupsCount})`;
  else if (discount.scope === 'dishes') scope = `${t('on dishes')} (${discount.dishesCount})`;
  else if (discount.scope === 'mixed') scope = t('on selected items');
  return scope ? `${value} · ${scope}` : value;
}

// ─────────────────────────────── hash routing ───────────────────────────────
function parseHash() {
  if (typeof window === 'undefined') return { tab: 'codes', codeId: '', creating: false };
  const hash = String(window.location.hash || '').replace(/^#/, '');
  const lower = hash.toLowerCase();
  if (lower === 'dashboard') return { tab: 'dashboard', codeId: '', creating: false };
  if (lower === 'activity') return { tab: 'activity', codeId: '', creating: false };
  if (lower === 'new') return { tab: 'codes', codeId: '', creating: true };
  if (lower.startsWith('code/')) return { tab: 'codes', codeId: decodeURIComponent(hash.slice('code/'.length)), creating: false };
  return { tab: 'codes', codeId: '', creating: false };
}
function setHash(next) {
  if (typeof window === 'undefined') return;
  const nextHash = `#${next}`;
  if (window.location.hash === nextHash) return;
  window.history.pushState(null, '', `${window.location.pathname}${window.location.search}${nextHash}`);
  // pushState fires neither hashchange nor popstate; notify our own listeners.
  window.dispatchEvent(new Event('hashchange'));
}

// ─────────────────────────────── small UI atoms ───────────────────────────────
function StatCard({ label, value, hint }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 14, background: 'var(--card)', padding: 18, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</span>
      <strong style={{ fontSize: 28, lineHeight: '32px', ...COST_NUM_STYLE }}>{value}</strong>
      {hint ? <span style={styles.help}>{hint}</span> : null}
    </div>
  );
}

function StatusPill({ status, t }) {
  const color = STATUS_COLORS[status] || APPLY_STATUS_COLORS[status] || '#94a3b8';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600 }}>
      <span style={{ width: 8, height: 8, borderRadius: 999, background: color }} />
      {statusLabel(status, t)}
    </span>
  );
}

function CopyButton({ value, t }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    if (!value) return;
    const done = () => { setCopied(true); setTimeout(() => setCopied(false), 1500); };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(value).then(done).catch(() => {});
    else done();
  };
  return (
    <Button variant="outline" size="sm" onClick={copy} title={t('Copy')}>{copied ? t('Copied!') : '⧉'}</Button>
  );
}

// ─────────────────────────────── Dashboard ───────────────────────────────
function DashboardSection({ t, language }) {
  const isMobile = useIsMobile();
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hover, setHover] = useState(null);

  const load = useCallback(async (rangeDays) => {
    setLoading(true); setError('');
    const res = await api(`/core/marketing/promocodes/stats?days=${encodeURIComponent(rangeDays)}`);
    if (!res.ok) { setError(res.payload?.error || 'Failed to load stats'); setLoading(false); return; }
    setStats(res.payload || null); setLoading(false);
  }, []);

  useEffect(() => { load(days); }, [days, load]);

  const summary = stats?.summary || { totalCodes: 0, activeCodes: 0, applications: 0, appliedCount: 0, invalidCount: 0, totalDiscount: 0, avgDiscount: 0 };
  const series = Array.isArray(stats?.series) ? stats.series : [];
  const topCodes = Array.isArray(stats?.topCodes) ? stats.topCodes : [];
  const statuses = Array.isArray(stats?.statuses) ? stats.statuses : [];
  const maxApplications = useMemo(() => series.reduce((m, p) => Math.max(m, p.applications || 0), 0), [series]);
  const maxTop = useMemo(() => topCodes.reduce((m, c) => Math.max(m, c.applications || 0), 0), [topCodes]);
  const statusTotal = statuses.reduce((s, x) => s + (x.count || 0), 0);
  const labelEvery = series.length > 31 ? 7 : series.length > 14 ? 3 : 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <section style={styles.panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div>
            <h2 style={styles.sectionTitle}>{t('Dashboard')}</h2>
            <p style={styles.sectionDescription}>{t('How promo codes are applied and how much discount they generate over time.')}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
            <div style={{ display: 'flex', flex: isMobile ? '1 1 auto' : '0 0 auto', gap: 4, padding: 4, border: '1px solid var(--border)', borderRadius: 12, background: 'var(--muted)' }}>
              {RANGE_OPTIONS.map((o) => {
                const active = o.days === days;
                return (
                  <button key={o.days} type="button" onClick={() => setDays(o.days)}
                    style={{ flex: isMobile ? '1 1 auto' : '0 0 auto', border: '1px solid transparent', borderRadius: 9, background: active ? 'var(--card)' : 'transparent', color: active ? 'var(--foreground)' : 'var(--muted-foreground)', padding: '6px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: active ? '0 1px 2px rgba(0,0,0,0.08)' : 'none' }}>
                    {t(o.key)}
                  </button>
                );
              })}
            </div>
            <Button variant="outline" size="sm" onClick={() => load(days)} disabled={loading}>{loading ? t('Refreshing...') : t('Refresh')}</Button>
          </div>
        </div>

        {error && <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--destructive)', color: '#fff', opacity: 0.9 }}>{error}</div>}
        {summary.capped && <div style={{ ...styles.help, color: '#d97706' }}>{t('Showing a capped sample of the most recent orders.')}</div>}

        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <StatCard label={t('Active codes')} value={formatCount(summary.activeCodes, language)} hint={`${t('of')} ${formatCount(summary.totalCodes, language)} ${t('total')}`} />
          <StatCard label={t('Applications')} value={formatCount(summary.applications, language)} hint={t('Orders with a promo code in this period')} />
          <StatCard label={t('Total discount')} value={formatMoney(summary.totalDiscount, language)} hint={t('Sum of discounts granted')} />
          <StatCard label={t('Average discount')} value={formatMoney(summary.avgDiscount, language)} hint={t('Per application')} />
        </div>
      </section>

      <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(min(360px, 100%), 1fr))', alignItems: 'start' }}>
        {/* Applications trend */}
        <section style={styles.panel}>
          <div><h3 style={styles.subsectionTitle}>{t('Applications over time')}</h3><p style={styles.help}>{t('Promo-code applications per day.')}</p></div>
          {maxApplications <= 0 ? (
            <div style={{ ...styles.help, height: 200, display: 'flex', alignItems: 'center' }}>{t('No applications in this period')}</div>
          ) : (
            <div style={{ position: 'relative' }} onMouseLeave={() => setHover(null)}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: series.length > 45 ? 1 : 3, height: 200 }}>
                {series.map((p, i) => {
                  const pct = maxApplications > 0 ? (p.applications / maxApplications) * 100 : 0;
                  const active = hover === i;
                  return (
                    <div key={p.date} onMouseEnter={() => setHover(i)} style={{ flex: 1, minWidth: 0, height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                      <div style={{ width: '100%', maxWidth: 28, height: `${pct}%`, minHeight: p.applications > 0 ? 2 : 0, background: TREND_COLOR, borderRadius: '4px 4px 0 0', opacity: hover == null || active ? 1 : 0.55, transition: 'opacity .15s ease' }} />
                    </div>
                  );
                })}
              </div>
              <span style={{ position: 'absolute', top: 0, left: 0, fontSize: 10, color: 'var(--muted-foreground)', background: 'var(--card)', padding: '0 2px', ...COST_NUM_STYLE }}>{maxApplications}</span>
              {hover != null && series[hover] && (
                <div style={{ position: 'absolute', top: 4, left: `${((hover + 0.5) / series.length) * 100}%`, transform: `translateX(${hover < series.length * 0.25 ? '0' : hover > series.length * 0.75 ? '-100%' : '-50%'})`, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 10px 24px rgba(0,0,0,0.18)', padding: '8px 10px', fontSize: 12, pointerEvents: 'none', minWidth: 140 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{formatDayLabel(series[hover].date, language)}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span>{t('Applications')}</span><strong style={COST_NUM_STYLE}>{series[hover].applications}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span>{t('Discount')}</span><strong style={COST_NUM_STYLE}>{formatMoney(series[hover].discount, language)}</strong></div>
                </div>
              )}
              <div style={{ display: 'flex', gap: series.length > 45 ? 1 : 3, marginTop: 8 }}>
                {series.map((p, i) => (
                  <div key={p.date} style={{ flex: 1, minWidth: 0, textAlign: 'center', fontSize: 10, color: 'var(--muted-foreground)', whiteSpace: 'nowrap', overflow: 'hidden' }}>{i % labelEvery === 0 ? formatDayLabel(p.date, language) : ''}</div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Top codes + status */}
        <section style={styles.panel}>
          <div><h3 style={styles.subsectionTitle}>{t('Top promo codes')}</h3><p style={styles.help}>{t('Most-applied codes in this period.')}</p></div>
          {topCodes.length === 0 ? (
            <div style={styles.help}>{t('No applications in this period')}</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {topCodes.map((c) => {
                const pct = maxTop > 0 ? Math.max((c.applications / maxTop) * 100, 2) : 0;
                return (
                  <div key={c.code} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
                      <code style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.code}</code>
                      <span style={{ fontSize: 12, color: 'var(--muted-foreground)', whiteSpace: 'nowrap', ...COST_NUM_STYLE }}>{c.applications} · {formatMoney(c.discount, language)}</span>
                    </div>
                    <div style={{ height: 10, borderRadius: 6, background: 'var(--muted)', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', borderRadius: 6, background: TOP_COLOR }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ marginTop: 8 }}>
            <h3 style={styles.subsectionTitle}>{t('Application status')}</h3>
            {statusTotal === 0 ? (
              <div style={styles.help}>{t('No applications in this period')}</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                <div style={{ display: 'flex', height: 14, borderRadius: 7, overflow: 'hidden', background: 'var(--muted)' }}>
                  {statuses.map((s) => {
                    const pct = statusTotal > 0 ? (s.count / statusTotal) * 100 : 0;
                    if (pct <= 0) return null;
                    return <div key={s.status} title={`${statusLabel(s.status, t)}: ${s.count}`} style={{ width: `${pct}%`, background: APPLY_STATUS_COLORS[s.status] || '#94a3b8' }} />;
                  })}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  {statuses.map((s) => (
                    <span key={s.status} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted-foreground)' }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: APPLY_STATUS_COLORS[s.status] || '#94a3b8' }} />
                      <span style={{ color: 'var(--foreground)', fontWeight: 600 }}>{statusLabel(s.status, t)}</span>
                      <span style={COST_NUM_STYLE}>{s.count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

// ─────────────────────────────── Code editor ───────────────────────────────
function blankCode() {
  return {
    id: '', code: '', description: '', type: 'static',
    startDate: '', stopDate: '', workTime: null,
    externalId: '', prefix: '', generateConfig: null, customData: null,
    promotionIds: [], promotion: [],
  };
}

function CodeEditor({ t, language, draft, setDraft, baseline, promotions, saving, onSave, onDelete, onDuplicate, creating, isMobile, onBack }) {
  const [advanced, setAdvanced] = useState(false);
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState(null); // null | true | false
  const [generating, setGenerating] = useState(false);
  const checkTimer = useRef(null);

  const setField = (field, value) => setDraft((d) => ({ ...d, [field]: value }));
  const dirty = useMemo(() => (draft ? JSON.stringify(draft) !== baseline : false), [draft, baseline]);

  const promotionOptions = useMemo(
    () => promotions.map((p) => ({ value: p.id, label: `${p.name}${p.createdByUser ? '' : ' ⚙'}` })),
    [promotions],
  );
  const selectedPromotions = useMemo(
    () => (draft?.promotionIds || []).map((id) => promotions.find((p) => p.id === id)).filter(Boolean),
    [draft, promotions],
  );

  // Debounced availability check for a manually-typed code.
  useEffect(() => {
    const code = String(draft?.code || '').trim().toUpperCase();
    setAvailable(null);
    if (!code) return;
    // unchanged code that already belongs to this record is always "available"
    if (!creating && code === String(baselineCode(baseline)).toUpperCase()) { setAvailable(true); return; }
    if (checkTimer.current) clearTimeout(checkTimer.current);
    checkTimer.current = setTimeout(async () => {
      setChecking(true);
      const res = await api(`/core/marketing/promocodes/generate-code?check=${encodeURIComponent(code)}`);
      setChecking(false);
      if (res.ok) setAvailable(Boolean(res.payload?.available));
    }, 400);
    return () => { if (checkTimer.current) clearTimeout(checkTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.code]);

  const generate = async () => {
    setGenerating(true);
    const res = await api(`/core/marketing/promocodes/generate-code?prefix=${encodeURIComponent(draft?.prefix || '')}`);
    setGenerating(false);
    if (res.ok && res.payload?.code) { setField('code', res.payload.code); toast('success', t('Code generated')); }
    else toast('error', res.payload?.error || t('Could not generate a code'));
  };

  const jsonField = (field) => {
    const raw = draft?.[field];
    return raw == null ? '' : (typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2));
  };
  const setJsonField = (field, text) => {
    if (!text.trim()) { setField(field, null); return; }
    try { setField(field, JSON.parse(text)); } catch { setField(field, text); /* keep raw, validated on save */ }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Sticky header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 2, background: 'var(--card)', display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
        {isMobile && (
          <Button type="button" variant="outline" size="sm" onClick={onBack} style={{ alignSelf: 'flex-start' }}>← {t('Back')}</Button>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <strong style={{ fontSize: 18 }}>{creating ? t('New promo code') : (draft.code || t('Promo code'))}</strong>
            {!creating && <Badge variant="outline">{statusLabel(draft._status || 'active', t)}</Badge>}
            {dirty && <Badge variant="outline">{t('Unsaved')}</Badge>}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button type="button" onClick={onSave} disabled={saving || !dirty || available === false}>{saving ? t('Saving...') : t('Save')}</Button>
            {!creating && <Button type="button" variant="outline" onClick={onDuplicate} disabled={saving}>{t('Duplicate')}</Button>}
            {!creating && <Button type="button" variant="outline" onClick={onDelete} disabled={saving}>{t('Delete')}</Button>}
          </div>
        </div>
      </div>

      {/* Code block */}
      <section style={styles.subsection}>
        <h3 style={styles.subsectionTitle}>{t('Code')}</h3>
        <div style={styles.field}>
          <Label style={styles.fieldLabel}>{t('Code')}</Label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Input value={draft.code || ''} onChange={(e) => setField('code', e.target.value.toUpperCase())} placeholder={t('e.g. SUMMER10')} style={{ ...styles.code, flex: 1 }} />
            <Button type="button" variant="outline" onClick={generate} disabled={generating}>{generating ? '…' : t('Generate')}</Button>
          </div>
          <span style={styles.help}>
            {checking ? t('Checking availability…')
              : available === false ? <span style={{ color: 'var(--destructive)' }}>{t('This code is already in use')}</span>
              : available === true && draft.code ? <span style={{ color: '#16a34a' }}>{t('Code is available')}</span>
              : t('The code the customer enters at checkout. Letters and digits.')}
          </span>
        </div>
        <div style={styles.field}>
          <Label style={styles.fieldLabel}>{t('Description')} *</Label>
          <Textarea value={draft.description || ''} onChange={(e) => setField('description', e.target.value)} rows={2} />
          <span style={styles.help}>{t('Shown to the operator and stored on the order.')}</span>
        </div>
        <div style={styles.field}>
          <Label style={styles.fieldLabel}>{t('Type')}</Label>
          <Select value={draft.type || 'static'} onValueChange={(v) => setField('type', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="static">{t('Static (one code)')}</SelectItem>
              <SelectItem value="generated" disabled>{t('Generated')} — {t('coming soon')}</SelectItem>
              <SelectItem value="serial" disabled>{t('Serial')} — {t('coming soon')}</SelectItem>
              <SelectItem value="external" disabled>{t('External')} — {t('coming soon')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* Linked promotions */}
      <section style={styles.subsection}>
        <h3 style={styles.subsectionTitle}>{t('Linked promotions')}</h3>
        <p style={styles.help}>{t('A promo code does nothing on its own — it activates the promotions linked here when applied to an order.')}</p>
        {MultiSelect ? (
          <MultiSelect
            key={draft.id || 'new'}
            options={promotionOptions}
            defaultValue={draft.promotionIds || []}
            onValueChange={(vals) => setField('promotionIds', vals)}
            placeholder={t('Select promotions')}
          />
        ) : <span style={styles.help}>MultiSelect unavailable</span>}
        {selectedPromotions.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
            <span style={styles.help}>{t('What this code grants')}:</span>
            {selectedPromotions.map((p) => (
              <div key={p.id} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                <Badge variant={p.createdByUser ? 'secondary' : 'outline'}>{p.createdByUser ? t('Configured') : t('Programmed')}</Badge>
                <strong>{p.name}</strong>
                <span style={{ color: 'var(--muted-foreground)' }}>{discountText(p.discount, t, language)}</span>
              </div>
            ))}
          </div>
        )}
        <a href={`${getBaseAdminPath()}/promotions-manager#new`} style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: 13 }}>{t('Create a promotion')} →</a>
      </section>

      {/* Schedule */}
      <section style={styles.subsection}>
        <h3 style={styles.subsectionTitle}>{t('Validity period')}</h3>
        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px,100%),1fr))' }}>
          <div style={styles.field}>
            <Label style={styles.fieldLabel}>{t('Start date')}</Label>
            <Input type="date" value={toDateInput(draft.startDate)} onChange={(e) => setField('startDate', e.target.value)} />
          </div>
          <div style={styles.field}>
            <Label style={styles.fieldLabel}>{t('End date')}</Label>
            <Input type="date" value={toDateInput(draft.stopDate)} onChange={(e) => setField('stopDate', e.target.value)} />
          </div>
        </div>
        <span style={styles.help}>{t('Leave empty for no limit. Fine-grained schedules can be set in Advanced (workTime).')}</span>
      </section>

      {/* Advanced */}
      <section style={styles.subsection}>
        <button type="button" onClick={() => setAdvanced((v) => !v)} style={{ background: 'none', border: 'none', color: 'var(--foreground)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0, fontSize: 16, fontWeight: 700 }}>
          <span>{advanced ? '▾' : '▸'}</span> {t('Advanced')}
        </button>
        {advanced && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 6 }}>
            <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px,100%),1fr))' }}>
              <div style={styles.field}>
                <Label style={styles.fieldLabel}>{t('External ID')}</Label>
                <Input value={draft.externalId || ''} onChange={(e) => setField('externalId', e.target.value)} style={styles.code} />
              </div>
              <div style={styles.field}>
                <Label style={styles.fieldLabel}>{t('Prefix')}</Label>
                <Input value={draft.prefix || ''} onChange={(e) => setField('prefix', e.target.value)} style={styles.code} />
              </div>
            </div>
            <div style={styles.field}>
              <Label style={styles.fieldLabel}>{t('Schedule')}</Label>
              <WorktimeEditor single value={draft.workTime} t={t} onChange={(wt) => setField('workTime', wt)} />
            </div>
            <div style={styles.field}>
              <Label style={styles.fieldLabel}>{t('Custom data (JSON)')}</Label>
              <Textarea value={jsonField('customData')} onChange={(e) => setJsonField('customData', e.target.value)} rows={3} style={styles.code} />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function baselineCode(baseline) {
  try { return JSON.parse(baseline || '{}').code || ''; } catch { return ''; }
}
function toDateInput(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : '';
  const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ─────────────────────────────── Codes section (list + editor) ───────────────────────────────
function CodesSection({ t, language, codeId, creating }) {
  const isMobile = useIsMobile();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [promotions, setPromotions] = useState([]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [bindingFilter, setBindingFilter] = useState('all');

  const [draft, setDraft] = useState(null);
  const [baseline, setBaseline] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pendingNav, setPendingNav] = useState(null); // target hash awaiting dirty confirm

  const dirty = useMemo(() => (draft ? JSON.stringify(draft) !== baseline : false), [draft, baseline]);

  const loadPromotions = useCallback(async () => {
    const res = await api('/core/marketing/promotions-options');
    if (res.ok) setPromotions(Array.isArray(res.payload?.results) ? res.payload.results : []);
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ skip: String(page * PAGE_SIZE), limit: String(PAGE_SIZE) });
    if (search.trim()) params.set('q', search.trim());
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (bindingFilter !== 'all') params.set('binding', bindingFilter);
    const res = await api(`/core/marketing/promocodes?${params.toString()}`);
    if (res.ok) { setItems(res.payload?.results || []); setTotal(res.payload?.meta?.total || 0); }
    setLoading(false);
  }, [page, search, statusFilter, bindingFilter]);

  useEffect(() => { loadPromotions(); }, [loadPromotions]);
  useEffect(() => { const id = setTimeout(loadList, 200); return () => clearTimeout(id); }, [loadList]);

  // Sync editor state to the hash-driven selection.
  useEffect(() => {
    let cancelled = false;
    if (creating) {
      const blank = blankCode();
      setDraft(blank); setBaseline(JSON.stringify(blank));
      return () => {};
    }
    if (!codeId) { setDraft(null); setBaseline(''); return () => {}; }
    (async () => {
      const res = await api(`/core/marketing/promocode?id=${encodeURIComponent(codeId)}`);
      if (cancelled) return;
      if (res.ok && res.payload?.result) {
        const r = res.payload.result;
        const d = { id: r.id, code: r.code, description: r.description, type: r.type, startDate: r.startDate, stopDate: r.stopDate, workTime: r.workTime, externalId: r.externalId, prefix: r.prefix, generateConfig: r.generateConfig, customData: r.customData, promotionIds: r.promotionIds || [], _status: r.status };
        setDraft(d); setBaseline(JSON.stringify(d));
      } else {
        toast('error', res.payload?.error || t('Promo code not found'));
        setDraft(null); setBaseline('');
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeId, creating]);

  const guardedNav = (targetHash) => {
    if (dirty) { setPendingNav(targetHash); return; }
    setHash(targetHash);
  };
  const resolvePendingNav = (proceed) => {
    const target = pendingNav; setPendingNav(null);
    if (proceed && target != null) setHash(target);
  };

  const save = async () => {
    if (!draft) return;
    if (!String(draft.description || '').trim()) { toast('error', t('Description is required')); return; }
    setSaving(true);
    const body = {
      id: draft.id || undefined, code: draft.code || null, description: draft.description, type: draft.type,
      startDate: draft.startDate || null, stopDate: draft.stopDate || null, workTime: draft.workTime ?? null,
      externalId: draft.externalId || null, prefix: draft.prefix || null,
      generateConfig: draft.generateConfig ?? null, customData: draft.customData ?? null,
      promotionIds: draft.promotionIds || [],
    };
    const res = await api('/core/marketing/promocode', { method: 'POST', body: JSON.stringify(body) });
    setSaving(false);
    if (!res.ok || res.payload?.success === false) { toast('error', res.payload?.error || t('Save failed')); return; }
    toast('success', t('Promo code saved'));
    const saved = res.payload?.result;
    await loadList();
    if (saved?.id) setHash(`code/${encodeURIComponent(saved.id)}`); else setHash('list');
  };

  const doDelete = async () => {
    if (!draft?.id) return;
    setSaving(true);
    const res = await api('/core/marketing/promocode-delete', { method: 'POST', body: JSON.stringify({ id: draft.id }) });
    setSaving(false);
    if (!res.ok || res.payload?.success === false) { toast('error', res.payload?.error || t('Delete failed')); return; }
    toast('success', t('Promo code deleted'));
    await loadList();
    setHash('list');
  };

  const duplicate = () => {
    if (!draft) return;
    const clone = { ...draft, id: '', code: '', _status: undefined };
    setHash('new');
    // populate after navigation effect resets to blank — defer
    setTimeout(() => { setDraft(clone); setBaseline(JSON.stringify(blankCode())); }, 0);
  };

  const editorOpen = creating || Boolean(codeId);
  // On mobile show either the list OR the editor (master-detail swap), never both side by side.
  const showList = !isMobile || !editorOpen;

  return (
    <div style={{ display: 'grid', gap: isMobile ? 16 : 24, gridTemplateColumns: (editorOpen && !isMobile) ? 'minmax(300px, 380px) minmax(420px, 1fr)' : '1fr', alignItems: 'start' }}>
      {/* List */}
      {showList && (
      <section style={styles.panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <h2 style={styles.sectionTitle}>{t('Promo codes')}</h2>
          <Button type="button" size="sm" onClick={() => guardedNav('new')}>+ {t('Promo code')}</Button>
        </div>
        <Input value={search} onChange={(e) => { setPage(0); setSearch(e.target.value); }} placeholder={t('Search by code, description, promotion')} />
        <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr' }}>
          <Select value={statusFilter} onValueChange={(v) => { setPage(0); setStatusFilter(v); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('All statuses')}</SelectItem>
              <SelectItem value="active">{t('Active')}</SelectItem>
              <SelectItem value="scheduled">{t('Scheduled')}</SelectItem>
              <SelectItem value="expired">{t('Expired')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={bindingFilter} onValueChange={(v) => { setPage(0); setBindingFilter(v); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('All codes')}</SelectItem>
              <SelectItem value="with">{t('With promotions')}</SelectItem>
              <SelectItem value="without">{t('Without promotions')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '64vh', overflow: 'auto' }}>
          {loading && items.length === 0 ? (
            <div style={styles.help}>{t('loading')}</div>
          ) : items.length === 0 ? (
            <div style={styles.help}>{t('No promo codes yet. Create the first one.')}</div>
          ) : items.map((c) => {
            const active = c.id === codeId;
            return (
              <button key={c.id} type="button" onClick={() => guardedNav(`code/${encodeURIComponent(c.id)}`)}
                style={{ textAlign: 'left', border: active ? '1px solid var(--primary)' : '1px solid var(--border)', borderRadius: 12, padding: 12, background: active ? 'var(--accent)' : 'var(--card)', color: 'var(--foreground)', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                  <code style={{ fontSize: 14, fontWeight: 700 }}>{c.code || t('(no code)')}</code>
                  <StatusPill status={c.status} t={t} />
                </div>
                <span style={{ ...styles.help, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.description || '—'}</span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {c.promotion.length === 0 ? <Badge variant="outline">{t('No promotions')}</Badge>
                    : c.promotion.slice(0, 3).map((p) => <Badge key={p.id} variant="secondary">{p.name}</Badge>)}
                  {c.promotion.length > 3 && <Badge variant="outline">+{c.promotion.length - 3}</Badge>}
                </div>
              </button>
            );
          })}
        </div>

        {total > PAGE_SIZE && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span style={styles.help}>{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} {t('of')} {total}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0 || loading}>←</Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={(page + 1) * PAGE_SIZE >= total || loading}>→</Button>
            </div>
          </div>
        )}
      </section>
      )}

      {/* Editor */}
      {editorOpen && (
        <section style={styles.panel}>
          {draft ? (
            <CodeEditor
              t={t} language={language} draft={draft} setDraft={setDraft} baseline={baseline}
              promotions={promotions} saving={saving} creating={creating}
              onSave={save} onDelete={() => setConfirmDelete(true)} onDuplicate={duplicate}
              isMobile={isMobile} onBack={() => guardedNav('list')}
            />
          ) : <div style={styles.help}>{t('loading')}</div>}
        </section>
      )}

      <ConfirmDialog isOpen={confirmDelete} onClose={() => setConfirmDelete(false)} onConfirm={doDelete}
        title={t('Delete promo code?')} message={t('This permanently removes the promo code. Already-issued codes will stop working.')}
        confirmText={t('Delete')} cancelText={t('Cancel')} />
      <ConfirmDialog isOpen={pendingNav !== null} onClose={() => resolvePendingNav(false)} onConfirm={() => resolvePendingNav(true)}
        title={t('Discard unsaved changes?')} message={t('You have unsaved changes that will be lost.')}
        confirmText={t('Discard')} cancelText={t('Cancel')} />
    </div>
  );
}

// ─────────────────────────────── Activity ───────────────────────────────
function ActivitySection({ t, language }) {
  const isMobile = useIsMobile();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expanded, setExpanded] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ skip: String(page * PAGE_SIZE), limit: String(PAGE_SIZE) });
    if (search.trim()) params.set('q', search.trim());
    if (statusFilter !== 'all') params.set('status', statusFilter);
    const res = await api(`/core/marketing/promocodes/activity?${params.toString()}`);
    if (res.ok) { setItems(res.payload?.results || []); setTotal(res.payload?.meta?.total || 0); }
    setLoading(false);
  }, [page, search, statusFilter]);

  useEffect(() => { const id = setTimeout(load, 200); return () => clearTimeout(id); }, [load]);

  return (
    <section style={styles.panel}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div><h2 style={styles.sectionTitle}>{t('Activity')}</h2><p style={styles.sectionDescription}>{t('Every order where a promo code was entered.')}</p></div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Input value={search} onChange={(e) => { setPage(0); setSearch(e.target.value); }} placeholder={t('Code or order #')} style={{ minWidth: 200 }} />
          <Select value={statusFilter} onValueChange={(v) => { setPage(0); setStatusFilter(v); }}>
            <SelectTrigger style={{ minWidth: 150 }}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('All statuses')}</SelectItem>
              <SelectItem value="applied">{t('Applied')}</SelectItem>
              <SelectItem value="invalid">{t('Invalid')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div style={{ border: isMobile ? 'none' : '1px solid var(--border)', borderRadius: 12, overflow: isMobile ? 'visible' : 'hidden', display: isMobile ? 'flex' : 'block', flexDirection: 'column', gap: isMobile ? 10 : 0 }}>
        {!isMobile && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 0.8fr 0.8fr', gap: 12, padding: '12px 14px', background: 'var(--muted)', fontSize: 12, fontWeight: 700, color: 'var(--muted-foreground)' }}>
            <div>{t('Date / time')}</div><div>{t('Promo code')}</div><div>{t('Order')}</div><div>{t('Discount')}</div><div>{t('Status')}</div>
          </div>
        )}
        {loading && items.length === 0 ? (
          <div style={{ padding: 20, ...styles.help }}>{t('loading')}</div>
        ) : items.length === 0 ? (
          <div style={{ padding: 20, ...styles.help }}>{t('No applications found')}</div>
        ) : items.map((row) => {
          const open = expanded === row.orderId;
          const details = open && (
            <div style={{ padding: isMobile ? '4px 0 0' : '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {row.description && <div style={styles.help}>{row.description}</div>}
              {Array.isArray(row.promotionState) && row.promotionState.length > 0 && (
                <pre style={{ whiteSpace: 'pre-wrap', overflow: 'auto', padding: 10, background: 'var(--muted)', color: 'var(--muted-foreground)', borderRadius: 10, margin: 0, fontSize: 12 }}>{JSON.stringify(row.promotionState, null, 2)}</pre>
              )}
              <a href={`${getBaseAdminPath()}/model/order/edit/${encodeURIComponent(row.orderId)}`} style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: 13 }}>{t('Open order')} →</a>
            </div>
          );
          if (isMobile) {
            return (
              <div key={row.orderId} style={{ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--card)', padding: 12 }}>
                <button type="button" onClick={() => setExpanded(open ? '' : row.orderId)}
                  style={{ width: '100%', border: 'none', background: 'transparent', color: 'var(--foreground)', textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 6, padding: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                    <code style={{ fontSize: 14, fontWeight: 700 }}>{row.code}</code>
                    <StatusPill status={row.status} t={t} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                    <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{formatDateTime(row.createdAt, language)}</span>
                    <strong style={{ fontSize: 14, ...COST_NUM_STYLE }}>{formatMoney(row.discount, language)}</strong>
                  </div>
                  <span style={styles.help}>{t('Order')}: {row.shortId || row.orderId}</span>
                </button>
                {details}
              </div>
            );
          }
          return (
            <div key={row.orderId} style={{ borderTop: '1px solid var(--border)', background: 'var(--card)' }}>
              <button type="button" onClick={() => setExpanded(open ? '' : row.orderId)}
                style={{ width: '100%', border: 'none', background: 'transparent', color: 'var(--foreground)', textAlign: 'left', cursor: 'pointer', display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 0.8fr 0.8fr', gap: 12, padding: '12px 14px', alignItems: 'center' }}>
                <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{formatDateTime(row.createdAt, language)}</div>
                <code style={{ fontSize: 13, fontWeight: 700 }}>{row.code}</code>
                <div style={{ fontSize: 12 }}>{row.shortId || row.orderId}</div>
                <div style={{ fontSize: 13, ...COST_NUM_STYLE }}>{formatMoney(row.discount, language)}</div>
                <StatusPill status={row.status} t={t} />
              </button>
              {details}
            </div>
          );
        })}
      </div>

      {total > PAGE_SIZE && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={styles.help}>{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} {t('of')} {total}</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0 || loading}>←</Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={(page + 1) * PAGE_SIZE >= total || loading}>→</Button>
          </div>
        </div>
      )}
    </section>
  );
}

// ─────────────────────────────── Shell ───────────────────────────────
function PromoCodesManagerContent() {
  const { language, t } = useTranslation();
  const isMobile = useIsMobile();
  const [route, setRoute] = useState(parseHash);

  useEffect(() => {
    const onChange = () => setRoute(parseHash());
    window.addEventListener('hashchange', onChange);
    window.addEventListener('popstate', onChange);
    return () => { window.removeEventListener('hashchange', onChange); window.removeEventListener('popstate', onChange); };
  }, []);

  const TABS = [
    { id: 'dashboard', label: t('Dashboard'), hash: 'dashboard' },
    { id: 'codes', label: t('Promo codes'), hash: 'list' },
    { id: 'activity', label: t('Activity'), hash: 'activity' },
  ];

  const tabBtn = (active) => ({
    flex: isMobile ? '1 1 auto' : '0 0 auto',
    border: '1px solid transparent', borderRadius: 9, background: active ? 'var(--card)' : 'transparent',
    color: active ? 'var(--foreground)' : 'var(--muted-foreground)', padding: '8px 12px', minHeight: 36,
    fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: active ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
  });

  const pageShell = { ...styles.pageShell, padding: isMobile ? 12 : 24, gap: isMobile ? 16 : 24 };

  return (
    <div style={pageShell}>
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 24, lineHeight: '32px', fontWeight: 700, margin: 0 }}>{t('Promo codes')}</h1>
          <p style={{ margin: '6px 0 0', color: 'var(--muted-foreground)', fontSize: 14, maxWidth: 720 }}>{t('Manage promo codes, see how they are used, and edit them without raw JSON.')}</p>
        </div>
        <div role="tablist" style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: 4, border: '1px solid var(--border)', borderRadius: 12, background: 'var(--muted)', width: isMobile ? '100%' : 'auto' }}>
          {TABS.map((s) => (
            <button key={s.id} type="button" role="tab" aria-selected={route.tab === s.id} onClick={() => setHash(s.hash)} style={tabBtn(route.tab === s.id)}>{s.label}</button>
          ))}
        </div>
      </header>

      {route.tab === 'dashboard' && <DashboardSection t={t} language={language} />}
      {route.tab === 'codes' && <CodesSection t={t} language={language} codeId={route.codeId} creating={route.creating} />}
      {route.tab === 'activity' && <ActivitySection t={t} language={language} />}
    </div>
  );
}

export default function PromoCodesManager(props) {
  return (
    <I18nProvider initialLocale={props.locale} messages={props.messages}>
      <PromoCodesManagerContent />
    </I18nProvider>
  );
}

if (typeof window !== 'undefined') {
  window.PromoCodesManager = window.PromoCodesManager || {};
  window.PromoCodesManager.Component = PromoCodesManager;
  window.PromoCodesManager.mount = (el = null) => {
    try {
      const target = el || document.getElementById('promocodes-manager-root') || (() => {
        const div = document.createElement('div');
        div.id = 'promocodes-manager-root';
        (document.querySelector('#app') || document.body).appendChild(div);
        return div;
      })();
      if (window.ReactDOM && window.ReactDOM.render) {
        window.ReactDOM.render(React.createElement(PromoCodesManager), target);
      } else if (window.ReactDOM && window.ReactDOM.hydrateRoot) {
        window.ReactDOM.hydrateRoot(target, React.createElement(PromoCodesManager));
      }
    } catch (mountError) {
      void mountError;
    }
  };
}
