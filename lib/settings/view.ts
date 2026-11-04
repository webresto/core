import type { SettingsRecord, SettingValue } from "../../models/Settings";
import { describeSettingValueProblem, getSettingPatternHint, getSettingSchema } from "./schema";

/**
 * What a setting looks like from outside, and what happens when one is written, exported or
 * imported — once, for every door.
 *
 * The admin panel's four controllers used to each assemble this by hand; the mobile API would have
 * been a fifth hand (`settings.plan.md`, C24). Secrets, the environment pin and the "effective
 * value" rule are the kind of thing that must be right in every answer, so they are decided here
 * and the doors only carry the result: the web and the phone then answer the same by construction,
 * not by attentiveness.
 */

type Translate = (key: string) => string;

export interface SettingView {
  id: number;
  key: string;
  name: string | null;
  description: string | null;
  tooltip: string | null;
  type: string;
  secret: boolean;
  /** Whether a value is in effect — the only thing said about a secret's value. */
  hasValue: boolean;
  value: SettingValue | null;
  defaultValue: SettingValue | null;
  jsonSchema: any;
  patternHint: string | null;
  uiSchema: any;
  readOnly: boolean;
  isRequired: boolean;
  restartRequired: boolean;
  module: string | null;
  /**
   * `active` — pinned by an environment variable, so it cannot be edited here; `valid: false` means
   * that variable fails the schema, and the setting reads as empty.
   */
  envOverride: { valid: boolean } | null;
}

/**
 * One setting as every API shows it.
 *
 * Two rules live here and nowhere else:
 *   - process.env outranks the DB (`Settings.use`), so a stored value can be dead weight: report
 *     the effective value and flag it, instead of showing one thing while every `Settings.get()`
 *     consumer reads another.
 *   - a secret setting is write-only: a UI may set a new value, but the stored one (token /
 *     password / key) never leaves the database — only the fact that it is set.
 */
export function describeSetting(setting: any): SettingView {
  const env = Settings.envOverride(setting);
  const effectiveValue = env.active ? (env.valid ? env.value : null) : setting.value;
  const secret = setting.secret ?? false;
  return {
    id: setting.id,
    key: setting.key,
    name: setting.name || null,
    description: setting.description || null,
    tooltip: setting.tooltip || null,
    type: setting.type,
    secret,
    hasValue: effectiveValue !== null && effectiveValue !== undefined,
    value: secret ? null : (effectiveValue ?? null),
    defaultValue: secret ? null : (setting.defaultValue ?? null),
    jsonSchema: getSettingSchema(setting),
    // Human wording of the `pattern` rule, so no UI ever shows a raw regexp.
    patternHint: getSettingPatternHint(setting),
    uiSchema: setting.uiSchema || null,
    readOnly: setting.readOnly ?? false,
    isRequired: setting.isRequired ?? false,
    restartRequired: setting.restartRequired ?? false,
    module: setting.module || null,
    envOverride: env.active ? { valid: env.valid } : null,
  };
}

/** Every setting, by key — the order the settings page and the app both show. */
export async function listSettings(): Promise<SettingView[]> {
  const settings = await Settings.find().sort("key ASC");
  return settings.map(describeSetting);
}

export type ApplyRefusal = "not_found" | "read_only" | "env" | "invalid";

export interface ApplyResult {
  ok: boolean;
  /** The setting as it now stands; absent when it was refused. */
  item?: SettingView;
  reason?: ApplyRefusal;
  /** Already translated, and already a sentence: what the door shows the operator. */
  message?: string;
}

/**
 * Write one value, with the three refusals that are not about the value itself: no such setting,
 * the application owns it (`readOnly`), the environment pins it. Then the schema, whose complaint
 * is returned as the sentence that says which rule was broken — "check the value" leaves an
 * operator guessing at a pattern they cannot see.
 */
export async function applySetting(key: string, value: any, t: Translate): Promise<ApplyResult> {
  const setting = await Settings.findOne!({ key });
  if (!setting) return { ok: false, reason: "not_found", message: t("Setting not found") };
  if (setting.readOnly) return { ok: false, reason: "read_only", message: t("Setting is read-only") };

  // process.env outranks the DB (see Settings.use), so writing here would store a value that no
  // Settings.get() consumer ever reads. Refuse instead of accepting a save that does nothing.
  if (Settings.envOverride(setting).active) {
    return { ok: false, reason: "env", message: t("Setting is set via an environment variable and cannot be changed here") };
  }

  const problem = describeSettingValueProblem(setting, value, t);
  if (problem) return { ok: false, reason: "invalid", message: problem };

  const jsonSchema = getSettingSchema(setting);
  const updated = await Settings.set(key as any, { value, ...(jsonSchema ? { jsonSchema } : {}) } as any);
  if (!updated) return { ok: false, reason: "invalid", message: t("Validation failed. Check schema or value.") };

  // The flags belong to the declaration, not to the written row: read them off the setting as it
  // was, so `secret` cannot be lost by a write (and a secret's new value is not echoed back).
  return { ok: true, item: describeSetting({ ...setting, ...updated, secret: setting.secret, readOnly: setting.readOnly }) };
}

export interface SettingsDump {
  exportedAt: string;
  count: number;
  settings: Array<{
    key: string;
    name: string | null;
    description: string | null;
    type: string;
    value: SettingValue | null;
    defaultValue: SettingValue | null;
    module: string | null;
  }>;
}

/**
 * The export file: every setting but the secrets.
 *
 * A secret is write-only, so its value must never leave the database — it is left out of the file
 * entirely (an import can still set one).
 */
export async function dumpSettings(): Promise<SettingsDump> {
  const settings = (await Settings.find().sort("key ASC")).filter((s: SettingsRecord) => !s.secret);
  return {
    exportedAt: new Date().toISOString(),
    count: settings.length,
    settings: settings.map((s: any) => ({
      key: s.key,
      name: s.name || null,
      description: s.description || null,
      type: s.type,
      value: s.value ?? null,
      defaultValue: s.defaultValue ?? null,
      module: s.module || null,
    })),
  };
}

export interface ImportEntry {
  key: string;
  value: any;
}

export type ImportStatus = "changed" | "unchanged" | "not_found";

export interface ImportDiffRow {
  key: string;
  status: ImportStatus;
  currentValue?: SettingValue | null;
  importValue: any;
  /** The value cannot be written: the application owns it or the environment pins it. */
  readOnly?: boolean;
  envOverride?: boolean;
  secret?: boolean;
  type?: string;
  name?: string | null;
}

/** What an import file would change, key by key — the preview the operator ticks. */
export async function diffImport(entries: ImportEntry[]): Promise<ImportDiffRow[]> {
  const current = await Settings.find();
  const currentMap: Record<string, any> = {};
  for (const s of current) currentMap[s.key] = s;

  return entries.map((entry) => {
    const existing = currentMap[entry.key];
    if (!existing) {
      return { key: entry.key, status: "not_found" as const, importValue: entry.value, currentValue: undefined };
    }
    // An env-pinned setting cannot be imported: report it as locked so the UI offers it the same
    // way it offers a read-only one, and compare against the env value.
    const env = Settings.envOverride(existing);
    const locked = (existing.readOnly ?? false) || env.active;
    // A secret is write-only: its current value is never sent to the client, so it also cannot be
    // compared — such an entry is always offered as a change.
    if (existing.secret) {
      return {
        key: entry.key,
        status: "changed" as const,
        secret: true,
        currentValue: null,
        importValue: entry.value,
        readOnly: locked,
        envOverride: env.active,
        type: existing.type,
        name: existing.name || null,
      };
    }
    const currentVal = env.active
      ? (env.valid ? env.value : null)
      : (existing.value !== null && existing.value !== undefined ? existing.value : existing.defaultValue);
    // Both sides as the server would read them. A file carries what was *set* (`dumpSettings` writes
    // `value`), and a setting that was never set reads as its default — so a null in the file against
    // a default here is not a change, and exporting a server and importing it back changes nothing.
    // Comparing the raw column instead reported every defaulted setting as a change, which is forty
    // of them on a fresh install.
    const incoming = entry.value !== null && entry.value !== undefined ? entry.value : existing.defaultValue;
    const changed = JSON.stringify(currentVal ?? null) !== JSON.stringify(incoming ?? null);
    return {
      key: entry.key,
      status: (changed ? "changed" : "unchanged") as ImportStatus,
      currentValue: currentVal,
      importValue: entry.value,
      readOnly: locked,
      envOverride: env.active,
      type: existing.type,
      name: existing.name || null,
    };
  });
}

export interface ImportResult {
  key: string;
  status: "applied" | "skipped" | "error";
  /** Why it was not applied, already translated. */
  error?: string;
}

/** Apply only the ticked keys, and say of each what happened — applied, skipped, or why not. */
export async function applyImport(entries: ImportEntry[], keys: string[], t: Translate): Promise<ImportResult[]> {
  const results: ImportResult[] = [];
  for (const entry of entries) {
    if (!keys.includes(entry.key)) continue;
    try {
      const applied = await applySetting(entry.key, entry.value, t);
      if (applied.ok) {
        results.push({ key: entry.key, status: "applied" });
      } else {
        // The value itself was wrong — an error of this entry; anything else is the setting saying
        // it is not writable at all, which is a skip.
        results.push({ key: entry.key, status: applied.reason === "invalid" ? "error" : "skipped", error: applied.message });
      }
    } catch (err: any) {
      results.push({ key: entry.key, status: "error", error: err?.message || String(err) });
    }
  }
  return results;
}
