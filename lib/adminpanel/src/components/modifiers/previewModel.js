// Pure, framework-free engine for the modifiers preview popup (docs/ModifiersPreviewSpec.md).
// Reproduces each behaviour aspect from its source of truth:
//   - initial selection  → server fillDefault + ensureMinDefaults (libs/ProductModifier.ts);
//   - price              → server Order.countCart modifier block (models/Order.ts);
//   - counter locks +/−  → client dish-modal disablePlus/disableMinus;
//   - validity + errors  → client @webresto/ng-gql dish-modal-form-validators.
// Widget kind per group is DERIVED from the config (spec §4, В1–В7). Selection state is
// a plain number[][] aligned with groups/childModifiers, so React can hold it in useState.

// ---- "0/0 = unlimited" rule (explicit zeros only, mirrors ng-gql `min == 0 && max == 0`) --
function isUnlimited(entry) {
  return entry.minAmount === 0 && entry.maxAmount === 0;
}

/** Effective min/max after the 0/0 rule; null max/min = not set (no bound). */
export function effectiveLimits(entry) {
  if (isUnlimited(entry)) return { min: 0, max: null, unlimited: true };
  return { min: entry.minAmount, max: entry.maxAmount, unlimited: false };
}

// ---- option kind: fixed / binary / countable (spec §4 terminology) --------------------
export function optionKind(child) {
  const { min, max, unlimited } = effectiveLimits(child);
  if (!unlimited && min != null && max != null && min === max && min >= 1) return 'fixed';
  if (!unlimited && max === 1) return 'binary';
  return 'countable';
}

// ---- widget map (spec §4, first match wins) -------------------------------------------
// Returns { type, fixedIdx, freeIdx } where type for the free part is one of:
// 'unconfigured' | 'set' | 'single-checkbox' | 'single-counter' | 'toggle' | 'segment' |
// 'radio' | 'checkboxes' | 'counters'. Mixed groups (В3) keep both idx lists non-empty.
export function groupWidget(group) {
  const children = group.childModifiers || [];
  if (!group.id || children.length === 0) {
    return { type: 'unconfigured', fixedIdx: [], freeIdx: [] };
  }
  const fixedIdx = [];
  const freeIdx = [];
  children.forEach((c, i) => (optionKind(c) === 'fixed' ? fixedIdx : freeIdx).push(i));

  if (freeIdx.length === 0) return { type: 'set', fixedIdx, freeIdx }; // В2

  const type = pickFreeWidget(group, children, freeIdx);
  return { type, fixedIdx, freeIdx }; // В3 when fixedIdx non-empty, else В4–В7
}

function pickFreeWidget(group, children, freeIdx) {
  const allBinary = freeIdx.every((i) => optionKind(children[i]) === 'binary');

  if (freeIdx.length === 1) {
    return allBinary ? 'single-checkbox' : 'single-counter'; // В4
  }

  const { min: gMin, max: gMax, unlimited } = effectiveLimits(group);
  if (!unlimited && gMax === 1 && allBinary) { // В5
    if (freeIdx.length === 2 && gMin === 1) return 'toggle';
    if (freeIdx.length === 3 && gMin === 1) return 'segment';
    return 'radio';
  }
  if (allBinary) return 'checkboxes'; // В6
  return 'counters'; // В7
}

// ---- initial selection: exact port of server fillDefault + ensureMinDefaults ----------
// (libs/ProductModifier.ts — the two steps Order.addDish actually runs).
export function buildInitialSelection(groups) {
  // Step 1 — fillDefault: every option with defaultAmount > 0 starts at defaultAmount.
  const amounts = groups.map((g) =>
    (g.childModifiers || []).map((c) => (c.defaultAmount && c.defaultAmount > 0 ? c.defaultAmount : 0)),
  );

  // Step 2 — ensureMinDefaults: required groups where nothing got selected.
  groups.forEach((g, gi) => {
    const minAmount = g.minAmount ?? 0;
    if (minAmount < 1) return;
    const total = amounts[gi].reduce((s, a) => s + a, 0);
    if (total !== 0) return;

    const children = g.childModifiers || [];
    const defaultIdx = children
      .map((c, i) => i)
      .filter((i) => children[i].defaultAmount && children[i].defaultAmount > 0);

    if (defaultIdx.length > 0) {
      let toFill = minAmount;
      for (const i of defaultIdx) {
        if (toFill <= 0) break;
        const add = Math.min(children[i].defaultAmount, toFill);
        amounts[gi][i] = add;
        toFill -= add;
      }
    } else if (children.length > 0) {
      amounts[gi][0] = minAmount;
    }
  });

  return amounts;
}

// ---- counter locks: exact port of dish-modal1 disablePlus / disableMinus --------------
export function groupSum(amounts, gi) {
  return (amounts[gi] || []).reduce((s, a) => s + a, 0);
}

export function disablePlus(group, child, amounts, gi, ci) {
  const amount = amounts[gi][ci];
  const optMax = isUnlimited(child) ? null : child.maxAmount;
  if (optMax != null && optMax !== 0 && amount >= optMax) return true;
  const grpMax = isUnlimited(group) ? null : group.maxAmount;
  if (grpMax != null && groupSum(amounts, gi) >= grpMax) return true;
  return false;
}

export function disableMinus(amounts, gi, ci) {
  return amounts[gi][ci] === 0;
}

// ---- guest validation: exact port of ng-gql dish-modal-form-validators ----------------
// Returns issues: { groupIndex, childIndex (-1 = group), message, n } with English
// message keys ({n} substituted by the UI through tr()).
export function validateSelection(groups, amounts) {
  const issues = [];
  groups.forEach((g, gi) => {
    const children = g.childModifiers || [];
    const sum = groupSum(amounts, gi);

    if (!isUnlimited(g)) {
      if (g.minAmount != null && sum < g.minAmount) {
        issues.push({ groupIndex: gi, childIndex: -1, message: 'Select at least {n} in this group', n: g.minAmount });
      } else if (g.maxAmount != null && sum > g.maxAmount) {
        issues.push({ groupIndex: gi, childIndex: -1, message: 'You can add no more than {n} in this group', n: g.maxAmount });
      }
    }

    children.forEach((c, ci) => {
      if (isUnlimited(c)) return;
      const amount = amounts[gi][ci];
      if (c.minAmount != null && amount < c.minAmount) {
        issues.push({ groupIndex: gi, childIndex: ci, message: 'Select at least {n} of this option', n: c.minAmount });
      } else if (c.maxAmount != null && amount > c.maxAmount) {
        issues.push({ groupIndex: gi, childIndex: ci, message: 'You can add no more than {n} of this option', n: c.maxAmount });
      }
    });
  });
  return issues;
}

// ---- price: exact port of the Order.countCart modifier block --------------------------
// Contribution of a SELECTED option (amount > 0):
//   (amount − freeOfChargeAmount) × price   when the OPTION's freeOfChargeAmount > 0
//   amount × price                          otherwise
// The server does NOT clamp the difference at zero (negative contribution is real) and
// IGNORES the group-level freeOfChargeAmount entirely.
export function optionContribution(child, amount, price) {
  if (amount <= 0) return 0; // not part of the order at all
  const free = typeof child.freeOfChargeAmount === 'number' && child.freeOfChargeAmount > 0
    ? child.freeOfChargeAmount : 0;
  return (amount - free) * price;
}

/** dishPrices: (groupIndex, childIndex) -> unit price (from the dishes endpoint). */
export function computeTotal(basePrice, groups, amounts, getPrice) {
  let total = Number(basePrice) || 0;
  groups.forEach((g, gi) => {
    (g.childModifiers || []).forEach((c, ci) => {
      total += optionContribution(c, amounts[gi][ci], getPrice(gi, ci) || 0);
    });
  });
  return total;
}

// ---- interactions ---------------------------------------------------------------------
// All widgets are UIs over the same counter model; helpers return the next amounts
// matrix (immutably) or the original when the action is blocked.
function setAmount(amounts, gi, ci, value) {
  const next = amounts.map((row) => [...row]);
  next[gi][ci] = value;
  return next;
}

export function increment(groups, amounts, gi, ci) {
  const g = groups[gi];
  const c = g.childModifiers[ci];
  if (disablePlus(g, c, amounts, gi, ci)) return amounts;
  return setAmount(amounts, gi, ci, amounts[gi][ci] + 1);
}

export function decrement(groups, amounts, gi, ci) {
  if (disableMinus(amounts, gi, ci)) return amounts;
  return setAmount(amounts, gi, ci, amounts[gi][ci] - 1);
}

/** Radio-style pick (toggle/segment/radio, В5): moving the selection = "−" on the old
 *  option and "+" on the new one. With gMin == 0 a repeated click clears the pick. */
export function pickSingle(groups, amounts, gi, ci) {
  const g = groups[gi];
  const { min: gMin } = effectiveLimits(g);
  const widget = groupWidget(g);
  const isPicked = amounts[gi][ci] > 0;

  if (isPicked) {
    if (gMin === 1) return amounts; // exactly one is always selected
    return setAmount(amounts, gi, ci, 0);
  }
  let next = amounts.map((row) => [...row]);
  widget.freeIdx.forEach((i) => { next[gi][i] = 0; });
  next[gi][ci] = 1;
  return next;
}

/** Checkbox toggle (В6 / В4 single-checkbox): 0 ↔ 1, respecting disablePlus. */
export function toggleCheckbox(groups, amounts, gi, ci) {
  if (amounts[gi][ci] > 0) return setAmount(amounts, gi, ci, 0);
  return increment(groups, amounts, gi, ci);
}

// ---- config warnings (admin-facing, not guest errors; spec §3.4 + §4 notes) ------------
// dishInfo: (gi, ci) -> dish record from the dishes endpoint (or undefined while loading).
export function configWarnings(groups, getDish) {
  const warnings = [];
  groups.forEach((g, gi) => {
    const children = g.childModifiers || [];

    if (!g.id || children.length === 0) {
      warnings.push({ groupIndex: gi, childIndex: -1, message: 'Group is not configured' });
      return;
    }

    if (typeof g.freeOfChargeAmount === 'number' && g.freeOfChargeAmount > 0) {
      warnings.push({
        groupIndex: gi, childIndex: -1,
        message: 'Group freeOfChargeAmount does not affect the price (not implemented on the server)',
      });
    }

    const { min: gMin, max: gMax, unlimited: gUnlimited } = effectiveLimits(g);
    const fixedSum = children.reduce((s, c) => (optionKind(c) === 'fixed' ? s + c.minAmount : s), 0);
    if (!gUnlimited && gMax != null && fixedSum > gMax) {
      warnings.push({ groupIndex: gi, childIndex: -1, message: 'Group max is below the sum of fixed option amounts' });
    }

    // Achievable maximum: Σ option maxes (unlimited/unset counts as Infinity).
    if (!gUnlimited && gMin != null && gMin >= 1) {
      const achievable = children.reduce((s, c) => {
        const { max } = effectiveLimits(c);
        return max == null ? Infinity : s + max;
      }, 0);
      if (achievable !== Infinity && gMin > achievable) {
        warnings.push({ groupIndex: gi, childIndex: -1, message: 'Group min is above the achievable maximum of its options' });
      }
    }

    children.forEach((c, ci) => {
      if (optionKind(c) === 'fixed' && (c.defaultAmount ?? 0) !== c.minAmount) {
        warnings.push({ groupIndex: gi, childIndex: ci, message: 'Fixed option without matching default — starts invalid on the site' });
      }
      const { max: cMax, unlimited: cUnlimited } = effectiveLimits(c);
      if (!cUnlimited && c.defaultAmount != null && cMax != null && c.defaultAmount > cMax) {
        warnings.push({ groupIndex: gi, childIndex: ci, message: 'Default amount exceeds option max amount' });
      }
      const dish = getDish ? getDish(gi, ci) : undefined;
      if (dish && (dish.isDeleted || dish.enable === false || dish.notForSale || dish.balance === 0)) {
        warnings.push({ groupIndex: gi, childIndex: ci, message: 'Option dish is unavailable on the site' });
      }
    });
  });
  return warnings;
}

/** Runtime warning: selected amount below the option's free quota → negative contribution. */
export function negativeContributionWarning(child, amount) {
  const free = typeof child.freeOfChargeAmount === 'number' && child.freeOfChargeAmount > 0
    ? child.freeOfChargeAmount : 0;
  return free > 0 && amount > 0 && amount < free;
}
