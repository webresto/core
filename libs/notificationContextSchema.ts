/**
 * notificationContextSchema
 *
 * Describes the *shape* of the data that flows into a notification template, so the
 * template editor can offer typed autocomplete and both the editor and the server can
 * flag `{{paths}}` that don't exist in the event's context.
 *
 * Until now an event only declared `contextKeys: string[]` — the names of the top-level
 * branches (e.g. ["order", "user"]) with no information about the fields inside them.
 * A `ContextSchema` describes those branches down to individual fields, so
 * `{{order.shortId}}` can be validated and suggested.
 *
 * The schema is intentionally lightweight (not full JSON Schema): just enough to drive
 * autocomplete (path + type + description + example) and unknown-path detection.
 */

export type ContextFieldType =
  | "string"
  | "number"
  | "boolean"
  | "array"
  | "object"
  | "date";

export interface ContextField {
  /** Field value type. `object` uses `fields`; `array` may use `items`. */
  type: ContextFieldType;
  /** Human-readable hint shown in autocomplete (e.g. "Order total, currency units"). */
  description?: string;
  /** Example value shown in autocomplete (e.g. 540, "A-123"). */
  example?: string | number | boolean;
  /** Nested fields when `type === "object"` (also allowed on the root branches). */
  fields?: Record<string, ContextField>;
  /** Element shape when `type === "array"` (so `{{order.items.0.name}}` resolves). */
  items?: ContextField;
}

/** Top-level context branches keyed by name: { order: {...}, user: {...} }. */
export type ContextSchema = Record<string, ContextField>;

/** One resolvable template path, flattened from a ContextSchema. */
export interface FlatContextPath {
  /** Dotted path, e.g. "order.customer.name". */
  path: string;
  type: ContextFieldType;
  description?: string;
  example?: string | number | boolean;
  /** True when the path is the immediate child of an array element (informational). */
  underArray?: boolean;
}

const PLACEHOLDER_REGEX = /\{\{\s*([\w.$]+)\s*\}\}/g;
const MAX_DEPTH = 6;

function isPlainObject(value: unknown): value is Record<string, any> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/** Coerce arbitrary input into a clean ContextField, or null if unusable. */
function normalizeField(raw: unknown): ContextField | null {
  if (!isPlainObject(raw)) return null;
  const types: ContextFieldType[] = ["string", "number", "boolean", "array", "object", "date"];
  const type = types.includes(raw.type) ? (raw.type as ContextFieldType) : "string";
  const field: ContextField = { type };
  if (raw.description != null) field.description = String(raw.description);
  if (typeof raw.example === "string" || typeof raw.example === "number" || typeof raw.example === "boolean") {
    field.example = raw.example;
  }
  if (isPlainObject(raw.fields)) {
    const fields: Record<string, ContextField> = {};
    for (const [k, v] of Object.entries(raw.fields)) {
      const nf = normalizeField(v);
      if (nf) fields[k] = nf;
    }
    if (Object.keys(fields).length > 0) field.fields = fields;
  }
  if (raw.items != null) {
    const items = normalizeField(raw.items);
    if (items) field.items = items;
  }
  return field;
}

/** Coerce arbitrary input into a clean ContextSchema (drops invalid branches). */
export function normalizeContextSchema(raw: unknown): ContextSchema | undefined {
  if (!isPlainObject(raw)) return undefined;
  const schema: ContextSchema = {};
  for (const [branch, def] of Object.entries(raw)) {
    const field = normalizeField(def);
    if (field) schema[branch] = field;
  }
  return Object.keys(schema).length > 0 ? schema : undefined;
}

/**
 * Flatten a schema into the list of dotted paths a template may reference.
 * Array branches contribute both the array path itself and its element fields
 * (so `{{order.items}}` and `{{order.items.0.name}}` both validate).
 */
export function flattenSchema(schema: ContextSchema | undefined): FlatContextPath[] {
  const out: FlatContextPath[] = [];
  if (!schema) return out;

  const walk = (prefix: string, field: ContextField, depth: number, underArray: boolean): void => {
    if (depth > MAX_DEPTH) return;
    out.push({ path: prefix, type: field.type, description: field.description, example: field.example, underArray: underArray || undefined });

    if (field.type === "object" && field.fields) {
      for (const [k, v] of Object.entries(field.fields)) {
        walk(`${prefix}.${k}`, v, depth + 1, underArray);
      }
    } else if (field.type === "array" && field.items) {
      // Describe the element shape under the array path (without forcing an index).
      const item = field.items;
      if (item.type === "object" && item.fields) {
        for (const [k, v] of Object.entries(item.fields)) {
          walk(`${prefix}.${k}`, v, depth + 1, true);
        }
      }
    }
  };

  for (const [branch, field] of Object.entries(schema)) {
    walk(branch, field, 0, false);
  }
  return out;
}

/** Extract every distinct `{{path}}` referenced in a template string. */
export function extractPlaceholders(template: string | undefined): string[] {
  if (!template || typeof template !== "string") return [];
  const found = new Set<string>();
  let match: RegExpExecArray | null;
  PLACEHOLDER_REGEX.lastIndex = 0;
  while ((match = PLACEHOLDER_REGEX.exec(template)) !== null) {
    found.add(match[1]);
  }
  return Array.from(found);
}

/** A single unknown-variable finding (one per {{path}} occurrence per template layer). */
export interface UnknownVariable {
  /** The offending path, e.g. "order.shopName". */
  path: string;
  /** Template field it appeared in: "title" | "body" | "subject" | "clickUrl". */
  field: string;
  /** Which template layer: "default", "locales.ru", "channels.sms.default", etc. */
  layer: string;
}

const RECIPIENT_PREFIX = "recipient";

/**
 * Build the set of path *prefixes* that are considered valid. A template path is valid
 * if it equals, or is a descendant of, any flattened schema path. Numeric segments
 * (array indices) are accepted under array paths.
 */
function buildValidMatcher(schema: ContextSchema | undefined): (path: string) => boolean {
  const flat = flattenSchema(schema);
  const valid = new Set(flat.map((f) => f.path));
  const arrayPaths = new Set(flat.filter((f) => f.type === "array").map((f) => f.path));

  return (path: string): boolean => {
    // recipient.* is always injected by the renderer (scope = { ...context, recipient }).
    if (path === RECIPIENT_PREFIX || path.startsWith(`${RECIPIENT_PREFIX}.`)) return true;
    if (valid.has(path)) return true;

    // Walk prefixes: accept a path whose ancestor is a known array (e.g. order.items.0.name),
    // or whose ancestor is a known object/leaf we chose not to enumerate further.
    const segments = path.split(".");
    for (let i = segments.length - 1; i >= 1; i--) {
      const prefix = segments.slice(0, i).join(".");
      const next = segments[i];
      if (arrayPaths.has(prefix) && /^\d+$/.test(next)) {
        // order.items.0 → re-validate the remainder against the element shape:
        const rest = [prefix, ...segments.slice(i + 1)].join(".");
        if (rest === prefix || valid.has(rest)) return true;
      }
    }
    return false;
  };
}

/**
 * Validate all `{{paths}}` across a rule's templates against the event's context schema.
 * Returns unknown-variable findings (empty when everything resolves, or when no schema is
 * defined — absence of a schema means "don't validate", preserving today's behaviour).
 */
export function validateTemplatePaths(
  templates: unknown,
  schema: ContextSchema | undefined,
): UnknownVariable[] {
  if (!schema || !isPlainObject(templates)) return [];
  const isValid = buildValidMatcher(schema);
  const findings: UnknownVariable[] = [];

  const checkContent = (content: unknown, layer: string): void => {
    if (!isPlainObject(content)) return;
    for (const [field, value] of Object.entries(content)) {
      if (typeof value !== "string") continue;
      for (const path of extractPlaceholders(value)) {
        if (!isValid(path)) findings.push({ path, field, layer });
      }
    }
  };

  checkContent(templates.default, "default");

  if (isPlainObject(templates.locales)) {
    for (const [loc, content] of Object.entries(templates.locales)) {
      checkContent(content, `locales.${loc}`);
    }
  }
  if (isPlainObject(templates.channels)) {
    for (const [channel, byLocale] of Object.entries(templates.channels)) {
      if (!isPlainObject(byLocale)) continue;
      for (const [loc, content] of Object.entries(byLocale)) {
        checkContent(content, `channels.${channel}.${loc}`);
      }
    }
  }

  return findings;
}
