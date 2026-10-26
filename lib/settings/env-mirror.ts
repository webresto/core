import type { SettingsRecord } from "../../models/Settings";

// Settings whose value, when stored in DB, must also be mirrored into process.env
// because some libraries read process.env[key] directly instead of Settings.get(key)
export const envMirroredSettings: string[] = ["JWT_SECRET"];

// Keys this process copied into process.env itself (envMirroredSettings, TZ from the
// DB/install wizard). Such a copy is not an operator ENV pin: the DB stays the source
// of truth, so Settings.use reads the DB and the admin can still change the setting.
export const appMirroredEnvKeys = new Set<string>();

/**
 * Copy a value into process.env on behalf of the app and remember that it is ours.
 * A value the operator put into the environment wins and is left untouched.
 * Returns whether process.env now holds the given value.
 */
export function mirrorToEnv(key: string, value: string): boolean {
  if (process.env[key] !== undefined && !appMirroredEnvKeys.has(key)) {
    return process.env[key] === value;
  }
  process.env[key] = value;
  appMirroredEnvKeys.add(key);
  return true;
}

/** Mirror a setting's value into process.env so libraries reading process.env[key] stay in sync with the DB */
export function syncToEnv(record: SettingsRecord): void {
  if (!envMirroredSettings.includes(record.key)) {
    return;
  }
  const value = record.value ?? record.defaultValue ?? undefined;
  if (value === undefined || value === null) {
    return;
  }
  mirrorToEnv(record.key, typeof value === "string" ? value : JSON.stringify(value));
}
