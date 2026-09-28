/**
 * SetupChecklistService
 *
 * Evaluates the setup checklist LIVE on every call — nothing is cached. Each registered
 * checkup's check() runs in parallel (Promise.allSettled) with a per-check timeout and
 * try/catch, so a slow or throwing module can never block or break the page.
 *
 * The only persisted state is the per-item dismissal map in Settings["SETUP_CHECKLIST_DISMISSED"]
 * (recommended/optional items the user chose to hide or snooze). Required items are never
 * dismissible. See .ai-notes/setup-checklist.md.
 */

import {
  CheckupContext,
  CheckupDefinition,
  CheckupCheckResult,
  CheckupSeverity,
  CheckupStatus,
  CheckupTarget,
  SetupChecklistRegistry,
} from "./SetupChecklistRegistry";

const DISMISSED_SETTING_KEY = "SETUP_CHECKLIST_DISMISSED";
const DEFAULT_CHECK_TIMEOUT_MS = 3000;
const DEFAULT_GO_FIX_LABEL_KEY = "Go to setup";

/** Severity weights for the global weighted progress percentage. */
const SEVERITY_WEIGHT: Record<CheckupSeverity, number> = {
  required: 3,
  recommended: 1,
  optional: 0,
};

export interface DismissalEntry {
  dismissedAt: string;
  /** ISO timestamp; when present and in the future the item is snoozed (auto-returns after). */
  snoozeUntil?: string;
}

export type DismissalMap = Record<string, DismissalEntry>;

/** jsonSchema for the dismissal Settings record (required for type "json"). */
export const DISMISSED_SETTING_JSON_SCHEMA = {
  type: "object",
  additionalProperties: {
    type: "object",
    properties: {
      dismissedAt: { type: "string" },
      snoozeUntil: { type: "string" },
    },
    additionalProperties: false,
  },
} as const;

export interface CheckupItemStatus {
  key: string;
  group: string;
  severity: CheckupSeverity;
  status: CheckupStatus;
  title: string;
  description?: string;
  detail?: string;
  progress?: { done: number; total: number };
  target?: { url: string; label: string; openInNewTab?: boolean };
  dismissible: boolean;
  dismissed: boolean;
  snoozeUntil?: string;
  icon?: string;
  sourceModule?: string;
}

export interface SeverityCounts {
  required: { total: number; done: number };
  recommended: { total: number; done: number };
  optional: { total: number; done: number };
  errors: number;
}

export interface CheckupGroupStatus {
  key: string;
  title: string;
  description?: string;
  icon?: string;
  items: CheckupItemStatus[];
  counts: SeverityCounts;
  ready: boolean;
  progressPercent: number;
}

export interface SetupChecklistStatus {
  groups: CheckupGroupStatus[];
  counts: SeverityCounts;
  overallReady: boolean;
  progressPercent: number;
  generatedAt: string;
  locale: string;
}

export interface SetupChecklistSummary {
  counts: SeverityCounts;
  overallReady: boolean;
  progressPercent: number;
  generatedAt: string;
  labels: {
    title: string;
    ready: string;
    incomplete: string;
    open: string;
    checked: string;
  };
}

function emptyCounts(): SeverityCounts {
  return {
    required: { total: 0, done: 0 },
    recommended: { total: 0, done: 0 },
    optional: { total: 0, done: 0 },
    errors: 0,
  };
}

function warn(message: string, err?: unknown): void {
  try {
    if (err !== undefined) sails.log.warn(`[SetupChecklist] ${message}`, err);
    else sails.log.warn(`[SetupChecklist] ${message}`);
  } catch (_e) {
    /* sails may be unavailable */
  }
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`check timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

/** Normalize a check() return value into a CheckupCheckResult. */
function normalizeResult(raw: CheckupCheckResult | boolean): CheckupCheckResult {
  if (raw === true) return { status: "done" };
  if (raw === false) return { status: "todo" };
  if (!raw || typeof raw !== "object") return { status: "todo" };

  const result: CheckupCheckResult = { ...raw };
  if (!result.status && result.progress) {
    const { done, total } = result.progress;
    result.status = total > 0 && done >= total ? "done" : done > 0 ? "in_progress" : "todo";
  }
  if (!result.status) result.status = "todo";
  return result;
}

function resolveTarget(
  def: CheckupDefinition,
  ctx: CheckupContext
): { url: string; label: string; openInNewTab?: boolean } | undefined {
  const raw: CheckupTarget | null | undefined =
    typeof def.target === "function" ? def.target(ctx) : def.target;
  if (!raw || !raw.url) return undefined;
  return {
    url: raw.url,
    label: ctx.t(raw.labelKey || DEFAULT_GO_FIX_LABEL_KEY),
    openInNewTab: raw.openInNewTab,
  };
}

function resolveText(
  keyOrFn: string | ((ctx: CheckupContext) => string) | undefined,
  fnText: ((ctx: CheckupContext) => string) | undefined,
  ctx: CheckupContext
): string | undefined {
  if (typeof fnText === "function") return fnText(ctx);
  if (typeof keyOrFn === "function") return keyOrFn(ctx);
  if (typeof keyOrFn === "string") return ctx.t(keyOrFn);
  return undefined;
}

export class SetupChecklistService {
  /** Read the dismissal map. The setting is declared/seeded at boot (afterHook). */
  static async getDismissals(): Promise<DismissalMap> {
    try {
      const value = await Settings.get(DISMISSED_SETTING_KEY);
      return value && typeof value === "object" ? (value as DismissalMap) : {};
    } catch (e) {
      warn("failed to read dismissals", e);
      return {};
    }
  }

  private static async writeDismissals(map: DismissalMap): Promise<void> {
    await Settings.set(DISMISSED_SETTING_KEY, {
      value: map as any,
      type: "json",
      jsonSchema: DISMISSED_SETTING_JSON_SCHEMA as any,
      name: "Setup checklist dismissed items",
      description: "Runtime state: checkups the user hid/snoozed on the setup checklist.",
    });
  }

  /** Hide or snooze a non-required checkup. Returns false if not allowed. */
  static async dismiss(key: string, opts: { snoozeDays?: number } = {}): Promise<boolean> {
    const def = SetupChecklistRegistry.getCheckup(key);
    if (!def) return false;
    if (def.severity === "required" || def.dismissible === false) return false;

    const map = await SetupChecklistService.getDismissals();
    const entry: DismissalEntry = { dismissedAt: new Date().toISOString() };
    if (opts.snoozeDays && opts.snoozeDays > 0) {
      entry.snoozeUntil = new Date(Date.now() + opts.snoozeDays * 86400_000).toISOString();
    }
    map[def.key] = entry;
    await SetupChecklistService.writeDismissals(map);
    return true;
  }

  /** Restore a previously dismissed/snoozed checkup. */
  static async restore(key: string): Promise<boolean> {
    const map = await SetupChecklistService.getDismissals();
    if (!(key in map)) return true;
    delete map[key];
    await SetupChecklistService.writeDismissals(map);
    return true;
  }

  /** True when a dismissal entry is currently active (not an expired snooze). */
  private static isDismissedNow(entry: DismissalEntry | undefined, now: Date): boolean {
    if (!entry) return false;
    if (!entry.snoozeUntil) return true;
    return new Date(entry.snoozeUntil).getTime() > now.getTime();
  }

  /** Run every checkup live and assemble the full status. Never cached. */
  static async getStatus(ctx: CheckupContext): Promise<SetupChecklistStatus> {
    const now = ctx.now ?? new Date();
    const timeoutMs = await SetupChecklistService.resolveTimeout();
    const dismissals = await SetupChecklistService.getDismissals();
    const checkups = SetupChecklistRegistry.listCheckups();

    const items = await Promise.all(
      checkups.map((def) => SetupChecklistService.evaluate(def, ctx, dismissals, now, timeoutMs))
    );

    // Group, preserving the registry's group ordering; only render non-empty groups.
    const byGroup = new Map<string, CheckupItemStatus[]>();
    for (const item of items) {
      if (!byGroup.has(item.group)) byGroup.set(item.group, []);
      byGroup.get(item.group)!.push(item);
    }

    const groups: CheckupGroupStatus[] = [];
    const globalCounts = emptyCounts();
    for (const groupDef of SetupChecklistRegistry.listGroups()) {
      const groupItems = byGroup.get(groupDef.key);
      if (!groupItems || groupItems.length === 0) continue;

      const counts = emptyCounts();
      for (const item of groupItems) {
        SetupChecklistService.tally(counts, item);
        SetupChecklistService.tally(globalCounts, item);
      }
      groups.push({
        key: groupDef.key,
        title: resolveText(groupDef.titleKey ?? groupDef.title, groupDef.title, ctx) || groupDef.key,
        description: resolveText(groupDef.descriptionKey, undefined, ctx),
        icon: groupDef.icon,
        items: groupItems,
        counts,
        ready: counts.required.total === counts.required.done,
        progressPercent: SetupChecklistService.percent(counts),
      });
    }

    return {
      groups,
      counts: globalCounts,
      overallReady: globalCounts.required.total === globalCounts.required.done,
      progressPercent: SetupChecklistService.percent(globalCounts),
      generatedAt: now.toISOString(),
      locale: ctx.locale,
    };
  }

  /** Lightweight aggregate for the global banner (same live run, no item arrays). */
  static async getSummary(ctx: CheckupContext): Promise<SetupChecklistSummary> {
    const status = await SetupChecklistService.getStatus(ctx);
    return {
      counts: status.counts,
      overallReady: status.overallReady,
      progressPercent: status.progressPercent,
      generatedAt: status.generatedAt,
      labels: {
        title: ctx.t("Setup checklist"),
        ready: ctx.t("Ready to go"),
        incomplete: ctx.t("Setup is incomplete"),
        open: ctx.t("Open checklist"),
        checked: ctx.t("{done} of {total} checked", {
          done: status.counts.required.done + status.counts.recommended.done + status.counts.optional.done,
          total: status.counts.required.total + status.counts.recommended.total + status.counts.optional.total,
        }),
      },
    };
  }

  private static async resolveTimeout(): Promise<number> {
    try {
      const v = await Settings.get("SETUP_CHECKLIST_CHECK_TIMEOUT_MS");
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : DEFAULT_CHECK_TIMEOUT_MS;
    } catch (_e) {
      return DEFAULT_CHECK_TIMEOUT_MS;
    }
  }

  private static async evaluate(
    def: CheckupDefinition,
    ctx: CheckupContext,
    dismissals: DismissalMap,
    now: Date,
    timeoutMs: number
  ): Promise<CheckupItemStatus> {
    let result: CheckupCheckResult;
    try {
      const raw = await withTimeout(Promise.resolve(def.check(ctx)), timeoutMs);
      result = normalizeResult(raw);
    } catch (e) {
      warn(`check '${def.key}' failed`, e);
      result = { status: "error" };
    }

    const dismissed =
      def.dismissible !== false &&
      def.severity !== "required" &&
      SetupChecklistService.isDismissedNow(dismissals[def.key], now);

    const item: CheckupItemStatus = {
      key: def.key,
      group: def.group,
      severity: def.severity,
      status: dismissed ? "skipped" : (result.status ?? "todo"),
      title: resolveText(def.titleKey ?? def.title, def.title, ctx) || def.key,
      description: resolveText(def.descriptionKey ?? def.description, def.description, ctx),
      progress: result.progress,
      target: resolveTarget(def, ctx),
      dismissible: def.dismissible !== false && def.severity !== "required",
      dismissed,
      snoozeUntil: dismissals[def.key]?.snoozeUntil,
      icon: def.icon,
      sourceModule: def.sourceModule,
    };

    if (result.detail) {
      item.detail = result.detail;
    } else if (result.detailKey) {
      item.detail = ctx.t(result.detailKey, result.detailParams);
    }

    return item;
  }

  /** Count an item into severity buckets. Dismissed/skipped and errors don't count toward "done". */
  private static tally(counts: SeverityCounts, item: CheckupItemStatus): void {
    if (item.status === "error") counts.errors += 1;
    if (item.dismissed) return; // skipped items are excluded from totals/progress

    const bucket = counts[item.severity];
    bucket.total += 1;
    if (item.status === "done") bucket.done += 1;
  }

  /** Weighted progress percentage (required weighs most). Errors/skipped excluded. */
  private static percent(counts: SeverityCounts): number {
    let weightedTotal = 0;
    let weightedDone = 0;
    (["required", "recommended", "optional"] as CheckupSeverity[]).forEach((sev) => {
      const w = SEVERITY_WEIGHT[sev];
      weightedTotal += w * counts[sev].total;
      weightedDone += w * counts[sev].done;
    });
    if (weightedTotal === 0) return 100;
    return Math.round((weightedDone / weightedTotal) * 100);
  }
}
