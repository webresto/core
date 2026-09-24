import type { SettingsRecord } from "../../models/Settings";

// Settings whose value, when stored in DB, must also be mirrored into process.env
// because some libraries read process.env[key] directly instead of Settings.get(key)
export const envMirroredSettings: string[] = ["JWT_SECRET"];

/** Mirror a setting's value into process.env so libraries reading process.env[key] stay in sync with the DB */
export function syncToEnv(record: SettingsRecord): void {
  if (!envMirroredSettings.includes(record.key)) {
    return;
  }
  const value = record.value ?? record.defaultValue ?? undefined;
  if (value === undefined || value === null) {
    return;
  }
  process.env[record.key] = typeof value === "string" ? value : JSON.stringify(value);
}
