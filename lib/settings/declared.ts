// Declared settings tracker (ported from MM settingsHelper)
const declaredSettings: string[] = ["MODULE_STORAGE_LICENSE", "ALLOW_UNSAFE_SETTINGS"];

export function setDeclaredSetting(key: string): void {
  declaredSettings.push(key);
}

export function isInDeclaredSettings(key: string): boolean {
  return declaredSettings.includes(key);
}
