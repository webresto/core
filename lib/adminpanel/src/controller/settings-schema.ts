import fs from 'fs';
import path from 'path';

const Ajv = require('ajv');

const settingsDir = path.resolve(__dirname, '../../../../settings');
let schemaByKey: Record<string, any> | null = null;

function loadSchemaByKey(): Record<string, any> {
  if (schemaByKey) return schemaByKey;

  schemaByKey = {};
  if (!fs.existsSync(settingsDir)) return schemaByKey;

  for (const file of fs.readdirSync(settingsDir)) {
    if (!file.endsWith('.json')) continue;

    try {
      const setting = JSON.parse(fs.readFileSync(path.join(settingsDir, file), 'utf8'));
      if (setting?.key && setting?.jsonSchema) {
        schemaByKey[setting.key] = setting.jsonSchema;
      }
    } catch (e) {
      sails.log.warn(`SettingsManager: failed to read setting schema from ${file}`, e);
    }
  }

  return schemaByKey;
}

export function getSettingSchema(setting: any): any {
  return setting?.jsonSchema || loadSchemaByKey()[setting?.key] || null;
}

export function validateSettingValue(setting: any, value: any): boolean {
  const schema = getSettingSchema(setting);
  if (!schema) return true;

  try {
    const validate = new Ajv().compile(schema);
    if (validate(value)) return true;
    sails.log.warn(`SettingsManager: value for [${setting.key}] does not match jsonSchema`, validate.errors);
    return false;
  } catch (e) {
    sails.log.warn(`SettingsManager: failed to compile jsonSchema for [${setting.key}]`, e);
    return false;
  }
}
