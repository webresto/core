// Pure JS model for the tags-editor control. Mirrors the server helper
// libs/adminpanel/controls/tagsEditorHelper.ts (keep TAG_KNOWN_KEYS and the
// normalization rules in sync!).
//
// Stored value is Dish.tags (json). Canonical storefront shape (ng-gql DishTag)
// is Array<{ name: string }>; RMS adapters also write plain string arrays (iiko v1)
// and allergen objects { id, code, name } (iiko v2). Unknown keys survive a
// normalize → serialize round-trip via `extra`.

const TAG_KNOWN_KEYS = new Set(['name']);

function collectExtra(source) {
  const extra = {};
  for (const key of Object.keys(source)) {
    if (!TAG_KNOWN_KEYS.has(key)) extra[key] = source[key];
  }
  return extra;
}

function normalizeEntry(input) {
  if (typeof input === 'string' || typeof input === 'number') {
    return { name: String(input).trim(), extra: {} };
  }
  if (input && typeof input === 'object') {
    const name =
      typeof input.name === 'string' || typeof input.name === 'number' ? String(input.name).trim() : '';
    return { name, extra: collectExtra(input) };
  }
  return { name: '', extra: {} };
}

/** Case-insensitive identity used for duplicate detection. */
export function canonicalTagName(name) {
  return String(name ?? '').trim().toLowerCase();
}

export function normalizeTags(input) {
  let list = input;
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return [];
    try {
      list = JSON.parse(trimmed);
    } catch {
      // Legacy plain-string value: treat as a comma-separated list of names.
      list = trimmed.split(',');
    }
  }
  if (list && typeof list === 'object' && !Array.isArray(list)) list = [list];
  if (!Array.isArray(list)) return [];
  return list.map(normalizeEntry).filter((tag) => tag.name || Object.keys(tag.extra).length);
}

/** Serialize the editor model back to the stored DishTag[] shape. */
export function serializeTags(tags) {
  return tags.map((tag) => ({ ...tag.extra, name: tag.name }));
}

/** True when `name` (canonicalized) is already present in `tags`. */
export function hasTag(tags, name) {
  const canonical = canonicalTagName(name);
  if (!canonical) return false;
  return tags.some((tag) => canonicalTagName(tag.name) === canonical);
}

/**
 * Attempt to append a tag. Returns { tags, added, duplicate } — `tags` is the
 * original array when nothing changed (empty input or duplicate).
 */
export function addTag(tags, rawName) {
  const name = String(rawName ?? '').trim();
  if (!name) return { tags, added: false, duplicate: false };
  if (hasTag(tags, name)) return { tags, added: false, duplicate: true };
  return { tags: [...tags, { name, extra: {} }], added: true, duplicate: false };
}

export function removeTagAt(tags, index) {
  if (index < 0 || index >= tags.length) return tags;
  return tags.filter((_, i) => i !== index);
}
