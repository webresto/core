// Client-side mirror of the jsonSchema check the settings API runs through Ajv
// (controller/settings-schema.ts). The scalar editors carry no validation of their
// own, so a value breaking the schema used to be rejected only after the round trip —
// and adminizer's client surfaces that as a bare "Request failed with status 400".
//
// Deliberately partial: only the keywords that settings/*.json actually use on scalar
// types. Anything not understood here stays the server's job, so this can produce a
// false "looks valid", never a false "invalid". Arrays and objects are edited in
// JsonEditor, which validates against the same schema itself.

export function getSchemaTypes(schema) {
  const type = schema?.type;
  return Array.isArray(type) ? type : type ? [type] : [];
}

export function isIntegerSchema(schema) {
  return getSchemaTypes(schema).includes('integer');
}

/**
 * Reason the value would be rejected by the schema, already translated — or null when
 * nothing here objects.
 *
 * `value` is what would be sent to the API, so `undefined` means "not filled in yet":
 * left to the server, since the UI cannot tell an untouched secret from a cleared one.
 *
 * Values are concatenated into the message rather than passed as t() params: t()
 * interpolates with String.replace, where `$` in the replacement is a substitution
 * token — and patterns routinely end with `$`.
 */
export function validateValueBySchema(schema, value, t) {
  if (!schema || typeof schema !== 'object') return null;
  if (value === undefined) return null;

  const types = getSchemaTypes(schema);
  const isString = types.includes('string');
  const isNumber = types.includes('number') || types.includes('integer');
  if (!isString && !isNumber) return null;

  if (Array.isArray(schema.enum)) {
    if (schema.enum.includes(value)) return null;
    return `${t('Value must be one of')}: ${schema.enum.map(option => String(option)).join(', ')}`;
  }

  // A nullable setting (`"type": ["integer", "null"]`) reads "not set" as a valid value.
  if (value === null) {
    if (types.includes('null')) return null;
    return isString ? t('Value must not be empty') : t('Value must be a number');
  }

  if (typeof value === 'string' && isString) {
    if (typeof schema.minLength === 'number' && value.length < schema.minLength) {
      return t('Value must be at least {count} characters long', { count: schema.minLength });
    }
    if (typeof schema.maxLength === 'number' && value.length > schema.maxLength) {
      return t('Value must be no longer than {count} characters', { count: schema.maxLength });
    }
    if (typeof schema.pattern === 'string') {
      let regexp;
      // An unparsable pattern is a broken schema, not a broken value: stay quiet.
      try { regexp = new RegExp(schema.pattern); } catch { return null; }
      if (!regexp.test(value)) return `${t('Value must match the pattern')}: ${schema.pattern}`;
    }
    return null;
  }

  if (typeof value === 'number' && isNumber) {
    if (Number.isNaN(value)) return t('Value must be a number');
    if (isIntegerSchema(schema) && !Number.isInteger(value)) return t('Value must be a whole number');
    if (typeof schema.minimum === 'number' && value < schema.minimum) {
      return t('Value must be {min} or greater', { min: schema.minimum });
    }
    if (typeof schema.maximum === 'number' && value > schema.maximum) {
      return t('Value must be {max} or less', { max: schema.maximum });
    }
    return null;
  }

  // The editor produced a type the schema does not list. Rather than guess a wording for
  // a combination the editors cannot normally reach, leave the verdict to the server.
  return null;
}
