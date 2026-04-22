import * as fs from "fs";
import * as path from "path";

const LOCALES_DIR = path.resolve(__dirname, "../../i18n/locales");
const CACHE: Record<string, Record<string, string>> = {};

function getAvailableLocales(): string[] {
  if (!fs.existsSync(LOCALES_DIR)) return ["en"];
  return fs
    .readdirSync(LOCALES_DIR)
    .filter((name) => name.endsWith(".json"))
    .map((name) => name.replace(/\.json$/i, "").toLowerCase());
}

function loadLocale(locale: string): Record<string, string> {
  const normalized = locale.toLowerCase();
  if (CACHE[normalized]) return CACHE[normalized];

  const filePath = path.resolve(LOCALES_DIR, `${normalized}.json`);
  if (!fs.existsSync(filePath)) {
    CACHE[normalized] = {};
    return CACHE[normalized];
  }

  try {
    CACHE[normalized] = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    sails.log.error(`Failed to parse adminpanel locale file ${filePath}`, error);
    CACHE[normalized] = {};
  }

  return CACHE[normalized];
}

export function resolveAdminpanelLocale(rawLocale: unknown): string {
  const available = new Set(getAvailableLocales());
  const value = String(rawLocale || "").trim().toLowerCase().replace(/_/g, "-");
  if (!value) return "en";
  if (available.has(value)) return value;

  const base = value.split("-")[0];
  if (base === "uk" && available.has("ua")) return "ua";
  if (available.has(base)) return base;
  return available.has("en") ? "en" : Array.from(available)[0] || "en";
}

export function getAdminpanelMessages(locale: string): Record<string, string> {
  return {
    ...loadLocale("en"),
    ...loadLocale(locale),
  };
}

export function getInertiaLocaleAndMessages(req: any): { locale: string; messages: Record<string, string> } {
  const locale = resolveAdminpanelLocale(req?.user?.language || req?.user?.locale);
  return {
    locale,
    messages: getAdminpanelMessages(locale),
  };
}
