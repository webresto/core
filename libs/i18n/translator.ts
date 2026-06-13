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
 *
 * Note: the runtime uses the `i18n-2` library, whose `__` reads `this.locale`
 * and whose signature is `__(phrase, ...args)` — it does NOT accept the
 * `{ phrase, locale }` object form of node-`i18n` / sails-hook-i18n. Passing an
 * object made `dotNotation` receive a non-string and throw
 * `is.join is not a function`, crashing buildCancelPaymentDialog (and thus
 * Order.next/checkout). We construct a locale-bound i18n-2 instance instead,
 * matching the pattern used in @webresto/graphql (graphql.ts).
 */
export function getTranslator(locale: string): Translator {
  const i18nFactory = require("i18n-2");
  const i18n = new i18nFactory({
    ...(sails.config as any).i18n,
    directory: (sails.config as any).i18n?.localesDirectory,
    extension: ".json",
  });
  i18n.setLocale(locale);
  return (phrase: string) => i18n.__(phrase);
}

/**
 * Convenience: resolve locale from a preferred hint (e.g. order.locale)
 * and return a translator bound to it.
 */
export function getTranslatorFor(preferredLocale?: string | null): Translator {
  return getTranslator(resolveLocale(preferredLocale));
}
