import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { I18nProvider, useTranslation } from './i18n/I18nContext';
import { ConfirmDialog } from './components/ConfirmDialog';
import WorktimeView from './components/WorktimeView';
import { styles, toast, getBaseAdminPath, notificationsApi as api } from './components/notifications/shared';

const {
  Button, Input, Textarea, Label, Badge, Switch,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} = window.UIComponents;
const { MultiSelect } = window.JSComponents || {};

// ─────────────────────────────── formatting ───────────────────────────────
function formatMoney(value, language) {
  const n = Number(value) || 0;
  try { return new Intl.NumberFormat(language, { maximumFractionDigits: 2 }).format(n); }
  catch { return n.toFixed(2); }
}
function discountText(discount, t, language) {
  if (!discount) return t('No discount configured');
  const parts = [];
  if (discount.type && discount.amount > 0) {
    const value = discount.type === 'percentage' ? `−${discount.amount}%` : `−${formatMoney(discount.amount, language)}`;
    let scope = '';
    if (discount.scope === 'all') scope = t('on the whole cart');
    else if (discount.scope === 'groups') scope = `${t('on groups')} (${discount.groupsCount})`;
    else if (discount.scope === 'dishes') scope = `${t('on dishes')} (${discount.dishesCount})`;
    else if (discount.scope === 'mixed') scope = t('on selected items');
    parts.push(scope ? `${value} · ${scope}` : value);
  }
  if (discount.hasGift) parts.push(`🎁 ${t('Gift')}${discount.giftDishesCount ? ` (${discount.giftDishesCount})` : ''}`);
  return parts.length ? parts.join(' · ') : t('No discount configured');
}

// ─────────────────────────────── hash routing ───────────────────────────────
function parseHash() {
  if (typeof window === 'undefined') return { creating: false, id: '' };
  const hash = String(window.location.hash || '').replace(/^#/, '');
  const lower = hash.toLowerCase();
  if (lower === 'new') return { creating: true, id: '' };
  if (lower.startsWith('promotion/')) return { creating: false, id: decodeURIComponent(hash.slice('promotion/'.length)) };
  return { creating: false, id: '' };
}
function setHash(next) {
  if (typeof window === 'undefined') return;
  const nextHash = `#${next}`;
  if (window.location.hash === nextHash) { window.dispatchEvent(new Event('hashchange')); return; }
  window.history.pushState(null, '', `${window.location.pathname}${window.location.search}${nextHash}`);
  window.dispatchEvent(new Event('hashchange'));
}

const segBtn = (active) => ({
  padding: '8px 12px', borderRadius: 9, border: active ? '1px solid var(--primary)' : '1px solid var(--border)',
  background: active ? 'var(--accent)' : 'var(--card)', color: 'var(--foreground)', cursor: 'pointer', fontSize: 13, fontWeight: 700,
});

// ─────────────────────────────── dish picker (search → chips) ───────────────────────────────
function DishPicker({ t, value, onChange, names, setNames }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    const id = setTimeout(async () => {
      const res = await api(`/core/marketing/dishes?q=${encodeURIComponent(q.trim())}`);
      if (res.ok) {
        const r = res.payload?.results || [];
        setResults(r);
        setNames((n) => { const m = { ...n }; r.forEach((d) => { m[d.id] = d.name; }); return m; });
      }
    }, 300);
    return () => clearTimeout(id);
  }, [q, setNames]);

  const add = (d) => { if (!value.includes(d.id)) onChange([...value, d.id]); setQ(''); setResults([]); setOpen(false); };
  const remove = (id) => onChange(value.filter((x) => x !== id));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ position: 'relative' }}>
        <Input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder={t('Search dishes…')} />
        {open && results.length > 0 && (
          <div style={{ position: 'absolute', zIndex: 20, top: '100%', left: 0, right: 0, marginTop: 4, maxHeight: 220, overflow: 'auto', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 10px 24px rgba(0,0,0,0.18)' }}>
            {results.map((d) => (
              <button key={d.id} type="button" onMouseDown={() => add(d)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', borderTop: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)', cursor: 'pointer', fontSize: 13 }}>
                {d.name}{d.code ? <span style={{ color: 'var(--muted-foreground)' }}> · {d.code}</span> : null}
              </button>
            ))}
          </div>
        )}
      </div>
      {value.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {value.map((id) => (
            <span key={id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 999, background: 'var(--muted)', fontSize: 12 }}>
              {names[id] || id}
              <button type="button" onClick={() => remove(id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}>✕</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// Gift dishes: each row is a free dish + amount. Search adds rows; amount is editable.
function GiftDishPicker({ t, value, onChange, names, setNames }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    const id = setTimeout(async () => {
      const res = await api(`/core/marketing/dishes?q=${encodeURIComponent(q.trim())}`);
      if (res.ok) {
        const r = res.payload?.results || [];
        setResults(r);
        setNames((n) => { const m = { ...n }; r.forEach((d) => { m[d.id] = d.name; }); return m; });
      }
    }, 300);
    return () => clearTimeout(id);
  }, [q, setNames]);

  const add = (d) => {
    if (!value.some((g) => g.dishId === d.id)) onChange([...value, { dishId: d.id, amount: 1 }]);
    setQ(''); setResults([]); setOpen(false);
  };
  const setAmount = (dishId, amount) => onChange(value.map((g) => (g.dishId === dishId ? { ...g, amount } : g)));
  const remove = (dishId) => onChange(value.filter((g) => g.dishId !== dishId));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ position: 'relative' }}>
        <Input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder={t('Search dishes…')} />
        {open && results.length > 0 && (
          <div style={{ position: 'absolute', zIndex: 20, top: '100%', left: 0, right: 0, marginTop: 4, maxHeight: 220, overflow: 'auto', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 10px 24px rgba(0,0,0,0.18)' }}>
            {results.map((d) => (
              <button key={d.id} type="button" onMouseDown={() => add(d)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', borderTop: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)', cursor: 'pointer', fontSize: 13 }}>
                {d.name}{d.code ? <span style={{ color: 'var(--muted-foreground)' }}> · {d.code}</span> : null}
              </button>
            ))}
          </div>
        )}
      </div>
      {value.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {value.map((g) => (
            <div key={g.dishId} style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between', border: '1px solid var(--border)', borderRadius: 10, padding: '6px 10px' }}>
              <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{names[g.dishId] || g.dishId}</span>
              <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{t('Qty')}</span>
                <Input type="number" min="1" step="1" value={g.amount} onChange={(e) => setAmount(g.dishId, e.target.value === '' ? 1 : Math.max(1, Number(e.target.value)))} style={{ width: 72 }} />
                <button type="button" onClick={() => remove(g.dishId)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}>✕</button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────── configured promotion form ───────────────────────────────
function emptyDraft() {
  return {
    id: '', name: '', description: '', concept: [], enable: true, sortOrder: 0,
    isJoint: false, isPublic: false, worktime: null,
    scope: 'all', discountType: 'percentage', discountAmount: 0,
    groups: [], dishes: [], excludeGroups: [], excludeDishes: [],
    deliveryMethod: [], excludeModifiers: false,
    minBasketTotal: 0,
    giftEnabled: false, giftMinBasketTotal: 0, giftDishes: [],
    badge: 'configured-promotion', externalId: '', createdByUser: true,
  };
}
function fromRecord(r) {
  const cd = r.configDiscount || {};
  const groups = (cd.groups || []).filter((x) => x && x !== '*');
  const dishes = (cd.dishes || []).filter((x) => x && x !== '*');
  const gift = cd.gift && Array.isArray(cd.gift.dishes) ? cd.gift : null;
  return {
    id: r.id, name: r.name || '', description: r.description || '', concept: r.concept || [],
    enable: r.enable !== false, sortOrder: r.sortOrder || 0,
    isJoint: Boolean(r.isJoint), isPublic: Boolean(r.isPublic), worktime: r.worktime ?? null,
    scope: (groups.length || dishes.length) ? 'selected' : 'all',
    discountType: cd.discountType === 'flat' ? 'flat' : 'percentage',
    discountAmount: cd.discountAmount || 0,
    groups, dishes,
    excludeGroups: (cd.exclude?.groups || []).filter(Boolean),
    excludeDishes: (cd.exclude?.dishes || []).filter(Boolean),
    deliveryMethod: cd.deliveryMethod || [],
    excludeModifiers: Boolean(cd.excludeModifiers),
    minBasketTotal: cd.minBasketTotal || 0,
    giftEnabled: Boolean(gift && gift.dishes.length),
    giftMinBasketTotal: gift ? (gift.minBasketTotal || 0) : 0,
    giftDishes: gift ? gift.dishes.map((g) => ({ dishId: g.dishId, amount: g.amount || 1 })) : [],
    badge: r.badge || 'configured-promotion', externalId: r.externalId || '', createdByUser: true,
  };
}

function ConfiguredForm({ t, language, draft, setDraft, baseline, saving, creating, onSave, onDelete, groupOptions, conceptOptions, dishNames, setDishNames }) {
  const [advanced, setAdvanced] = useState(false);
  const setField = (f, v) => setDraft((d) => ({ ...d, [f]: v }));
  const dirty = useMemo(() => (draft ? JSON.stringify(draft) !== baseline : false), [draft, baseline]);

  const previewText = useMemo(() => {
    const parts = [];
    if (Number(draft.discountAmount) > 0) {
      const amount = draft.discountType === 'percentage' ? `−${draft.discountAmount}%` : `−${formatMoney(draft.discountAmount, language)}`;
      const scope = draft.scope === 'all' ? t('on the whole cart')
        : `${t('on selected items')} (${draft.groups.length} ${t('groups')}, ${draft.dishes.length} ${t('dishes')})`;
      parts.push(`${amount} ${scope}`);
    }
    if (draft.giftEnabled && (draft.giftDishes || []).filter((g) => g.dishId).length) {
      const n = draft.giftDishes.filter((g) => g.dishId).length;
      parts.push(`🎁 ${t('gift')}: ${n} ${t('dishes')}${draft.giftMinBasketTotal ? ` ${t('from')} ${formatMoney(draft.giftMinBasketTotal, language)} ₽` : ''}`);
    }
    const delivery = draft.deliveryMethod.length && draft.deliveryMethod.length < 2
      ? (draft.deliveryMethod[0] === 'delivery' ? `, ${t('delivery only')}` : `, ${t('self-service only')}`) : '';
    const joint = draft.isJoint ? t('stacks with others') : t('exclusive');
    if (!parts.length) parts.push(t('No discount configured'));
    return `${parts.join(' · ')}${delivery} · ${joint}`;
  }, [draft, t, language]);

  const toggleDelivery = (m) => setField('deliveryMethod', draft.deliveryMethod.includes(m) ? draft.deliveryMethod.filter((x) => x !== m) : [...draft.deliveryMethod, m]);

  const worktimeText = draft.worktime == null ? '' : (typeof draft.worktime === 'string' ? draft.worktime : JSON.stringify(draft.worktime, null, 2));
  const setWorktime = (text) => { if (!text.trim()) { setField('worktime', null); return; } try { setField('worktime', JSON.parse(text)); } catch { setField('worktime', text); } };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Sticky header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 2, background: 'var(--card)', display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', flexWrap: 'wrap', paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <strong style={{ fontSize: 18 }}>{creating ? t('New promotion') : (draft.name || t('Promotion'))}</strong>
          <Badge variant="secondary">{t('Configured')}</Badge>
          {dirty && <Badge variant="outline">{t('Unsaved')}</Badge>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button type="button" onClick={onSave} disabled={saving || !dirty}>{saving ? t('Saving...') : t('Save')}</Button>
          {!creating && <Button type="button" variant="outline" onClick={onDelete} disabled={saving}>{t('Delete')}</Button>}
        </div>
      </div>

      {/* Basic */}
      <section style={styles.subsection}>
        <h3 style={styles.subsectionTitle}>{t('Basic')}</h3>
        <div style={styles.field}>
          <Label style={styles.fieldLabel}>{t('Name')} *</Label>
          <Input value={draft.name} onChange={(e) => setField('name', e.target.value)} />
        </div>
        <div style={styles.field}>
          <Label style={styles.fieldLabel}>{t('Description')} *</Label>
          <Textarea value={draft.description} onChange={(e) => setField('description', e.target.value)} rows={2} />
        </div>
        <div style={styles.field}>
          <Label style={styles.fieldLabel}>{t('Concepts')}</Label>
          {MultiSelect ? (
            <MultiSelect key={`concept-${draft.id || 'new'}`} options={conceptOptions} defaultValue={draft.concept} onValueChange={(v) => setField('concept', v)} placeholder={t('All concepts (origin)')} />
          ) : <span style={styles.help}>MultiSelect unavailable</span>}
          <span style={styles.help}>{t('Storefronts/menus this promotion applies to. Empty = origin.')}</span>
        </div>
        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px,100%),1fr))' }}>
          <div style={{ ...styles.field, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <div><Label style={styles.fieldLabel}>{t('Enabled')}</Label><div style={styles.help}>{t('Active for customers.')}</div></div>
            <Switch checked={Boolean(draft.enable)} onCheckedChange={(v) => setField('enable', v === true)} />
          </div>
          <div style={styles.field}>
            <Label style={styles.fieldLabel}>{t('Priority (sort order)')}</Label>
            <Input type="number" step="1" value={draft.sortOrder} onChange={(e) => setField('sortOrder', e.target.value === '' ? 0 : Number(e.target.value))} />
            <span style={styles.help}>{t('Lower applies earlier.')}</span>
          </div>
        </div>
      </section>

      {/* Discount */}
      <section style={styles.subsection}>
        <h3 style={styles.subsectionTitle}>{t('Discount')}</h3>
        <div style={{ display: 'inline-flex', gap: 6 }}>
          <button type="button" style={segBtn(draft.discountType === 'percentage')} onClick={() => setField('discountType', 'percentage')}>{t('Percentage')}</button>
          <button type="button" style={segBtn(draft.discountType === 'flat')} onClick={() => setField('discountType', 'flat')}>{t('Fixed amount')}</button>
        </div>
        <div style={styles.field}>
          <Label style={styles.fieldLabel}>{t('Amount')} ({draft.discountType === 'percentage' ? '%' : '₽'})</Label>
          <Input type="number" min="0" step={draft.discountType === 'percentage' ? '1' : '0.01'} value={draft.discountAmount} onChange={(e) => setField('discountAmount', e.target.value === '' ? 0 : Number(e.target.value))} />
        </div>
      </section>

      {/* Applies to */}
      <section style={styles.subsection}>
        <h3 style={styles.subsectionTitle}>{t('Applies to')}</h3>
        <div style={{ display: 'inline-flex', gap: 6 }}>
          <button type="button" style={segBtn(draft.scope === 'all')} onClick={() => setField('scope', 'all')}>{t('Whole cart')}</button>
          <button type="button" style={segBtn(draft.scope === 'selected')} onClick={() => setField('scope', 'selected')}>{t('Selected items')}</button>
        </div>
        {draft.scope === 'selected' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 6 }}>
            <div style={styles.field}>
              <Label style={styles.fieldLabel}>{t('Groups')}</Label>
              {MultiSelect ? (
                <MultiSelect key={`groups-${draft.id || 'new'}`} options={groupOptions} defaultValue={draft.groups} onValueChange={(v) => setField('groups', v)} placeholder={t('Select groups')} />
              ) : <span style={styles.help}>MultiSelect unavailable</span>}
            </div>
            <div style={styles.field}>
              <Label style={styles.fieldLabel}>{t('Dishes')}</Label>
              <DishPicker t={t} value={draft.dishes} onChange={(v) => setField('dishes', v)} names={dishNames} setNames={setDishNames} />
            </div>
          </div>
        )}
        <div style={styles.field}>
          <Label style={styles.fieldLabel}>{t('Delivery method')}</Label>
          <div style={{ display: 'inline-flex', gap: 6 }}>
            <button type="button" style={segBtn(draft.deliveryMethod.includes('delivery'))} onClick={() => toggleDelivery('delivery')}>{t('Delivery')}</button>
            <button type="button" style={segBtn(draft.deliveryMethod.includes('selfService'))} onClick={() => toggleDelivery('selfService')}>{t('Self-service')}</button>
          </div>
          <span style={styles.help}>{t('Leave both off to allow any method.')}</span>
        </div>
        <div style={{ ...styles.field, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <div><Label style={styles.fieldLabel}>{t('Do not apply to modifiers')}</Label><div style={styles.help}>{t('Partially implemented in core.')}</div></div>
          <Switch checked={Boolean(draft.excludeModifiers)} onCheckedChange={(v) => setField('excludeModifiers', v === true)} />
        </div>

        {/* Exclusions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
          <span style={styles.fieldLabel}>{t('Exclusions')}</span>
          <div style={styles.field}>
            <Label style={styles.help}>{t('Excluded groups')}</Label>
            {MultiSelect ? (
              <MultiSelect key={`exg-${draft.id || 'new'}`} options={groupOptions} defaultValue={draft.excludeGroups} onValueChange={(v) => setField('excludeGroups', v)} placeholder={t('Select groups')} />
            ) : <span style={styles.help}>MultiSelect unavailable</span>}
          </div>
          <div style={styles.field}>
            <Label style={styles.help}>{t('Excluded dishes')}</Label>
            <DishPicker t={t} value={draft.excludeDishes} onChange={(v) => setField('excludeDishes', v)} names={dishNames} setNames={setDishNames} />
          </div>
        </div>
      </section>

      {/* Behaviour */}
      <section style={styles.subsection}>
        <h3 style={styles.subsectionTitle}>{t('Behaviour')}</h3>
        <div style={styles.field}>
          <Label style={styles.fieldLabel}>{t('Compatibility')}</Label>
          <div style={{ display: 'inline-flex', gap: 6 }}>
            <button type="button" style={segBtn(draft.isJoint)} onClick={() => setField('isJoint', true)}>{t('Stacks with others')}</button>
            <button type="button" style={segBtn(!draft.isJoint)} onClick={() => setField('isJoint', false)}>{t('Exclusive')}</button>
          </div>
          <span style={styles.help}>{t('Exclusive promotions are applied alone, first.')}</span>
        </div>
        <div style={{ ...styles.field, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <div><Label style={styles.fieldLabel}>{t('Show in storefront / API')}</Label><div style={styles.help}>{t('Lets the client display this discount on dishes/groups.')}</div></div>
          <Switch checked={Boolean(draft.isPublic)} onCheckedChange={(v) => setField('isPublic', v === true)} />
        </div>
      </section>

      {/* Gift & conditions */}
      <section style={styles.subsection}>
        <h3 style={styles.subsectionTitle}>{t('Gift & conditions')}</h3>
        <div style={styles.field}>
          <Label style={styles.fieldLabel}>{t('Minimum basket for promo code')} (₽)</Label>
          <Input type="number" min="0" step="1" value={draft.minBasketTotal} onChange={(e) => setField('minBasketTotal', e.target.value === '' ? 0 : Number(e.target.value))} />
          <span style={styles.help}>{t('Only checked when applied via a promo code. 0 = no minimum.')}</span>
        </div>
        <div style={{ ...styles.field, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <div><Label style={styles.fieldLabel}>{t('Add gift items')}</Label><div style={styles.help}>{t('Auto-adds these items to the cart once the basket reaches the threshold; removed if it drops below.')}</div></div>
          <Switch checked={Boolean(draft.giftEnabled)} onCheckedChange={(v) => setField('giftEnabled', v === true)} />
        </div>
        {draft.giftEnabled && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 6 }}>
            <div style={styles.field}>
              <Label style={styles.fieldLabel}>{t('Gift threshold (min basket)')} (₽)</Label>
              <Input type="number" min="0" step="1" value={draft.giftMinBasketTotal} onChange={(e) => setField('giftMinBasketTotal', e.target.value === '' ? 0 : Number(e.target.value))} />
            </div>
            <div style={styles.field}>
              <Label style={styles.fieldLabel}>{t('Gift items')}</Label>
              <GiftDishPicker t={t} value={draft.giftDishes} onChange={(v) => setField('giftDishes', v)} names={dishNames} setNames={setDishNames} />
              <span style={styles.help}>{t('Added to the cart as a gift. Use a 0₽ dish for a free gift, or a special promo item at its own price.')}</span>
            </div>
          </div>
        )}
      </section>

      {/* Schedule */}
      <section style={styles.subsection}>
        <h3 style={styles.subsectionTitle}>{t('Schedule')}</h3>
        <Textarea value={worktimeText} onChange={(e) => setWorktime(e.target.value)} rows={3} style={styles.code} placeholder='[{ "dayOfWeek": "all", "start": "11:00", "stop": "16:00" }]' />
        <span style={styles.help}>{t('workTime JSON. Leave empty for always-on.')}</span>
        {draft.worktime != null && typeof draft.worktime === 'object' && (
          <div style={{ marginTop: 8 }}>
            <WorktimeView value={draft.worktime} t={t} />
          </div>
        )}
      </section>

      {/* Summary */}
      <section style={{ ...styles.subsection, background: 'var(--muted)' }}>
        <h3 style={styles.subsectionTitle}>{t('Summary')}</h3>
        <div style={{ fontSize: 14 }}>{previewText}</div>
      </section>

      {/* Advanced */}
      <section style={styles.subsection}>
        <button type="button" onClick={() => setAdvanced((v) => !v)} style={{ background: 'none', border: 'none', color: 'var(--foreground)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0, fontSize: 16, fontWeight: 700 }}>
          <span>{advanced ? '▾' : '▸'}</span> {t('Advanced')}
        </button>
        {advanced && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
            <div style={styles.field}><Label style={styles.fieldLabel}>{t('External ID')}</Label><Input value={draft.externalId} disabled style={styles.code} /></div>
            <div style={styles.field}><Label style={styles.fieldLabel}>{t('Badge')}</Label><Input value={draft.badge} disabled style={styles.code} /></div>
          </div>
        )}
      </section>
    </div>
  );
}

// ─────────────────────────────── programmed (read-only) detail ───────────────────────────────
function ProgrammedDetail({ t, language, item, onToggle, savingToggle }) {
  const [sortOrder, setSortOrder] = useState(item.sortOrder || 0);
  useEffect(() => { setSortOrder(item.sortOrder || 0); }, [item.id, item.sortOrder]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 2, background: 'var(--card)', display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', flexWrap: 'wrap', paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <strong style={{ fontSize: 18 }}>{item.name}</strong>
          <Badge variant="outline">{t('Programmed')}</Badge>
          {item.badge && <Badge variant="outline">{item.badge}</Badge>}
        </div>
        <Switch checked={item.enable} onCheckedChange={(v) => onToggle(item.id, v === true)} disabled={savingToggle} />
      </div>

      <div style={{ ...styles.help, padding: '10px 12px', borderRadius: 10, background: 'var(--muted)' }}>
        {t('This promotion is defined in code/a module. Its discount parameters cannot be changed here — only enable and priority.')}
      </div>

      <section style={styles.subsection}>
        <h3 style={styles.subsectionTitle}>{t('Overview')}</h3>
        <div style={styles.field}><Label style={styles.fieldLabel}>{t('Description')}</Label><div>{item.description || '—'}</div></div>
        <div style={styles.field}><Label style={styles.fieldLabel}>{t('Discount')}</Label><div>{discountText(item.discount, t, language)}</div></div>
        <div style={styles.field}><Label style={styles.fieldLabel}>{t('Concepts')}</Label><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{(item.concept || []).length ? item.concept.map((c) => <Badge key={c} variant="secondary">{c}</Badge>) : '—'}</div></div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <span><strong>{t('Compatibility')}:</strong> {item.isJoint ? t('Stacks with others') : t('Exclusive')}</span>
          <span><strong>{t('Storefront')}:</strong> {item.isPublic ? t('Yes') : t('No')}</span>
          {item.runtimeActive !== undefined && <span><strong>{t('Live')}:</strong> {item.runtimeActive ? t('Yes') : t('No')}</span>}
        </div>
        <div style={styles.field}><Label style={styles.fieldLabel}>{t('External ID')}</Label><code style={styles.code}>{item.externalId || '—'}</code></div>
      </section>

      <section style={styles.subsection}>
        <h3 style={styles.subsectionTitle}>{t('Priority (sort order)')}</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <Input type="number" step="1" value={sortOrder} onChange={(e) => setSortOrder(e.target.value === '' ? 0 : Number(e.target.value))} style={{ maxWidth: 160 }} />
          <Button type="button" variant="outline" disabled={savingToggle || sortOrder === (item.sortOrder || 0)} onClick={() => onToggle(item.id, item.enable, sortOrder)}>{t('Save')}</Button>
        </div>
        <span style={styles.help}>{t('Lower applies earlier.')}</span>
      </section>
    </div>
  );
}

// ─────────────────────────────── list card ───────────────────────────────
function PromotionCard({ t, language, item, active, onOpen, onToggle, savingToggle }) {
  return (
    <button type="button" onClick={() => onOpen(item.id)}
      style={{ textAlign: 'left', border: active ? '1px solid var(--primary)' : '1px solid var(--border)', borderRadius: 12, padding: 12, background: active ? 'var(--accent)' : 'var(--card)', color: 'var(--foreground)', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
        <strong style={{ fontSize: 14 }}>{item.name}</strong>
        <span onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex' }}>
          <Switch checked={item.enable} onCheckedChange={(v) => onToggle(item.id, v === true)} disabled={savingToggle} />
        </span>
      </div>
      <div style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>{discountText(item.discount, t, language)}</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <Badge variant={item.createdByUser ? 'secondary' : 'outline'}>{item.createdByUser ? t('Configured') : t('Programmed')}</Badge>
        {item.isJoint ? <Badge variant="outline">{t('Stacks')}</Badge> : <Badge variant="outline">{t('Exclusive')}</Badge>}
        {item.isPublic && <Badge variant="outline">{t('Storefront')}</Badge>}
        {item.discount?.hasGift && <Badge variant="secondary">🎁 {t('Gift')}</Badge>}
        {(item.concept || []).slice(0, 2).map((c) => <Badge key={c} variant="secondary">{c}</Badge>)}
      </div>
    </button>
  );
}

// ─────────────────────────────── main ───────────────────────────────
function PromotionsManagerContent() {
  const { language, t } = useTranslation();
  const [route, setRoute] = useState(parseHash);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState('all');
  const [enableFilter, setEnableFilter] = useState('all');

  const [groupOptions, setGroupOptions] = useState([]);
  const [conceptOptions, setConceptOptions] = useState([]);
  const [dishNames, setDishNames] = useState({});

  const [draft, setDraft] = useState(null);
  const [baseline, setBaseline] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingToggle, setSavingToggle] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pendingNav, setPendingNav] = useState(null);

  const dirty = useMemo(() => (draft ? JSON.stringify(draft) !== baseline : false), [draft, baseline]);

  useEffect(() => {
    const onChange = () => setRoute(parseHash());
    window.addEventListener('hashchange', onChange);
    window.addEventListener('popstate', onChange);
    return () => { window.removeEventListener('hashchange', onChange); window.removeEventListener('popstate', onChange); };
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set('q', search.trim());
    if (kind !== 'all') params.set('kind', kind);
    if (enableFilter !== 'all') params.set('enable', enableFilter);
    const res = await api(`/core/marketing/promotions?${params.toString()}`);
    if (res.ok) setItems(res.payload?.results || []);
    setLoading(false);
  }, [search, kind, enableFilter]);

  const loadDictionaries = useCallback(async () => {
    const [g, c] = await Promise.all([api('/core/marketing/groups'), api('/core/marketing/concepts')]);
    if (g.ok) setGroupOptions((g.payload?.results || []).map((x) => ({ label: x.name, value: x.id })));
    if (c.ok) setConceptOptions((c.payload?.results || []).map((x) => ({ label: x, value: x })));
  }, []);

  useEffect(() => { loadDictionaries(); }, [loadDictionaries]);
  useEffect(() => { const id = setTimeout(loadList, 200); return () => clearTimeout(id); }, [loadList]);

  const selected = useMemo(() => items.find((i) => i.id === route.id) || null, [items, route.id]);

  // Load detail draft when a configured promotion or #new is selected.
  useEffect(() => {
    let cancelled = false;
    if (route.creating) { const d = emptyDraft(); setDraft(d); setBaseline(JSON.stringify(d)); return () => {}; }
    if (!route.id) { setDraft(null); setBaseline(''); return () => {}; }
    (async () => {
      const res = await api(`/core/marketing/promotion?id=${encodeURIComponent(route.id)}`);
      if (cancelled) return;
      if (res.ok && res.payload?.result) {
        const r = res.payload.result;
        if (r.createdByUser) { const d = fromRecord(r); setDraft(d); setBaseline(JSON.stringify(d)); }
        else { setDraft(null); setBaseline(''); } // programmed → read-only via `selected`
      } else { toast('error', res.payload?.error || t('Promotion not found')); setDraft(null); setBaseline(''); }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.id, route.creating]);

  const guardedNav = (targetHash) => { if (dirty) { setPendingNav(targetHash); return; } setHash(targetHash); };
  const resolvePendingNav = (proceed) => { const tgt = pendingNav; setPendingNav(null); if (proceed && tgt != null) setHash(tgt); };

  const buildConfigDiscount = (d) => {
    const cd = {
      discountType: d.discountType, discountAmount: Number(d.discountAmount) || 0,
      dishes: d.scope === 'selected' ? d.dishes : [],
      groups: d.scope === 'selected' ? d.groups : [],
      deliveryMethod: d.deliveryMethod,
      excludeModifiers: d.excludeModifiers,
      exclude: { dishes: d.excludeDishes, groups: d.excludeGroups },
      minBasketTotal: Number(d.minBasketTotal) || 0,
    };
    if (d.giftEnabled) {
      const dishes = (d.giftDishes || []).filter((g) => g && g.dishId).map((g) => ({ dishId: g.dishId, amount: Number(g.amount) || 1 }));
      if (dishes.length) cd.gift = { minBasketTotal: Number(d.giftMinBasketTotal) || 0, dishes };
    }
    return cd;
  };

  const save = async () => {
    if (!draft) return;
    if (!draft.name.trim()) { toast('error', t('Name is required')); return; }
    if (!draft.description.trim()) { toast('error', t('Description is required')); return; }
    setSaving(true);
    const body = {
      id: draft.id || undefined, name: draft.name, description: draft.description,
      concept: draft.concept, isJoint: draft.isJoint, isPublic: draft.isPublic,
      enable: draft.enable, sortOrder: draft.sortOrder, worktime: draft.worktime ?? null,
      configDiscount: buildConfigDiscount(draft),
    };
    const res = await api('/core/marketing/promotion', { method: 'POST', body: JSON.stringify(body) });
    setSaving(false);
    if (!res.ok || res.payload?.success === false) { toast('error', res.payload?.error || t('Save failed')); return; }
    toast('success', t('Promotion saved'));
    await loadList();
    const saved = res.payload?.result;
    if (saved?.id) setHash(`promotion/${encodeURIComponent(saved.id)}`); else setHash('list');
  };

  const doDelete = async () => {
    if (!draft?.id) return;
    setSaving(true);
    const res = await api('/core/marketing/promotion-delete', { method: 'POST', body: JSON.stringify({ id: draft.id }) });
    setSaving(false);
    if (!res.ok || res.payload?.success === false) { toast('error', res.payload?.error || t('Delete failed')); return; }
    toast('success', t('Promotion deleted'));
    await loadList();
    setHash('list');
  };

  const onToggle = async (id, enable, sortOrder) => {
    setSavingToggle(true);
    const body = { id, enable };
    if (sortOrder !== undefined) body.sortOrder = sortOrder;
    const res = await api('/core/marketing/promotion-toggle', { method: 'POST', body: JSON.stringify(body) });
    setSavingToggle(false);
    if (!res.ok || res.payload?.success === false) { toast('error', res.payload?.error || t('Update failed')); return; }
    const updated = res.payload?.result;
    if (updated) setItems((list) => list.map((i) => (i.id === updated.id ? updated : i)));
    toast('success', t('Saved'));
  };

  const editorOpen = route.creating || Boolean(route.id);
  const programmed = items.filter((i) => !i.createdByUser);
  const configured = items.filter((i) => i.createdByUser);
  const showProgrammed = kind !== 'configured';
  const showConfigured = kind !== 'programmed';

  return (
    <div style={styles.pageShell}>
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 24, lineHeight: '32px', fontWeight: 700, margin: 0 }}>{t('Promotions')}</h1>
          <p style={{ margin: '6px 0 0', color: 'var(--muted-foreground)', fontSize: 14, maxWidth: 720 }}>{t('Programmed promotions are view-only (enable/priority); configured ones are edited with a full form instead of JSON.')}</p>
        </div>
      </header>

      <div style={{ display: 'grid', gap: 24, gridTemplateColumns: editorOpen ? 'minmax(300px, 380px) minmax(420px, 1fr)' : '1fr', alignItems: 'start' }}>
        {/* List */}
        <section style={styles.panel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <h2 style={styles.sectionTitle}>{t('Promotions')}</h2>
            <Button type="button" size="sm" onClick={() => guardedNav('new')}>+ {t('Promotion')}</Button>
          </div>
          <div style={{ display: 'inline-flex', gap: 6 }}>
            <button type="button" style={segBtn(kind === 'all')} onClick={() => setKind('all')}>{t('All')}</button>
            <button type="button" style={segBtn(kind === 'programmed')} onClick={() => setKind('programmed')}>{t('Programmed')}</button>
            <button type="button" style={segBtn(kind === 'configured')} onClick={() => setKind('configured')}>{t('Configured')}</button>
          </div>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('Search by name, description')} />
          <Select value={enableFilter} onValueChange={setEnableFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('All statuses')}</SelectItem>
              <SelectItem value="on">{t('Enabled')}</SelectItem>
              <SelectItem value="off">{t('Disabled')}</SelectItem>
            </SelectContent>
          </Select>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '64vh', overflow: 'auto' }}>
            {loading && items.length === 0 ? (
              <div style={styles.help}>{t('loading')}</div>
            ) : items.length === 0 ? (
              <div style={styles.help}>{t('No promotions found')}</div>
            ) : (
              <>
                {showConfigured && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <span style={{ ...styles.help, fontWeight: 700, textTransform: 'uppercase' }}>{t('Configured')} ({configured.length})</span>
                    {configured.length === 0 ? <div style={styles.help}>{t('None yet')}</div> : configured.map((i) => (
                      <PromotionCard key={i.id} t={t} language={language} item={i} active={i.id === route.id} onOpen={(id) => guardedNav(`promotion/${encodeURIComponent(id)}`)} onToggle={onToggle} savingToggle={savingToggle} />
                    ))}
                  </div>
                )}
                {showProgrammed && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <span style={{ ...styles.help, fontWeight: 700, textTransform: 'uppercase' }}>{t('Programmed')} ({programmed.length})</span>
                    {programmed.length === 0 ? <div style={styles.help}>{t('None yet')}</div> : programmed.map((i) => (
                      <PromotionCard key={i.id} t={t} language={language} item={i} active={i.id === route.id} onOpen={(id) => guardedNav(`promotion/${encodeURIComponent(id)}`)} onToggle={onToggle} savingToggle={savingToggle} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* Detail */}
        {editorOpen && (
          <section style={styles.panel}>
            {route.creating || (selected && selected.createdByUser) ? (
              draft ? (
                <ConfiguredForm
                  t={t} language={language} draft={draft} setDraft={setDraft} baseline={baseline}
                  saving={saving} creating={route.creating} onSave={save} onDelete={() => setConfirmDelete(true)}
                  groupOptions={groupOptions} conceptOptions={conceptOptions} dishNames={dishNames} setDishNames={setDishNames}
                />
              ) : <div style={styles.help}>{t('loading')}</div>
            ) : selected ? (
              <ProgrammedDetail t={t} language={language} item={selected} onToggle={onToggle} savingToggle={savingToggle} />
            ) : (
              <div style={styles.help}>{t('loading')}</div>
            )}
          </section>
        )}
      </div>

      <ConfirmDialog isOpen={confirmDelete} onClose={() => setConfirmDelete(false)} onConfirm={doDelete}
        title={t('Delete promotion?')} message={t('This soft-deletes the configured promotion and turns it off.')}
        confirmText={t('Delete')} cancelText={t('Cancel')} />
      <ConfirmDialog isOpen={pendingNav !== null} onClose={() => resolvePendingNav(false)} onConfirm={() => resolvePendingNav(true)}
        title={t('Discard unsaved changes?')} message={t('You have unsaved changes that will be lost.')}
        confirmText={t('Discard')} cancelText={t('Cancel')} />
    </div>
  );
}

export default function PromotionsManager(props) {
  return (
    <I18nProvider initialLocale={props.locale} messages={props.messages}>
      <PromotionsManagerContent />
    </I18nProvider>
  );
}

if (typeof window !== 'undefined') {
  window.PromotionsManager = window.PromotionsManager || {};
  window.PromotionsManager.Component = PromotionsManager;
  window.PromotionsManager.mount = (el = null) => {
    try {
      const target = el || document.getElementById('promotions-manager-root') || (() => {
        const div = document.createElement('div');
        div.id = 'promotions-manager-root';
        (document.querySelector('#app') || document.body).appendChild(div);
        return div;
      })();
      if (window.ReactDOM && window.ReactDOM.render) {
        window.ReactDOM.render(React.createElement(PromotionsManager), target);
      } else if (window.ReactDOM && window.ReactDOM.hydrateRoot) {
        window.ReactDOM.hydrateRoot(target, React.createElement(PromotionsManager));
      }
    } catch (mountError) {
      void mountError;
    }
  };
}
