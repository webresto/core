import type { NotificationRulesRecord } from "../models/NotificationRules";

const KEY_REGEX = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;

/**
 * Validate a rule payload. Returns an array of human-readable errors (empty = valid).
 * Mirrors the lifecycle checks of the model so callers (controllers/MCP) can validate before write.
 */
export function validateRule(rule: Partial<NotificationRulesRecord>): string[] {
  const errors: string[] = [];
  const key = String(rule?.key || "").trim();
  if (!key) {
    errors.push("key is required");
  } else if (!KEY_REGEX.test(key)) {
    errors.push("key must be snake_case (lowercase, digits, underscores)");
  }
  if (!String(rule?.eventKey || "").trim()) {
    errors.push("eventKey is required");
  }
  if (rule?.sendDelaySec !== undefined && rule.sendDelaySec !== null) {
    const d = Number(rule.sendDelaySec);
    if (!Number.isFinite(d) || d < 0) errors.push("sendDelaySec must be a non-negative number");
  }
  if (rule?.maxDeliveryCost !== undefined && rule.maxDeliveryCost !== null) {
    const c = Number(rule.maxDeliveryCost);
    if (!Number.isFinite(c) || c < 0) errors.push("maxDeliveryCost must be null or a non-negative number");
  }
  if (rule?.channelsMode === "fixed" && (!Array.isArray(rule.fixedChannels) || rule.fixedChannels.length === 0)) {
    errors.push("fixedChannels must list at least one channel when channelsMode is 'fixed'");
  }
  if (rule?.escalateBy !== undefined && rule.escalateBy !== null && !["read", "delivered"].includes(String(rule.escalateBy))) {
    errors.push("escalateBy must be 'read' or 'delivered'");
  }
  return errors;
}
