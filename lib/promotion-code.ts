/** Codes are compared trimmed and upper-cased; an empty one is no code. */
export function normalizePromotionCodeValue(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim().toUpperCase();
  return normalized || null;
}
