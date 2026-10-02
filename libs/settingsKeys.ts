/**
 * Registry of Settings keys known to the core.
 *
 * Used as a single point of TS-validation and documentation for keys consumed
 * across rollout stages of the cooking-point / place-based-menu / address-resolver
 * features. The Settings model is still key-value at runtime — this registry does
 * not enforce anything; it just narrows accidental typos and lets IDEs jump from
 * usage to definition.
 *
 * Default contract: absence of a key === pre-feature behaviour.
 *
 * Full architectural rationale: see .ai-notes/cooking-point-feature.md
 * (section "Settings extension — backward compatibility contract").
 */
export const SettingsKeys = {
  /** Whether `getDishes` returns dishes without stock as `notForSale=true` instead of hiding them. */
  SHOW_UNAVAILABLE_DISHES: 'SHOW_UNAVAILABLE_DISHES',
  /** Menu filtering mode: 'default' | 'single-place' | 'multi-place'. */
  MENU_PLACE_BASED_MODE: 'MENU_PLACE_BASED_MODE',
  /** When true, missing rmsTerminalId → reject order; otherwise fallback to legacy path. */
  STRICT_RMS_TERMINAL_MAPPING: 'STRICT_RMS_TERMINAL_MAPPING',
  /** TTL for geocode resolver cache, seconds. */
  GEOCODE_CACHE_TTL_SECONDS: 'GEOCODE_CACHE_TTL_SECONDS',
} as const;

export type SettingsKey = typeof SettingsKeys[keyof typeof SettingsKeys];
