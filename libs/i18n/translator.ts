/**
 * Translator helpers for backend code that builds user-facing strings
 * (DialogBox messages, notifications, etc.).
 *
 * Per docs/DialogBox.md, the caller is responsible for translating strings
 * before handing them to locale-agnostic APIs. These helpers centralize the
 * locale-resolution + `sails.__` wiring so callers don't repeat it.
 */

export type Translator = (phrase: string) => string;

/**
 * Resolve a locale from preferred → site default → "en", skipping nullish values.
 */
export function resolveLocale(preferred?: string | null): string {
  return (
    preferred ??
    (sails.config as any).i18n?.defaultLocale ??
    "en"
  );
}

/**
 * Build a translator bound to a locale.
 * Pass an explicit locale, or use `getTranslatorFor` to resolve one from a hint.
 */
export function getTranslator(locale: string): Translator {
  return (phrase: string) => (sails as any).__({ phrase, locale });
}

/**
 * Convenience: resolve locale from a preferred hint (e.g. order.locale)
 * and return a translator bound to it.
 */
export function getTranslatorFor(preferredLocale?: string | null): Translator {
  return getTranslator(resolveLocale(preferredLocale));
}
