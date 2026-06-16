/**
 * Translator helpers for backend code that builds user-facing strings
 * (DialogBox messages, notifications, etc.).
 *
 * Per docs/DialogBox.md, the caller is responsible for translating strings
 * before handing them to locale-agnostic APIs. These helpers centralize the
 * locale-resolution + `sails.__` wiring so callers don't repeat it.
 */

export type Translator = (phrase: string) => string;

const localeAliases: Record<string, string> = {
  ja: "jp",
  zh: "cn",
  vn: "vi",
};

/**
 * Resolve a locale from preferred → site default → "en", skipping nullish values.
 */
export function resolveLocale(preferred?: string | null): string {
  const locale = (
    preferred ??
    (sails.config as any).i18n?.defaultLocale ??
    "en"
  );
  const normalized = locale.toLowerCase().replace("_", "-").split("-")[0];
  return localeAliases[normalized] ?? normalized;
}

/**
 * Build a translator bound to a locale.
 * Pass an explicit locale, or use `getTranslatorFor` to resolve one from a hint.
 *
 * Core translations are appended to the Sails i18n hook during initialization.
 * Read that merged catalog directly so modal strings do not depend on duplicate
 * copies in the host application's config/locales directory.
 */
export function getTranslator(locale: string): Translator {
  const catalogs = sails.hooks.i18n?.getLocales?.() ?? {};
  const resolvedLocale = resolveLocale(locale);
  let coreCatalog: Record<string, string> = {};

  try {
    coreCatalog = require(`../locales/${resolvedLocale}.json`);
  } catch {
    // The host application catalog and English fallback are checked below.
  }

  return (phrase: string) =>
    coreCatalog[phrase] ??
    catalogs[resolvedLocale]?.[phrase] ??
    catalogs.en?.[phrase] ??
    phrase;
}

/**
 * Convenience: resolve locale from a preferred hint (e.g. order.locale)
 * and return a translator bound to it.
 */
export function getTranslatorFor(preferredLocale?: string | null): Translator {
  return getTranslator(resolveLocale(preferredLocale));
}
