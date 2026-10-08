import fs from 'fs';
import path from 'path';

const Ajv = require('ajv');

const settingsDir = path.resolve(__dirname, '../../../../settings');
let manifestByKey: Record<string, any> | null = null;

function loadManifestByKey(): Record<string, any> {
  if (manifestByKey) return manifestByKey;

  manifestByKey = {};
  if (!fs.existsSync(settingsDir)) return manifestByKey;

  for (const file of fs.readdirSync(settingsDir)) {
    if (!file.endsWith('.json')) continue;

    try {
      const setting = JSON.parse(fs.readFileSync(path.join(settingsDir, file), 'utf8'));
      if (setting?.key) {
        manifestByKey[setting.key] = setting;
      }
    } catch (e) {
      sails.log.warn(`SettingsManager: failed to read setting schema from ${file}`, e);
    }
  }

  return manifestByKey;
}

export function getSettingSchema(setting: any): any {
  return setting?.jsonSchema || loadManifestByKey()[setting?.key]?.jsonSchema || null;
}

/**
 * Human wording of the `pattern` rule, when the manifest provides one.
 *
 * The stored row has no column for it — the hint belongs to the manifest, not to the
 * value — so it is read from settings/*.json for both fresh and upgraded installs.
 */
export function getSettingPatternHint(setting: any): string | null {
  const hint = setting?.patternHint || loadManifestByKey()[setting?.key]?.patternHint;
  return typeof hint === 'string' && hint.trim() ? hint : null;
}

type Translate = (key: string) => string;

/** How many distinct problems are worth putting in one message before it stops being read. */
const MAX_REPORTED_PROBLEMS = 3;

/**
 * Fill `{name}` placeholders the same way the admin UI does, so one locale string serves
 * both layers. Uses split/join rather than String.replace: `$` in the value would otherwise
 * be read as a replacement token, and schema patterns routinely contain one.
 */
function fill(template: string, params: Record<string, string | number>): string {
  return Object.entries(params).reduce(
    (text, [name, value]) => text.split(`{${name}}`).join(String(value)),
    template
  );
}

/**
 * One Ajv error as a sentence a project owner can act on. Keys are shared with the
 * client-side check (`lib/setting-schema.js`) so the same value is described the same way
 * whether the UI catches it or the API does.
 *
 * Keywords not listed here fall back to Ajv's own English wording — worse than a translated
 * string, still better than hiding the reason.
 *
 * `patternHint` (from the manifest) replaces the raw regular expression: `^[a-z0-9\-]+$`
 * tells an operator nothing, "lowercase latin letters, digits and hyphens" does.
 */
function describeAjvError(error: any, t: Translate, patternHint: string | null): string {
  const params = error?.params || {};
  const path = String(error?.instancePath || '').replace(/^\//, '').split('/').join('.');
  const at = path ? `${path}: ` : '';

  switch (error?.keyword) {
    case 'pattern':
      return patternHint
        ? `${at}${t('Value must contain only')}: ${t(patternHint)}`
        : `${at}${t('Value must match the pattern')}: ${params.pattern}`;
    case 'minLength':
      return at + fill(t('Value must be at least {count} characters long'), { count: params.limit });
    case 'maxLength':
      return at + fill(t('Value must be no longer than {count} characters'), { count: params.limit });
    case 'minimum':
      return at + fill(t('Value must be {min} or greater'), { min: params.limit });
    case 'maximum':
      return at + fill(t('Value must be {max} or less'), { max: params.limit });
    case 'enum':
      return `${at}${t('Value must be one of')}: ${(params.allowedValues || []).join(', ')}`;
    case 'type':
      return at + fill(t('Value must be of type {type}'), {
        type: Array.isArray(params.type) ? params.type.join(' | ') : params.type,
      });
    case 'minItems':
      return at + fill(t('Value must contain at least {count} item(s)'), { count: params.limit });
    case 'required':
      return at + fill(t('Missing required property {property}'), { property: params.missingProperty });
    case 'additionalProperties':
      return at + fill(t('Unexpected property {property}'), { property: params.additionalProperty });
    default:
      return `${at}${error?.message || t('Validation failed. Check schema or value.')}`;
  }
}

/**
 * Why the schema rejects `value`, already translated — or null when it is accepted (a
 * setting without a schema accepts anything).
 *
 * Returning the reason rather than a bare `false` is the point: the caller puts it in the
 * error body, so the admin panel can say which rule was broken instead of "check the value".
 */
export function describeSettingValueProblem(setting: any, value: any, t: Translate): string | null {
  const schema = getSettingSchema(setting);
  if (!schema) return null;

  let validate: any;
  try {
    // allErrors: report every broken rule, not just the first — "too short" and "wrong
    // characters" are both worth saying in one go.
    validate = new Ajv({ allErrors: true }).compile(schema);
  } catch (e) {
    sails.log.warn(`SettingsManager: failed to compile jsonSchema for [${setting?.key}]`, e);
    return t('Validation failed. Check schema or value.');
  }

  if (validate(value)) return null;

  const errors: any[] = validate.errors || [];
  sails.log.warn(`SettingsManager: value for [${setting?.key}] does not match jsonSchema`, errors);

  const patternHint = getSettingPatternHint(setting);
  const described = [...new Set(errors.map((error) => describeAjvError(error, t, patternHint)))].filter(Boolean);
  if (!described.length) return t('Validation failed. Check schema or value.');

  return described.slice(0, MAX_REPORTED_PROBLEMS).join('; ');
}
