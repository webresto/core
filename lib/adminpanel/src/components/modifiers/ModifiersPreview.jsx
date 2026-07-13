import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { apiGet, apiPostForm } from './api';
import {
  buildInitialSelection, groupWidget, validateSelection, configWarnings,
  computeTotal, disablePlus, disableMinus, increment, decrement,
  pickSingle, toggleCheckbox, negativeContributionWarning,
} from './previewModel';

// "Storefront" preview popup for the modifiers editor (docs/ModifiersPreviewSpec.md).
// Look borrowed from the `minimal` design DishModal (media on top, sectioned body,
// sticky footer with the total + CTA); behaviour comes strictly from previewModel.js.
// The popup never mutates the editor value: selection here is ephemeral.

const T = {
  panel: 'var(--background, #ffffff)',
  card: 'var(--card, #ffffff)',
  fg: 'var(--foreground, #0a0a0a)',
  muted: 'var(--muted-foreground, #6b7280)',
  border: 'var(--border, #e5e7eb)',
  primary: 'var(--primary, #2563eb)',
  primaryFg: 'var(--primary-foreground, #ffffff)',
  accent: 'var(--accent, #f1f5f9)',
  destructive: 'var(--destructive, #ef4444)',
};
const RADIUS = 'var(--radius, 8px)';
// Admin-facing config warnings: amber, visually distinct from guest validation errors.
const WARN = {
  fg: '#b45309',
  bg: 'color-mix(in oklab, #f59e0b 14%, transparent)',
  border: 'color-mix(in oklab, #f59e0b 45%, transparent)',
};

const ACCEPT_MIME = ['image/jpeg', 'image/png'];
const MAX_UPLOAD_MB = 5;

const SM_KEYS = ['sm', 'small', 'origin', 'lg', 'large'];
const LG_KEYS = ['lg', 'large', 'origin', 'sm', 'small'];

function pickImageUrl(images, keys) {
  if (!images || typeof images !== 'object') return null;
  for (const key of keys) if (images[key]) return images[key];
  const first = Object.values(images).find(Boolean);
  return first || null;
}

const numberFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
const fmt = (n) => numberFormat.format(Number(n) || 0);

// ---- icons ------------------------------------------------------------------
const Svg = (props) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props} />
);
const IconClose = () => (<Svg width="18" height="18"><path d="M18 6 6 18M6 6l12 12" /></Svg>);
const IconCamera = (props) => (
  <Svg {...props}><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></Svg>
);
const IconAlert = () => (<Svg width="13" height="13"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /><path d="M12 9v4M12 17h.01" /></Svg>);
const IconInfo = () => (<Svg width="14" height="14"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></Svg>);
const IconImage = (props) => (<Svg {...props}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></Svg>);

function Spinner({ size = 14 }) {
  return (
    <span
      style={{
        width: size, height: size, borderRadius: '50%', display: 'inline-block',
        border: `2px solid ${T.border}`, borderTopColor: T.primary,
        animation: 'mp-spin .7s linear infinite',
      }}
    />
  );
}

// ---- small blocks -----------------------------------------------------------
function ConfigWarning({ children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12, color: WARN.fg,
      background: WARN.bg, border: `1px solid ${WARN.border}`, borderRadius: RADIUS, padding: '5px 8px',
    }} data-testid="preview-config-warning">
      <span style={{ display: 'inline-flex', marginTop: 1 }}><IconAlert /></span>
      <span>{children}</span>
    </div>
  );
}

function GuestError({ children, testid }) {
  return (
    <div style={{ fontSize: 12, color: T.destructive, display: 'flex', alignItems: 'center', gap: 6 }} data-testid={testid || 'preview-guest-error'}>
      <span style={{ display: 'inline-flex' }}><IconAlert /></span>
      {children}
    </div>
  );
}

function Badge({ children, tone = 'muted' }) {
  const tones = {
    muted: { color: T.muted, background: T.accent, border: 'transparent' },
    free: { color: T.primary, background: 'color-mix(in oklab, var(--primary, #2563eb) 12%, transparent)', border: 'transparent' },
    off: { color: T.destructive, background: 'color-mix(in oklab, var(--destructive, #ef4444) 10%, transparent)', border: 'transparent' },
  };
  const s = tones[tone] || tones.muted;
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 999,
      color: s.color, background: s.background, border: `1px solid ${s.border}`, whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
}

// Thumb with a compact uploader for option dishes without a photo (spec §5.3).
function Thumb({ size = 40, url, canUpload, uploading, onFile, tr, testid }) {
  const inputRef = useRef(null);
  if (url) {
    return (
      <img
        src={url} alt="" data-testid={testid}
        style={{ width: size, height: size, borderRadius: 8, objectFit: 'cover', flexShrink: 0, background: T.accent }}
      />
    );
  }
  if (!canUpload) {
    return (
      <span style={{
        width: size, height: size, borderRadius: 8, flexShrink: 0, display: 'inline-flex',
        alignItems: 'center', justifyContent: 'center', color: T.muted, background: T.accent,
      }} data-testid={testid}>
        <IconImage width={Math.round(size * 0.45)} height={Math.round(size * 0.45)} />
      </span>
    );
  }
  return (
    <span
      role="button"
      tabIndex={0}
      title={tr('Upload photo')}
      data-testid={testid ? `${testid}-uploader` : 'preview-thumb-uploader'}
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); inputRef.current?.click(); }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); inputRef.current?.click(); } }}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDrop={(e) => {
        e.preventDefault(); e.stopPropagation();
        const file = e.dataTransfer?.files?.[0];
        if (file) onFile(file);
      }}
      style={{
        width: size, height: size, borderRadius: 8, flexShrink: 0, display: 'inline-flex',
        alignItems: 'center', justifyContent: 'center', color: T.muted, cursor: 'pointer',
        border: `1px dashed ${T.border}`, background: T.panel, boxSizing: 'border-box',
      }}
    >
      {uploading ? <Spinner size={Math.round(size * 0.4)} /> : <IconCamera width={Math.round(size * 0.45)} height={Math.round(size * 0.45)} />}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_MIME.join(',')}
        style={{ display: 'none' }}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          const file = e.target.files && e.target.files[0];
          e.target.value = '';
          if (file) onFile(file);
        }}
      />
    </span>
  );
}

function CounterControl({ value, onMinus, onPlus, minusDisabled, plusDisabled, gi, ci }) {
  const btn = (disabled) => ({
    width: 26, height: 26, borderRadius: 8, border: `1px solid ${T.border}`, background: T.panel,
    color: disabled ? T.muted : T.fg, cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 15,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, opacity: disabled ? 0.45 : 1,
  });
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
      <button type="button" style={btn(minusDisabled)} disabled={minusDisabled} onClick={onMinus}
        aria-label="−" data-testid={`preview-minus-${gi}-${ci}`}>−</button>
      <span style={{ minWidth: 18, textAlign: 'center', fontSize: 14, fontWeight: 600 }} data-testid={`preview-amount-${gi}-${ci}`}>{value}</span>
      <button type="button" style={btn(plusDisabled)} disabled={plusDisabled} onClick={onPlus}
        aria-label="+" data-testid={`preview-plus-${gi}-${ci}`}>+</button>
    </span>
  );
}

// ---- main popup ---------------------------------------------------------------
/**
 * @param {Array}    groups       normalized editor groups (modifiersModel shape)
 * @param {Object}   groupLabels  group id -> display name
 * @param {Object}   dishLabels   dish id -> display name
 * @param {Object}   [dishMeta]   edited dish: { id, name, price, description } (saved form values)
 * @param {Function} tr           translate(key)
 * @param {Function} onClose
 */
function ModifiersPreview({ groups, groupLabels, dishLabels, dishMeta, tr, onClose }) {
  const [amounts, setAmounts] = useState(() => buildInitialSelection(groups));
  const [dishInfo, setDishInfo] = useState({});
  const [uploading, setUploading] = useState({});
  const [uploadErrors, setUploadErrors] = useState({});

  const panelRef = useRef(null);
  const prevFocusRef = useRef(null);

  // Fetch option-dish data (price/images/availability) + the edited dish's image/weight.
  const referencedIds = useMemo(() => {
    const ids = new Set();
    groups.forEach((g) => g.childModifiers.forEach((c) => { if (c.id) ids.add(c.id); }));
    if (dishMeta?.id) ids.add(dishMeta.id);
    return Array.from(ids);
  }, [groups, dishMeta?.id]);

  useEffect(() => {
    if (!referencedIds.length) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const { results = [] } = await apiGet(`/core/modifiers/dishes?ids=${encodeURIComponent(referencedIds.join(','))}&onlyModifiers=0`);
        if (!cancelled) setDishInfo((prev) => ({ ...prev, ...Object.fromEntries(results.map((r) => [r.id, r])) }));
      } catch { /* preview still works without extended data */ }
    })();
    return () => { cancelled = true; };
  }, [referencedIds]);

  // Modal chrome: focus trap, Esc, background scroll lock, focus restore.
  useEffect(() => {
    prevFocusRef.current = document.activeElement;
    panelRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      } else if (e.key === 'Tab' && panelRef.current) {
        const focusables = Array.from(panelRef.current.querySelectorAll(
          'button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )).filter((el) => el.offsetParent !== null || el === document.activeElement);
        if (!focusables.length) { e.preventDefault(); return; }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = prevOverflow;
      if (prevFocusRef.current && typeof prevFocusRef.current.focus === 'function') prevFocusRef.current.focus();
    };
  }, [onClose]);

  const widgets = useMemo(() => groups.map((g) => groupWidget(g)), [groups]);
  const getDish = useCallback((gi, ci) => dishInfo[groups[gi]?.childModifiers?.[ci]?.id], [dishInfo, groups]);
  const issues = useMemo(() => validateSelection(groups, amounts), [groups, amounts]);
  const warnings = useMemo(() => configWarnings(groups, getDish), [groups, getDish]);

  const editedDishInfo = dishMeta?.id ? dishInfo[dishMeta.id] : undefined;
  const basePrice = Number(dishMeta?.price ?? editedDishInfo?.price) || 0;
  const total = useMemo(
    () => computeTotal(basePrice, groups, amounts, (gi, ci) => getDish(gi, ci)?.price ?? 0),
    [basePrice, groups, amounts, getDish],
  );

  const trN = useCallback((key, n) => tr(key).replace('{n}', String(n)), [tr]);

  const uploadPhoto = useCallback(async (dishId, file) => {
    if (!dishId || !file) return;
    if (!ACCEPT_MIME.includes(file.type)) {
      setUploadErrors((prev) => ({ ...prev, [dishId]: tr('Only JPEG or PNG images are allowed') }));
      return;
    }
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setUploadErrors((prev) => ({ ...prev, [dishId]: trN('Image is too large (max {n} MB)', MAX_UPLOAD_MB) }));
      return;
    }
    setUploadErrors((prev) => ({ ...prev, [dishId]: null }));
    setUploading((prev) => ({ ...prev, [dishId]: true }));
    try {
      const fd = new FormData();
      fd.append('dishId', dishId);
      fd.append('file', file);
      await apiPostForm('/core/modifiers/dish-image', fd);
      const { results = [] } = await apiGet(`/core/modifiers/dishes?ids=${encodeURIComponent(dishId)}&onlyModifiers=0`);
      setDishInfo((prev) => ({ ...prev, ...Object.fromEntries(results.map((r) => [r.id, r])) }));
    } catch (e) {
      setUploadErrors((prev) => ({ ...prev, [dishId]: e?.message || tr('Upload failed') }));
    } finally {
      setUploading((prev) => ({ ...prev, [dishId]: false }));
    }
  }, [tr, trN]);

  // ---- option row pieces -------------------------------------------------------
  const optionName = (child) => dishLabels[child.id] || dishInfo[child.id]?.name || child.id || '—';
  const optionPrice = (child) => dishInfo[child.id]?.price ?? 0;
  const optionUnavailable = (child) => {
    const d = dishInfo[child.id];
    return Boolean(d && (d.isDeleted || d.enable === false || d.notForSale || d.balance === 0));
  };

  function optionMetaLine(child) {
    const d = dishInfo[child.id];
    if (!d || d.weight == null || !(d.weight > 0)) return null;
    return `${fmt(d.weight)}${d.measureUnit ? ` ${d.measureUnit}` : ''}`;
  }

  function optionBadges(child, gi, ci, amount) {
    const badges = [];
    const free = typeof child.freeOfChargeAmount === 'number' && child.freeOfChargeAmount > 0 ? child.freeOfChargeAmount : 0;
    if (free > 0) badges.push(<Badge key="free" tone="free">{trN('First {n} free', free)}</Badge>);
    if (optionUnavailable(child)) badges.push(<Badge key="off" tone="off">{tr('Unavailable')}</Badge>);
    return badges;
  }

  function optionExtras(child, gi, ci, amount) {
    const rows = [];
    issues.filter((i) => i.groupIndex === gi && i.childIndex === ci).forEach((i, k) => {
      rows.push(<GuestError key={`err-${k}`} testid={`preview-opt-error-${gi}-${ci}`}>{trN(i.message, i.n)}</GuestError>);
    });
    warnings.filter((w) => w.groupIndex === gi && w.childIndex === ci).forEach((w, k) => {
      rows.push(<ConfigWarning key={`warn-${k}`}>{tr(w.message)}</ConfigWarning>);
    });
    if (negativeContributionWarning(child, amount)) {
      rows.push(
        <ConfigWarning key="neg">
          {tr('Negative price contribution — check freeOfChargeAmount')}
        </ConfigWarning>,
      );
    }
    const uploadError = child.id ? uploadErrors[child.id] : null;
    if (uploadError) rows.push(<GuestError key="upload">{uploadError}</GuestError>);
    if (!rows.length) return null;
    return <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>{rows}</div>;
  }

  function optionThumb(child, size, testid) {
    const d = dishInfo[child.id];
    const url = pickImageUrl(d?.images, SM_KEYS);
    return (
      <Thumb
        size={size}
        url={url}
        canUpload={Boolean(child.id)}
        uploading={Boolean(uploading[child.id])}
        onFile={(file) => uploadPhoto(child.id, file)}
        tr={tr}
        testid={testid}
      />
    );
  }

  // Generic list row (radio / checkbox / counter views share the same layout).
  function OptionListRow({ gi, ci, control, onActivate, active, disabled }) {
    const child = groups[gi].childModifiers[ci];
    const amount = amounts[gi][ci];
    const price = optionPrice(child);
    const clickable = typeof onActivate === 'function';
    return (
      <div
        role={clickable ? 'button' : undefined}
        tabIndex={clickable && !disabled ? 0 : undefined}
        aria-pressed={clickable ? Boolean(active) : undefined}
        data-testid={`preview-opt-${gi}-${ci}`}
        onClick={clickable && !disabled ? onActivate : undefined}
        onKeyDown={clickable && !disabled ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onActivate(); } } : undefined}
        style={{
          display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px',
          borderRadius: RADIUS, border: `1px solid ${active ? T.primary : T.border}`,
          background: active ? 'color-mix(in oklab, var(--primary, #2563eb) 7%, transparent)' : T.card,
          cursor: clickable ? (disabled ? 'not-allowed' : 'pointer') : 'default',
          opacity: disabled && !active ? 0.55 : 1, transition: 'border-color .12s, background .12s',
        }}
      >
        {optionThumb(child, 40, `preview-thumb-${gi}-${ci}`)}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: T.fg }}>{optionName(child)}</span>
            {optionBadges(child, gi, ci, amount)}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginTop: 2 }}>
            {price > 0 && <span style={{ fontSize: 12.5, fontWeight: 600, color: T.muted }}>+{fmt(price)}</span>}
            {optionMetaLine(child) && <span style={{ fontSize: 12, color: T.muted }}>{optionMetaLine(child)}</span>}
          </div>
          {optionExtras(child, gi, ci, amount)}
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', marginTop: 2 }}>{control}</span>
      </div>
    );
  }

  function RadioDot({ active }) {
    return (
      <span style={{
        width: 18, height: 18, borderRadius: '50%', flexShrink: 0, boxSizing: 'border-box',
        border: `2px solid ${active ? T.primary : T.border}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {active && <span style={{ width: 8, height: 8, borderRadius: '50%', background: T.primary }} />}
      </span>
    );
  }

  function CheckboxBox({ active, disabled }) {
    return (
      <span style={{
        width: 18, height: 18, borderRadius: 5, flexShrink: 0, boxSizing: 'border-box',
        border: `2px solid ${active ? T.primary : T.border}`, background: active ? T.primary : 'transparent',
        color: T.primaryFg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        opacity: disabled ? 0.5 : 1,
      }}>
        {active && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
        )}
      </span>
    );
  }

  // ---- widget renderers ---------------------------------------------------------
  function renderSetList(gi, idxList) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }} data-testid={`preview-set-${gi}`}>
        {idxList.map((ci) => {
          const child = groups[gi].childModifiers[ci];
          const amount = amounts[gi][ci];
          const shownQty = amount > 0 ? amount : child.minAmount || 0;
          const price = optionPrice(child);
          return (
            <div key={child._id || ci} data-testid={`preview-opt-${gi}-${ci}`}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '6px 8px', borderRadius: RADIUS, background: T.accent }}>
              {optionThumb(child, 36, `preview-thumb-${gi}-${ci}`)}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: T.fg }}>{optionName(child)}</span>
                  {optionBadges(child, gi, ci, amount)}
                </div>
                {optionExtras(child, gi, ci, amount)}
              </div>
              <span style={{ fontSize: 12.5, color: T.muted, whiteSpace: 'nowrap', marginTop: 3 }}>
                ×{shownQty}{price > 0 ? ` · +${fmt(price * shownQty)}` : ''}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  function renderSegmented(gi, idxList) {
    return (
      <div style={{
        display: 'flex', gap: 4, padding: 4, borderRadius: RADIUS,
        border: `1px solid ${T.border}`, background: T.accent,
      }} role="radiogroup" data-testid={`preview-segment-${gi}`}>
        {idxList.map((ci) => {
          const child = groups[gi].childModifiers[ci];
          const active = amounts[gi][ci] > 0;
          const price = optionPrice(child);
          return (
            <button
              key={child._id || ci}
              type="button"
              role="radio"
              aria-checked={active}
              data-testid={`preview-opt-${gi}-${ci}`}
              onClick={() => setAmounts((prev) => pickSingle(groups, prev, gi, ci))}
              style={{
                flex: 1, minWidth: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '7px 8px', minHeight: 36, borderRadius: `calc(${RADIUS} - 2px)`, border: '1px solid transparent',
                background: active ? T.primary : 'transparent', color: active ? T.primaryFg : T.fg,
                fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'background .12s, color .12s',
              }}
            >
              {optionThumb(child, 22, `preview-thumb-${gi}-${ci}`)}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{optionName(child)}</span>
              {price > 0 && <span style={{ fontSize: 11.5, fontWeight: 600, opacity: 0.85 }}>+{fmt(price)}</span>}
            </button>
          );
        })}
      </div>
    );
  }

  function renderSegmentedExtras(gi, idxList) {
    // Badges / warnings for pill options are rendered under the segmented control.
    const blocks = [];
    idxList.forEach((ci) => {
      const child = groups[gi].childModifiers[ci];
      const amount = amounts[gi][ci];
      const badges = optionBadges(child, gi, ci, amount);
      const extras = optionExtras(child, gi, ci, amount);
      if (badges.length || extras) {
        blocks.push(
          <div key={child._id || ci} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {(badges.length || null) && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: T.muted }}>{optionName(child)}:</span>
                {badges}
              </div>
            )}
            {extras}
          </div>,
        );
      }
    });
    if (!blocks.length) return null;
    return <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>{blocks}</div>;
  }

  function renderRadioList(gi, idxList) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }} role="radiogroup" data-testid={`preview-radio-${gi}`}>
        {idxList.map((ci) => {
          const child = groups[gi].childModifiers[ci];
          const active = amounts[gi][ci] > 0;
          return (
            <OptionListRow
              key={child._id || ci}
              gi={gi} ci={ci}
              active={active}
              control={<RadioDot active={active} />}
              onActivate={() => setAmounts((prev) => pickSingle(groups, prev, gi, ci))}
            />
          );
        })}
      </div>
    );
  }

  function renderCheckboxList(gi, idxList) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }} data-testid={`preview-checkboxes-${gi}`}>
        {idxList.map((ci) => {
          const child = groups[gi].childModifiers[ci];
          const active = amounts[gi][ci] > 0;
          const blocked = !active && disablePlus(groups[gi], child, amounts, gi, ci);
          return (
            <OptionListRow
              key={child._id || ci}
              gi={gi} ci={ci}
              active={active}
              disabled={blocked}
              control={<CheckboxBox active={active} disabled={blocked} />}
              onActivate={() => setAmounts((prev) => toggleCheckbox(groups, prev, gi, ci))}
            />
          );
        })}
      </div>
    );
  }

  function renderCounterList(gi, idxList) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }} data-testid={`preview-counters-${gi}`}>
        {idxList.map((ci) => {
          const child = groups[gi].childModifiers[ci];
          const amount = amounts[gi][ci];
          return (
            <OptionListRow
              key={child._id || ci}
              gi={gi} ci={ci}
              active={amount > 0}
              control={(
                <CounterControl
                  value={amount}
                  gi={gi} ci={ci}
                  minusDisabled={disableMinus(amounts, gi, ci)}
                  plusDisabled={disablePlus(groups[gi], child, amounts, gi, ci)}
                  onMinus={() => setAmounts((prev) => decrement(groups, prev, gi, ci))}
                  onPlus={() => setAmounts((prev) => increment(groups, prev, gi, ci))}
                />
              )}
            />
          );
        })}
      </div>
    );
  }

  function renderSingleCheckbox(gi, ci) {
    const child = groups[gi].childModifiers[ci];
    const active = amounts[gi][ci] > 0;
    const price = optionPrice(child);
    const label = price > 0
      ? tr('Add {name} (+{price})').replace('{name}', optionName(child)).replace('{price}', fmt(price))
      : tr('Add {name}').replace('{name}', optionName(child));
    return (
      <div
        role="button"
        tabIndex={0}
        aria-pressed={active}
        data-testid={`preview-opt-${gi}-${ci}`}
        onClick={() => setAmounts((prev) => toggleCheckbox(groups, prev, gi, ci))}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setAmounts((prev) => toggleCheckbox(groups, prev, gi, ci)); } }}
        style={{
          display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px', cursor: 'pointer',
          borderRadius: RADIUS, border: `1px solid ${active ? T.primary : T.border}`,
          background: active ? 'color-mix(in oklab, var(--primary, #2563eb) 7%, transparent)' : T.card,
        }}
      >
        {optionThumb(child, 40, `preview-thumb-${gi}-${ci}`)}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: T.fg }}>{label}</span>
            {optionBadges(child, gi, ci, amounts[gi][ci])}
          </div>
          {optionMetaLine(child) && <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{optionMetaLine(child)}</div>}
          {optionExtras(child, gi, ci, amounts[gi][ci])}
        </div>
        <span style={{ marginTop: 2 }}><CheckboxBox active={active} /></span>
      </div>
    );
  }

  // ---- group section --------------------------------------------------------------
  function renderGroup(gi) {
    const group = groups[gi];
    const widget = widgets[gi];
    const groupName = groupLabels[group.id] || `${tr('Group')} ${gi + 1}`;
    const required = Boolean(group.required) || (group.minAmount != null && group.minAmount >= 1);
    const multi = !required && ['checkboxes', 'counters'].includes(widget.type);

    const groupErrors = issues.filter((i) => i.groupIndex === gi && i.childIndex === -1);
    const groupWarnings = warnings.filter((w) => w.groupIndex === gi && w.childIndex === -1);

    let content = null;
    if (widget.type === 'unconfigured') {
      // configWarnings already reports "Group is not configured" for this group.
      content = null;
    } else {
      const parts = [];
      if (widget.fixedIdx.length) {
        parts.push(
          <div key="set" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {widget.type !== 'set' && (
              <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '.03em', textTransform: 'uppercase', color: T.muted }}>
                {tr('Included in the set')}
              </div>
            )}
            {renderSetList(gi, widget.fixedIdx)}
          </div>,
        );
      }
      switch (widget.type) {
        case 'set':
          break;
        case 'toggle':
        case 'segment':
          parts.push(
            <div key="free">
              {renderSegmented(gi, widget.freeIdx)}
              {renderSegmentedExtras(gi, widget.freeIdx)}
            </div>,
          );
          break;
        case 'radio':
          parts.push(<div key="free">{renderRadioList(gi, widget.freeIdx)}</div>);
          break;
        case 'checkboxes':
          parts.push(<div key="free">{renderCheckboxList(gi, widget.freeIdx)}</div>);
          break;
        case 'counters':
          parts.push(<div key="free">{renderCounterList(gi, widget.freeIdx)}</div>);
          break;
        case 'single-checkbox':
          parts.push(<div key="free">{renderSingleCheckbox(gi, widget.freeIdx[0])}</div>);
          break;
        case 'single-counter':
          parts.push(<div key="free">{renderCounterList(gi, widget.freeIdx)}</div>);
          break;
        default:
          break;
      }
      content = <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{parts}</div>;
    }

    const setLabel = widget.type === 'set' ? ` · ${tr('Included in the set').toLowerCase()}` : '';
    return (
      <section key={group._id || gi} data-testid={`preview-group-${gi}`} data-widget={widget.type}
        style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: T.fg }}>
          {groupName}
          {required && <span style={{ color: T.muted, fontWeight: 500 }}> · {tr('required')}</span>}
          {multi && <span style={{ color: T.muted, fontWeight: 500 }}> · {tr('you can choose several')}</span>}
          {setLabel && <span style={{ color: T.muted, fontWeight: 500 }}>{setLabel}</span>}
        </div>
        {groupWarnings.map((w, k) => <ConfigWarning key={`gw-${k}`}>{tr(w.message)}</ConfigWarning>)}
        {content}
        {groupErrors.map((i, k) => (
          <GuestError key={`ge-${k}`} testid={`preview-group-error-${gi}`}>{trN(i.message, i.n)}</GuestError>
        ))}
      </section>
    );
  }

  // ---- shell ----------------------------------------------------------------------
  const dishName = dishMeta?.name || editedDishInfo?.name || tr('Dish');
  const headerImage = pickImageUrl(editedDishInfo?.images, LG_KEYS);
  const dishWeight = editedDishInfo && editedDishInfo.weight > 0
    ? `${fmt(editedDishInfo.weight)}${editedDishInfo.measureUnit ? ` ${editedDishInfo.measureUnit}` : ''}`
    : null;

  const invalid = issues.length > 0;
  const ctaTitle = invalid
    ? issues.map((i) => trN(i.message, i.n)).join('\n')
    : undefined;

  const dir = (typeof document !== 'undefined' && document.documentElement.getAttribute('dir')) || undefined;

  const popup = (
    <div
      dir={dir}
      data-testid="modifiers-preview-overlay"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,.55)', padding: 16, boxSizing: 'border-box',
      }}
    >
      <style>{'@keyframes mp-spin { to { transform: rotate(360deg); } }'}</style>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={dishName}
        tabIndex={-1}
        data-testid="modifiers-preview-panel"
        style={{
          width: 'min(560px, 100%)', maxHeight: 'min(88vh, 900px)', display: 'flex', flexDirection: 'column',
          background: T.panel, color: T.fg, borderRadius: 16, border: `1px solid ${T.border}`,
          boxShadow: '0 24px 64px rgba(0,0,0,.35)', overflow: 'hidden', outline: 'none', position: 'relative',
          fontFamily: 'inherit',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={tr('Close')}
          data-testid="preview-close"
          style={{
            position: 'absolute', top: 10, insetInlineEnd: 10, zIndex: 2, width: 32, height: 32,
            borderRadius: '50%', border: `1px solid ${T.border}`, background: T.panel, color: T.fg,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          <IconClose />
        </button>

        {/* media */}
        {headerImage ? (
          <img src={headerImage} alt="" style={{ width: '100%', height: 170, objectFit: 'cover', flexShrink: 0 }} />
        ) : (
          <div style={{
            width: '100%', height: 84, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: T.accent, color: T.muted,
          }}>
            <IconImage width="28" height="28" />
          </div>
        )}

        {/* scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: T.fg }} data-testid="preview-dish-name">{dishName}</h2>
            <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', marginTop: 3 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: T.fg }} data-testid="preview-base-price">{fmt(basePrice)}</span>
              {dishWeight && <span style={{ fontSize: 12.5, color: T.muted }}>{dishWeight}</span>}
            </div>
          </div>

          {/* preview-nature note (spec §4.3) */}
          <div style={{
            display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: T.muted,
            background: T.accent, borderRadius: RADIUS, padding: '7px 10px',
          }} data-testid="preview-note">
            <span style={{ display: 'inline-flex', marginTop: 1 }}><IconInfo /></span>
            <span>{tr('This is a simplified preview for checking the configuration. The look on the site may differ — what is verified here is behaviour: price calculation, required rules and modifier limits.')}</span>
          </div>

          {groups.map((_, gi) => renderGroup(gi))}
        </div>

        {/* sticky footer */}
        <div style={{
          flexShrink: 0, borderTop: `1px solid ${T.border}`, padding: '12px 16px', display: 'flex',
          alignItems: 'center', gap: 12, background: T.panel,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11.5, color: T.muted }}>{tr('Total')}</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: T.fg }} data-testid="preview-total">{fmt(total)}</div>
          </div>
          <button
            type="button"
            disabled={invalid}
            title={ctaTitle}
            data-testid="preview-cta"
            style={{
              padding: '11px 20px', borderRadius: RADIUS, border: '1px solid transparent',
              background: T.primary, color: T.primaryFg, fontSize: 14, fontWeight: 700,
              cursor: invalid ? 'not-allowed' : 'pointer', opacity: invalid ? 0.5 : 1, flexShrink: 0,
            }}
          >
            {tr('Add for {total}').replace('{total}', fmt(total))}
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(popup, document.body);
}

export default ModifiersPreview;
