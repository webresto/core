// Shared normalize / serialize / summarize helpers for the tags-editor control.
// Mirrors modifiersEditorHelper.ts: the control renders the editor in add/edit,
// and the list column shows a compact text summary via summarizeTags().
//
// The stored value is Dish.tags (json). The canonical shape consumed by the
// storefront (ng-gql DishTag) is Array<{ name: string }>, but RMS adapters write
// looser data: iiko v1 stores plain string arrays, iiko v2 stores allergen group
// objects ({ id, code, name }). We normalize every known shape into a predictable
// editor model and preserve unknown keys through a save round-trip.
//
// Keep in sync with the frontend mirror lib/adminpanel/src/components/tags/tagsModel.js
// (same TAG_KNOWN_KEYS + normalization rules).

export interface NormalizedTag {
  name: string;
  /** Unknown keys preserved on save (e.g. iiko allergen id/code). */
  extra: Record<string, unknown>;
}

export interface TagValidationIssue {
  /** Index into the tags array. */
  index: number;
  level: "error" | "warn";
  message: string;
}

const TAG_KNOWN_KEYS = new Set(["name"]);

function collectExtra(source: Record<string, unknown>): Record<string, unknown> {
  const extra: Record<string, unknown> = {};
  for (const key of Object.keys(source)) {
    if (!TAG_KNOWN_KEYS.has(key)) extra[key] = source[key];
  }
  return extra;
}

function normalizeEntry(input: unknown): NormalizedTag {
  if (typeof input === "string" || typeof input === "number") {
    return { name: String(input).trim(), extra: {} };
  }
  if (input && typeof input === "object") {
    const source = input as Record<string, unknown>;
    const name = typeof source.name === "string" || typeof source.name === "number" ? String(source.name).trim() : "";
    return { name, extra: collectExtra(source) };
  }
  return { name: "", extra: {} };
}

/** Case-insensitive identity used for duplicate detection. */
export function canonicalTagName(name: unknown): string {
  return String(name ?? "").trim().toLowerCase();
}

export function normalizeTags(input: unknown): NormalizedTag[] {
  let list: unknown = input;
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) return [];
    try {
      list = JSON.parse(trimmed);
    } catch {
      // Legacy plain-string value: treat as a comma-separated list of names.
      list = trimmed.split(",");
    }
  }
  if (list && typeof list === "object" && !Array.isArray(list)) list = [list];
  if (!Array.isArray(list)) return [];
  return list.map(normalizeEntry).filter((tag) => tag.name || Object.keys(tag.extra).length);
}

/** Serialize the editor model back to the stored DishTag[] shape. */
export function serializeTags(tags: NormalizedTag[]): Array<Record<string, unknown>> {
  return tags.map((tag) => ({ ...tag.extra, name: tag.name }));
}

/** Authoring-time sanity checks; an empty list means the value is safe to save. */
export function validateTags(tags: NormalizedTag[]): TagValidationIssue[] {
  const issues: TagValidationIssue[] = [];
  const seen = new Set<string>();
  tags.forEach((tag, index) => {
    const canonical = canonicalTagName(tag.name);
    if (!canonical) {
      issues.push({ index, level: "error", message: "Tag name is empty" });
      return;
    }
    if (seen.has(canonical)) {
      issues.push({ index, level: "error", message: "Duplicate tag" });
      return;
    }
    seen.add(canonical);
  });
  return issues;
}

export function summarizeTags(input: unknown): string {
  const names = normalizeTags(input).map((tag) => tag.name).filter(Boolean);
  if (!names.length) return "—";
  const shown = names.slice(0, 3).join(", ");
  return names.length > 3 ? `${shown} +${names.length - 3}` : shown;
}
