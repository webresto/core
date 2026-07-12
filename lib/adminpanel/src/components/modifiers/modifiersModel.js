// Pure, framework-free model for the modifiers editor. Mirrors the server-side
// libs/adminpanel/controls/modifiersEditorHelper.ts so the form validates the exact
// same invariants the runtime (libs/ProductModifier.ts) enforces. Kept dependency-free
// so it can be unit-tested and reused in a standalone verification harness.
//
// Stored shape: GroupModifier[] (see docs/Modifiers.md). Editor rows also carry an
// ephemeral `_id` for stable React keys and an `extra` bag preserving unknown/legacy keys.

let SEQ = 0;
export const nextId = () => `mod-${Date.now().toString(36)}-${(SEQ += 1)}`;

const CHILD_KNOWN = new Set([
  // freeAmount is deprecated: consumed into freeOfChargeAmount, not preserved as an extra.
  'id', 'rmsId', 'minAmount', 'maxAmount', 'defaultAmount', 'freeOfChargeAmount', 'freeAmount', 'required',
]);
const GROUP_KNOWN = new Set([
  'id', 'rmsId', 'minAmount', 'maxAmount', 'required', 'freeOfChargeAmount', 'freeAmount',
  'isSingleModifierGroupWrapper', 'childModifiers',
]);

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
function toBooleanOrNull(value) {
  if (value === null || value === undefined) return null;
  return Boolean(value);
}
function collectExtra(source, known) {
  const extra = {};
  Object.keys(source).forEach((k) => { if (!known.has(k)) extra[k] = source[k]; });
  return extra;
}

function normalizeChild(input) {
  const s = input && typeof input === 'object' ? input : {};
  const id = typeof s.id === 'string' ? s.id : '';
  const rmsId = typeof s.rmsId === 'string' ? s.rmsId : (typeof s.modifierId === 'string' ? s.modifierId : '');
  const freeOfChargeAmount = s.freeOfChargeAmount !== undefined
    ? toNumberOrNull(s.freeOfChargeAmount) : toNumberOrNull(s.freeAmount);
  return {
    _id: nextId(),
    id,
    rmsId,
    minAmount: toNumberOrNull(s.minAmount),
    maxAmount: toNumberOrNull(s.maxAmount),
    defaultAmount: toNumberOrNull(s.defaultAmount),
    freeOfChargeAmount,
    required: toBooleanOrNull(s.required),
    extra: collectExtra(s, CHILD_KNOWN),
  };
}

function normalizeGroup(input) {
  const s = input && typeof input === 'object' ? input : {};
  const id = typeof s.id === 'string' ? s.id : '';
  const rmsId = typeof s.rmsId === 'string' ? s.rmsId : (typeof s.modifierId === 'string' ? s.modifierId : '');
  const freeOfChargeAmount = s.freeOfChargeAmount !== undefined
    ? toNumberOrNull(s.freeOfChargeAmount) : toNumberOrNull(s.freeAmount);
  const children = Array.isArray(s.childModifiers) ? s.childModifiers : [];
  return {
    _id: nextId(),
    id,
    rmsId,
    minAmount: toNumberOrNull(s.minAmount),
    maxAmount: toNumberOrNull(s.maxAmount),
    required: toBooleanOrNull(s.required),
    freeOfChargeAmount,
    isSingleModifierGroupWrapper: Boolean(s.isSingleModifierGroupWrapper),
    childModifiers: children.map(normalizeChild),
    extra: collectExtra(s, GROUP_KNOWN),
  };
}

export function normalizeModifiers(input) {
  let list = input;
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return [];
    try { list = JSON.parse(trimmed); } catch { return []; }
  }
  if (!Array.isArray(list)) return [];
  return list.map(normalizeGroup);
}

function compact(obj) {
  const out = {};
  Object.keys(obj).forEach((k) => {
    const v = obj[k];
    if (v === null || v === undefined) return;
    out[k] = v;
  });
  return out;
}

export function serializeModifiers(groups) {
  return groups.map((group) => {
    const childModifiers = group.childModifiers.map((child) => ({
      ...child.extra,
      ...compact({
        id: child.id,
        rmsId: child.rmsId,
        minAmount: child.minAmount,
        maxAmount: child.maxAmount,
        defaultAmount: child.defaultAmount,
        freeOfChargeAmount: child.freeOfChargeAmount,
        required: child.required,
      }),
    }));
    return {
      ...group.extra,
      ...compact({
        id: group.id,
        rmsId: group.rmsId,
        minAmount: group.minAmount,
        maxAmount: group.maxAmount,
        required: group.required,
        freeOfChargeAmount: group.freeOfChargeAmount,
        isSingleModifierGroupWrapper: group.isSingleModifierGroupWrapper || undefined,
      }),
      childModifiers,
    };
  });
}

// Canonical JSON (strips ephemeral _id) — used to compare our echoed edit against
// an external value change, and to emit onChange.
export function toCanonical(input) {
  return JSON.stringify(serializeModifiers(normalizeModifiers(input)));
}

/**
 * Validate the editor model. Returns a flat list of issues:
 *   { groupIndex, childIndex (-1 = group-level), level: 'error'|'warn', message }
 * An empty list means the value is safe to save. Matches modifiersEditorHelper.validateModifiers.
 */
export function validateModifiers(groups) {
  const issues = [];
  groups.forEach((group, gi) => {
    if (!group.id) issues.push({ groupIndex: gi, childIndex: -1, level: 'error', message: 'Group is not linked to a category' });
    if (!group.childModifiers.length) issues.push({ groupIndex: gi, childIndex: -1, level: 'error', message: 'Group has no modifier options' });

    const min = group.minAmount;
    const max = group.maxAmount;
    if (min != null && min < 0) issues.push({ groupIndex: gi, childIndex: -1, level: 'error', message: 'Min amount cannot be negative' });
    if (max != null && max < 0) issues.push({ groupIndex: gi, childIndex: -1, level: 'error', message: 'Max amount cannot be negative' });
    if (min != null && max != null && min > max) issues.push({ groupIndex: gi, childIndex: -1, level: 'error', message: 'Min amount is greater than max amount' });
    if (group.required && (min == null || min < 1)) issues.push({ groupIndex: gi, childIndex: -1, level: 'warn', message: 'Group is required but min amount is below 1' });

    const seen = new Set();
    group.childModifiers.forEach((child, ci) => {
      if (!child.id) issues.push({ groupIndex: gi, childIndex: ci, level: 'error', message: 'Modifier option is not linked to a dish' });
      else if (seen.has(child.id)) issues.push({ groupIndex: gi, childIndex: ci, level: 'error', message: 'Duplicate modifier option in group' });
      else seen.add(child.id);

      const cMin = child.minAmount;
      const cMax = child.maxAmount;
      if (cMin != null && cMax != null && cMin > cMax) issues.push({ groupIndex: gi, childIndex: ci, level: 'error', message: 'Option min amount is greater than max amount' });
      if (child.defaultAmount != null && cMax != null && child.defaultAmount > cMax) issues.push({ groupIndex: gi, childIndex: ci, level: 'warn', message: 'Default amount exceeds option max amount' });
    });
  });
  return issues;
}

export function hasErrors(issues) {
  return issues.some((i) => i.level === 'error');
}

export function makeEmptyGroup() {
  return {
    _id: nextId(),
    id: '',
    rmsId: '',
    minAmount: null,
    maxAmount: null,
    required: false,
    freeOfChargeAmount: null,
    isSingleModifierGroupWrapper: false,
    childModifiers: [],
    extra: {},
  };
}

export function makeEmptyChild() {
  return {
    _id: nextId(),
    id: '',
    rmsId: '',
    minAmount: null,
    maxAmount: null,
    defaultAmount: null,
    freeOfChargeAmount: null,
    required: null,
    extra: {},
  };
}
