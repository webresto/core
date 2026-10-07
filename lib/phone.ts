/**
 * Phone helpers shared by the auth-provider adapters (Telegram, MAX, VK) and the core.
 *
 * Messengers deliver a phone as a single string ("79990001122", "+7 999 000 11 22"), but the
 * User model stores it as { code, number }. splitPhone normalizes that string into the pair.
 * Kept in the core so every provider module uses one implementation instead of importing it
 * from a sibling module.
 */

export interface PhoneParts {
  code: string;
  number: string;
}

/**
 * Split a messenger `phone_number` (e.g. "79990001122" or "+7 999 000 11 22") into { code, number }.
 * Heuristic: RU/KZ numbers (11 digits starting with 7 or 8) → code "7". Otherwise the first digit
 * is treated as the country code and the rest as the number.
 */
export function splitPhone(raw: string): PhoneParts {
  const digits = String(raw).replace(/\D/g, "");
  if (digits.startsWith("7") && digits.length === 11) {
    return { code: "7", number: digits.slice(1) };
  }
  if (digits.startsWith("8") && digits.length === 11) {
    return { code: "7", number: digits.slice(1) };
  }
  return { code: digits.slice(0, 1) || "7", number: digits.slice(1) };
}
