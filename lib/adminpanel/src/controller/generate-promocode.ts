import { hasAccess } from "./marketing-helpers";

// Unambiguous alphabet (no 0/O/1/I) for human-friendly codes.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const DEFAULT_LENGTH = 8;
const MAX_ATTEMPTS = 25;

function randomCode(length: number, prefix: string): string {
  let body = "";
  for (let i = 0; i < length; i += 1) {
    body += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `${prefix}${body}`;
}

/**
 * GET …/core/marketing/promocodes/generate-code?prefix=&length=
 * Returns a code guaranteed to be free at generation time. Also used (with ?check=CODE)
 * to verify whether a manually-typed code is available.
 */
export default async function GeneratePromoCodeController(req: any, res: any) {
  const t = (key: string) => (req?.i18n?.__ ? req.i18n.__(key) : key);
  try {
    if (!hasAccess(req, res, "promocodes-manager")) return;

    // Availability check for a manually-entered code.
    const check = String(req.query.check || "").trim().toUpperCase();
    if (check) {
      const existing = await PromotionCode.findOne({ code: check });
      return res.json({ code: check, available: !existing });
    }

    const prefix = String(req.query.prefix || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    const requestedLength = Number.parseInt(String(req.query.length || String(DEFAULT_LENGTH)), 10);
    const length = Number.isFinite(requestedLength) ? Math.min(Math.max(requestedLength, 4), 24) : DEFAULT_LENGTH;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      const candidate = randomCode(length, prefix);
      const existing = await PromotionCode.findOne({ code: candidate });
      if (!existing) return res.json({ code: candidate, available: true });
    }

    return res.status(503).json({ error: t("Could not generate a unique code, please try again") });
  } catch (error) {
    sails.log.error("Generate promocode error", error);
    return res.status(500).json({ error: String(error) });
  }
}
