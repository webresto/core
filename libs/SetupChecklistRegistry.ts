/**
 * SetupChecklistRegistry
 *
 * In-memory catalog of "checkups" — items a project owner should complete to finish
 * configuring the system (set tokens, fill required settings, create a payment method, …).
 *
 * How modules add their own checkups: docs/SetupChecklist.md ("Registering checkups from a
 * module"). Design notes: .ai-notes/setup-checklist.md.
 *
 * Design:
 *  - Definitions live ONLY in RAM, on a globalThis singleton (survives hot-reload), exactly
 *    like NotificationEventRegistry. Nothing about the definitions is persisted.
 *  - Any module registers its groups/checkups from its own boot hook; core registers its
 *    defaults via registerCoreDefaults() (called from hook/afterHook.ts).
 *  - Each checkup carries a `check()` handler that is evaluated LIVE on every status request
 *    (never cached) — see SetupChecklistService. The registry itself never runs check().
 *  - The checklist is informational/navigational only: it blocks nothing.
 *
 * The ONLY persisted piece of the whole feature is the per-item dismissal map
 * (Settings["SETUP_CHECKLIST_DISMISSED"]), handled by SetupChecklistService — not here.
 */

export type CheckupSeverity = "required" | "recommended" | "optional";

export type CheckupStatus =
  | "done"        // satisfied → blue check
  | "todo"        // not satisfied
  | "in_progress" // partially satisfied (progress.done < progress.total)
  | "error"       // check() threw / timed out — surfaced, never blocks
  | "skipped";    // dismissed/snoozed by the user (non-required only)

/** Where to send the user to complete a checkup. Static or computed at request time. */
export interface CheckupTarget {
  /**
   * Internal admin path (relative to routePrefix, e.g. "/settings-manager?focus=TELEGRAM_BOT_TOKEN")
   * or an absolute URL. May include query/anchor to focus a specific field.
   */
  url: string;
  /** i18n key for the button label. Default: "setup_checklist.go_fix". */
  labelKey?: string;
  openInNewTab?: boolean;
}

/**
 * Result of a live check. `check()` may also return a plain boolean (true=done, false=todo).
 * `status` is optional: when omitted it is inferred from `progress` (done/in_progress) or
 * defaults to "todo" — so a check can return just `{ progress }` or `{ detail }`.
 */
export interface CheckupCheckResult {
  status?: CheckupStatus;
  /** Partial progress, e.g. { done: 3, total: 5 }. Implies "in_progress" when done < total. */
  progress?: { done: number; total: number };
  /** i18n key for a short detail line + interpolation params ({count} etc.). */
  detailKey?: string;
  detailParams?: Record<string, string | number>;
  /** Already-localized detail string — escape hatch when detailKey is not enough. */
  detail?: string;
}

export interface CheckupContext {
  /** Resolved request locale (e.g. "ru", "en"). */
  locale: string;
  /** Localizer built from the admin messages dict (key + {param} interpolation). */
  t: (key: string, params?: Record<string, string | number>) => string;
  now: Date;
}

export interface CheckupDefinition {
  /** Unique snake_case key, e.g. "telegram_bot_token". */
  key: string;
  /** Group key (see CheckupGroupDefinition). Unknown group → auto-created placeholder. */
  group: string;
  severity: CheckupSeverity;

  /** Title: i18n key OR a resolver for fully dynamic text. */
  titleKey?: string;
  title?: (ctx: CheckupContext) => string;
  descriptionKey?: string;
  description?: (ctx: CheckupContext) => string;

  /** Where to send the user to fix this. Function form allows dynamic deep-links. Optional. */
  target?: CheckupTarget | ((ctx: CheckupContext) => CheckupTarget | null | undefined);

  /**
   * LIVE check handler. Runs on every status request, never cached. MUST be fast and free of
   * side effects (read Settings / counts; do not call slow external APIs synchronously here).
   */
  check: (ctx: CheckupContext) => Promise<CheckupCheckResult | boolean> | CheckupCheckResult | boolean;

  /** Can the user dismiss/snooze it. Default: false for "required", true otherwise. */
  dismissible?: boolean;

  /** Sort order within the group. */
  sortOrder?: number;
  /** Optional material icon name. */
  icon?: string;
  /** Module that registered it (diagnostics): "core", "telegram-bot", … */
  sourceModule?: string;
}

export interface CheckupGroupDefinition {
  key: string;
  titleKey?: string;
  title?: (ctx: CheckupContext) => string;
  descriptionKey?: string;
  sortOrder?: number;
  icon?: string;
  sourceModule?: string;
}

const GROUPS_GLOBAL_KEY = "__restoappSetupChecklistGroups";
const CHECKUPS_GLOBAL_KEY = "__restoappSetupChecklistCheckups";

/** Group key used when a checkup references a group that was never registered. */
export const FALLBACK_GROUP_KEY = "other";

const KEY_RE = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;

function getGroups(): Map<string, CheckupGroupDefinition> {
  const g = globalThis as any;
  if (!(g[GROUPS_GLOBAL_KEY] instanceof Map)) {
    g[GROUPS_GLOBAL_KEY] = new Map<string, CheckupGroupDefinition>();
  }
  return g[GROUPS_GLOBAL_KEY];
}

function getCheckups(): Map<string, CheckupDefinition> {
  const g = globalThis as any;
  if (!(g[CHECKUPS_GLOBAL_KEY] instanceof Map)) {
    g[CHECKUPS_GLOBAL_KEY] = new Map<string, CheckupDefinition>();
  }
  return g[CHECKUPS_GLOBAL_KEY];
}

function warn(message: string, err?: unknown): void {
  try {
    if (err !== undefined) sails.log.warn(`[SetupChecklistRegistry] ${message}`, err);
    else sails.log.warn(`[SetupChecklistRegistry] ${message}`);
  } catch (_e) {
    // sails may be unavailable during early import / pre-boot
  }
}

function normalizeKey(value: unknown): string {
  return String(value || "").trim();
}

export class SetupChecklistRegistry {
  // ─── Writes (called by core defaults and by modules) ───────────────────────

  /** Register (or merge) a group. Idempotent: re-registering an existing key overwrites it. */
  static registerGroup(def: CheckupGroupDefinition): void {
    const key = normalizeKey(def?.key);
    if (!key) return warn("registerGroup called without a key");
    if (!KEY_RE.test(key)) warn(`group key "${key}" is not snake_case`);
    getGroups().set(key, { ...def, key });
  }

  /** Register (or merge) a single checkup. Idempotent on key (hot-reload safe). */
  static registerCheckup(def: CheckupDefinition): void {
    const key = normalizeKey(def?.key);
    if (!key) return warn("registerCheckup called without a key");
    if (!KEY_RE.test(key)) warn(`checkup key "${key}" is not snake_case`);
    if (typeof def.check !== "function") {
      return warn(`checkup "${key}" ignored: check must be a function`);
    }

    const severity: CheckupSeverity = ["required", "recommended", "optional"].includes(def.severity)
      ? def.severity
      : "optional";

    const group = normalizeKey(def.group) || FALLBACK_GROUP_KEY;
    if (!getGroups().has(group)) {
      // Auto-create a placeholder so the checkup is never orphaned.
      SetupChecklistRegistry.registerGroup({
        key: group,
        titleKey: group === FALLBACK_GROUP_KEY ? "Other" : undefined,
        title: group === FALLBACK_GROUP_KEY ? undefined : (() => group),
        sortOrder: 999,
        sourceModule: def.sourceModule,
      });
    }

    const dismissible = def.dismissible !== undefined
      ? Boolean(def.dismissible)
      : severity !== "required";

    getCheckups().set(key, { ...def, key, group, severity, dismissible });
  }

  /** Batch register. */
  static registerCheckups(defs: CheckupDefinition[]): void {
    if (!Array.isArray(defs)) return;
    for (const def of defs) SetupChecklistRegistry.registerCheckup(def);
  }

  static unregisterCheckup(key: string): boolean {
    return getCheckups().delete(normalizeKey(key));
  }

  /** Remove a group; its checkups are re-homed to the fallback group (never dropped). */
  static unregisterGroup(key: string): boolean {
    const groupKey = normalizeKey(key);
    if (groupKey === FALLBACK_GROUP_KEY) return false;
    const removed = getGroups().delete(groupKey);
    if (removed) {
      for (const checkup of getCheckups().values()) {
        if (checkup.group === groupKey) {
          getCheckups().set(checkup.key, { ...checkup, group: FALLBACK_GROUP_KEY });
        }
      }
    }
    return removed;
  }

  // ─── Reads (used by SetupChecklistService) ─────────────────────────────────

  static listGroups(): CheckupGroupDefinition[] {
    return Array.from(getGroups().values()).sort(
      (a, b) => (a.sortOrder ?? 100) - (b.sortOrder ?? 100) || a.key.localeCompare(b.key)
    );
  }

  static listCheckups(): CheckupDefinition[] {
    return Array.from(getCheckups().values()).sort(
      (a, b) => (a.sortOrder ?? 100) - (b.sortOrder ?? 100) || a.key.localeCompare(b.key)
    );
  }

  static getCheckup(key: string): CheckupDefinition | null {
    return getCheckups().get(normalizeKey(key)) || null;
  }

  static getGroup(key: string): CheckupGroupDefinition | null {
    return getGroups().get(normalizeKey(key)) || null;
  }

  static listByGroup(groupKey: string): CheckupDefinition[] {
    const key = normalizeKey(groupKey);
    return SetupChecklistRegistry.listCheckups().filter((c) => c.group === key);
  }

  // ─── Core defaults ─────────────────────────────────────────────────────────

  /**
   * Register the checkups that ship with core. Called from afterHook.ts on boot.
   * Seeds the "project" group from the legacy install-step (about_project) settingsKeys
   * plus a few domain checks (payment method, place, RMS adapter).
   */
  static registerCoreDefaults(): void {
    this.registerGroup({
      key: "project",
      titleKey: "Project setup",
      descriptionKey: "Basic project configuration",
      icon: "settings",
      sortOrder: 0,
      sourceModule: "core",
    });

    const requiredSetting = (
      key: string,
      settingKey: keyof SettingList,
      titleKey: string,
      sortOrder: number
    ): void => {
      this.registerCheckup({
        key,
        group: "project",
        severity: "required",
        titleKey,
        sourceModule: "core",
        sortOrder,
        // settings-manager selects a setting by URL hash (#KEY), read on mount.
        target: { url: `/settings-manager#${String(settingKey)}` },
        check: async () => {
          const value = await Settings.get(settingKey);
          const text = value === undefined || value === null ? "" : String(value).trim();
          // Surface the current value as a hint so it can be shown on the page.
          return text ? { status: "done", detail: text } : { status: "todo" };
        },
      });
    };

    requiredSetting("project_name", "PROJECT_NAME", "Project name", 0);
    requiredSetting("project_country", "COUNTRY_ISO", "Country", 1);
    requiredSetting("project_currency", "DEFAULT_CURRENCY_ISO", "Default currency", 2);
    requiredSetting("project_locale", "DEFAULT_LOCALE", "Default locale", 3);
    requiredSetting("project_checkout_page", "FRONTEND_CHECKOUT_PAGE", "Frontend checkout page", 4);
    requiredSetting("project_order_page", "FRONTEND_ORDER_PAGE", "Frontend order page", 5);

    this.registerCheckup({
      key: "has_payment_method",
      group: "project",
      severity: "required",
      titleKey: "Payment method configured",
      sourceModule: "core",
      sortOrder: 6,
      target: { url: "/model/paymentmethod" },
      // Created ≠ ready: a method may exist but be disabled. Report that explicitly.
      check: async () => {
        const total = await PaymentMethod.count();
        if (total === 0) return { status: "todo", detailKey: "No payment methods yet" };
        const enabled = await PaymentMethod.count({ enable: true });
        if (enabled === 0) {
          return { status: "todo", detailKey: "{count} created, none enabled — not ready", detailParams: { count: total } };
        }
        return { status: "done", detailKey: "{count} of {total} enabled", detailParams: { count: enabled, total } };
      },
    });

    this.registerCheckup({
      key: "has_place",
      group: "project",
      severity: "recommended",
      titleKey: "Sales point created",
      sourceModule: "core",
      sortOrder: 7,
      target: { url: "/model/place" },
      // e.g. a place is created but none is enabled → still "not ready".
      check: async () => {
        const total = await Place.count();
        if (total === 0) return { status: "todo", detailKey: "No places created yet" };
        const enabled = await Place.count({ enable: true });
        if (enabled === 0) {
          return { status: "todo", detailKey: "{count} created, none enabled — not ready", detailParams: { count: total } };
        }
        return { status: "done", detailKey: "{count} of {total} enabled", detailParams: { count: enabled, total } };
      },
    });

    this.registerCheckup({
      key: "rms_adapter",
      group: "project",
      severity: "recommended",
      titleKey: "RMS adapter connected",
      descriptionKey: "Connect your POS/RMS to sync the menu and stock lists",
      sourceModule: "core",
      sortOrder: 8,
      check: async () => {
        try {
          const adapter: any = await Adapter.getRMSAdapter();
          if (!adapter) return { status: "todo" };
          const name = adapter?.InitAdapter?.name || adapter?.name || adapter?.constructor?.name;
          return name ? { status: "done", detail: String(name) } : { status: "done" };
        } catch (_e) {
          return { status: "todo" };
        }
      },
    });
  }
}
