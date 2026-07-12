import { GroupModifier, Modifier } from "../../../interfaces/Modifier";

// Shared normalize / summarize / validate helpers for the modifiers-editor control.
// Mirrors worktimeViewerHelper.ts: the control renders the editor in add/edit,
// and the list column shows a compact text summary via summarizeModifiers().
//
// The stored value is always GroupModifier[] (see docs/Modifiers.md). We normalize
// unknown / legacy shapes into a predictable editor model and validate against the
// same rules the runtime ProductModifier enforces, so the form can block bad saves.

export interface NormalizedModifier {
  id: string;
  rmsId: string;
  minAmount: number | null;
  maxAmount: number | null;
  defaultAmount: number | null;
  freeOfChargeAmount: number | null;
  required: boolean | null;
  /** Unknown / deprecated keys preserved on save (e.g. amount, modifierId). */
  extra: Record<string, unknown>;
}

export interface NormalizedGroup {
  id: string;
  rmsId: string;
  minAmount: number | null;
  maxAmount: number | null;
  required: boolean | null;
  freeOfChargeAmount: number | null;
  isSingleModifierGroupWrapper: boolean;
  childModifiers: NormalizedModifier[];
  extra: Record<string, unknown>;
}

export interface ValidationIssue {
  /** Index into the groups array, or -1 for a top-level issue. */
  groupIndex: number;
  /** Index into childModifiers, or -1 for a group-level issue. */
  childIndex: number;
  level: "error" | "warn";
  message: string;
}

const CHILD_KNOWN_KEYS = new Set([
  "id",
  "rmsId",
  "minAmount",
  "maxAmount",
  "defaultAmount",
  "freeOfChargeAmount",
  // freeAmount is deprecated: consumed into freeOfChargeAmount, not preserved as an extra.
  "freeAmount",
  "required",
]);

const GROUP_KNOWN_KEYS = new Set([
  "id",
  "rmsId",
  "minAmount",
  "maxAmount",
  "required",
  "freeOfChargeAmount",
  "freeAmount",
  "isSingleModifierGroupWrapper",
  "childModifiers",
]);

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toBooleanOrNull(value: unknown): boolean | null {
  if (value === null || value === undefined) return null;
  return Boolean(value);
}

function collectExtra(source: Record<string, unknown>, known: Set<string>): Record<string, unknown> {
  const extra: Record<string, unknown> = {};
  for (const key of Object.keys(source)) {
    if (!known.has(key)) extra[key] = source[key];
  }
  return extra;
}

function normalizeChild(input: unknown): NormalizedModifier {
  const source = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  // Legacy: modifierId used to carry rmsId; id is the modern anchor.
  const id = typeof source.id === "string" ? source.id : "";
  const rmsId =
    typeof source.rmsId === "string"
      ? source.rmsId
      : typeof source.modifierId === "string"
        ? source.modifierId
        : "";
  const freeOfChargeAmount =
    source.freeOfChargeAmount !== undefined
      ? toNumberOrNull(source.freeOfChargeAmount)
      : toNumberOrNull(source.freeAmount);

  return {
    id,
    rmsId,
    minAmount: toNumberOrNull(source.minAmount),
    maxAmount: toNumberOrNull(source.maxAmount),
    defaultAmount: toNumberOrNull(source.defaultAmount),
    freeOfChargeAmount,
    required: toBooleanOrNull(source.required),
    extra: collectExtra(source, CHILD_KNOWN_KEYS),
  };
}

function normalizeGroup(input: unknown): NormalizedGroup {
  const source = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const id = typeof source.id === "string" ? source.id : "";
  const rmsId =
    typeof source.rmsId === "string"
      ? source.rmsId
      : typeof source.modifierId === "string"
        ? source.modifierId
        : "";
  const freeOfChargeAmount =
    source.freeOfChargeAmount !== undefined
      ? toNumberOrNull(source.freeOfChargeAmount)
      : toNumberOrNull(source.freeAmount);
  const childrenRaw = Array.isArray(source.childModifiers) ? source.childModifiers : [];

  return {
    id,
    rmsId,
    minAmount: toNumberOrNull(source.minAmount),
    maxAmount: toNumberOrNull(source.maxAmount),
    required: toBooleanOrNull(source.required),
    freeOfChargeAmount,
    isSingleModifierGroupWrapper: Boolean(source.isSingleModifierGroupWrapper),
    childModifiers: childrenRaw.map(normalizeChild),
    extra: collectExtra(source, GROUP_KNOWN_KEYS),
  };
}

export function normalizeModifiers(input: unknown): NormalizedGroup[] {
  let list: unknown = input;
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) return [];
    try {
      list = JSON.parse(trimmed);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(list)) return [];
  return list.map(normalizeGroup);
}

/** Drop null/empty optional keys so we emit a clean GroupModifier[]. */
function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue;
    out[k] = v;
  }
  return out as Partial<T>;
}

/** Serialize the editor model back to the stored GroupModifier[] shape. */
export function serializeModifiers(groups: NormalizedGroup[]): GroupModifier[] {
  return groups.map((group) => {
    const childModifiers: Modifier[] = group.childModifiers.map((child) => {
      return {
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
      } as unknown as Modifier;
    });

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
    } as unknown as GroupModifier;
  });
}

/**
 * Validate the editor model against the same invariants the runtime enforces
 * (see libs/ProductModifier.ts) plus authoring-time sanity checks. Returns a flat
 * list of issues; an empty list means the value is safe to save.
 */
export function validateModifiers(groups: NormalizedGroup[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  groups.forEach((group, gi) => {
    if (!group.id) {
      issues.push({ groupIndex: gi, childIndex: -1, level: "error", message: "Group is not linked to a category" });
    }
    if (!group.childModifiers.length) {
      issues.push({ groupIndex: gi, childIndex: -1, level: "error", message: "Group has no modifier options" });
    }

    const min = group.minAmount;
    const max = group.maxAmount;
    if (min != null && min < 0) {
      issues.push({ groupIndex: gi, childIndex: -1, level: "error", message: "Min amount cannot be negative" });
    }
    if (max != null && max < 0) {
      issues.push({ groupIndex: gi, childIndex: -1, level: "error", message: "Max amount cannot be negative" });
    }
    if (min != null && max != null && min > max) {
      issues.push({ groupIndex: gi, childIndex: -1, level: "error", message: "Min amount is greater than max amount" });
    }
    // required flag should agree with minAmount (matches runtime convenience mirror).
    if (group.required && (min == null || min < 1)) {
      issues.push({ groupIndex: gi, childIndex: -1, level: "warn", message: "Group is required but min amount is below 1" });
    }

    const seen = new Set<string>();
    group.childModifiers.forEach((child, ci) => {
      if (!child.id) {
        issues.push({ groupIndex: gi, childIndex: ci, level: "error", message: "Modifier option is not linked to a dish" });
      } else if (seen.has(child.id)) {
        issues.push({ groupIndex: gi, childIndex: ci, level: "error", message: "Duplicate modifier option in group" });
      } else {
        seen.add(child.id);
      }

      const cMin = child.minAmount;
      const cMax = child.maxAmount;
      if (cMin != null && cMax != null && cMin > cMax) {
        issues.push({ groupIndex: gi, childIndex: ci, level: "error", message: "Option min amount is greater than max amount" });
      }
      if (child.defaultAmount != null && cMax != null && child.defaultAmount > cMax) {
        issues.push({ groupIndex: gi, childIndex: ci, level: "warn", message: "Default amount exceeds option max amount" });
      }
    });
  });

  return issues;
}

export function summarizeModifiers(input: unknown): string {
  const groups = normalizeModifiers(input);
  if (groups.length === 0) return "Нет модификаторов";

  const totalOptions = groups.reduce((sum, g) => sum + g.childModifiers.length, 0);
  const requiredCount = groups.filter((g) => g.required || (g.minAmount != null && g.minAmount >= 1)).length;

  const parts = [`${groups.length} гр.`, `${totalOptions} опц.`];
  if (requiredCount) parts.push(`${requiredCount} обяз.`);
  return parts.join(" · ");
}
