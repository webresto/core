import {OptionalAll, RequiredField} from "../interfaces/toolsTS"
import {ORMModel} from "../interfaces/ORMModel";
import ORM from "../interfaces/ORM";
import {ControlElement, Layout} from "@jsonforms/core";
import Module from "modulemanager/models/Module";
import ModuleHelper from "modulemanager/helpers/moduleHelper";
import SettingsHelper from "modulemanager/helpers/settingsHelper";
import Ajv from 'ajv';

// Memory store
let settings: SettingValue = {}
type PlainValie = string | boolean | number | string[] | number[] | SettingValue[]
type SettingValue = PlainValie | {
  [key: string]: SettingValue;
};
type SettingType = "string" | "boolean" | "json" | "number"

interface UISchema {
  type?: string;
  elements?: (ControlElement | Layout)[];
  label?: string;
  rule?: any;
  scope?: string;
  options?: any;
}

let attributes = {
  id: {
    type: "number",
    autoIncrement: true,
  } as unknown as string,
  key: {
    type: "string",
    unique: true,
    required: true,
  } as unknown as string, // all spaces will be replaced by "_"
  name: "string",
  description: "string",
  tooltip: "string",
  value: "json" as unknown as SettingValue,
  /** In case value is not defined */
  defaultValue: "json" as unknown as SettingValue, // can be set only by file
  type: {
    type: "string",
    required: true,
    isIn: ["string", "boolean", "json", "number"]
  } as unknown as SettingType,
  /** JSON schema for value and defaultValue */
  jsonSchema: {
    type: "json"
  } as unknown as any,
  uiSchema: {
    type: "json"
  } as unknown as UISchema,
  /** Only reading */
  readOnly: {
    type: "boolean"
  } as unknown as boolean,
  module: {
    model: "module"
  } as unknown as Module | string
};

type attributes = typeof attributes & ORM;

interface Settings extends RequiredField<OptionalAll<attributes>, "key" | "type"> {}

export default Settings;

let Model = {

  beforeCreate: function (record: Settings, cb: (err?: string) => void) {
    record.key = record.key.replace(/ /g, '_');
    cb();
  },

  beforeUpdate: function (record: Settings, cb: (err?: string) => void) {
    if (record.key || record.module) {
      cb("Settings error: Can not change record.key and record.module. Delete and create new setting instead.");
    }

    cb();
  },

  afterUpdate: async function (record: Settings, cb: (err?: string) => void) {
    emitter.emit(`settings:${record.key}`, record);
    settings[record.key] = cleanValue(record.value);

    let moduleId = record.module as string;
    await ModuleHelper.checkSettings(moduleId);
    cb();
  },

  afterCreate: async function (record: Settings, cb: (err?: string) => void) {
    emitter.emit(`settings:${record.key}`, record);
    settings[record.key] = cleanValue(record.value);

    let moduleId = record.module as string;
    await ModuleHelper.checkSettings(moduleId);
    cb();
  },

  /** return setting value by unique key */
  async use(key: string): Promise<SettingValue> {
    let value: SettingValue;

    /** ENV variable is more important than a database, but it should match the schema */
    if (process.env[key] !== undefined) {
      // ENV variable should be in database
      let setting = await Settings.findOne({key: key});
      if (!setting) {
        return undefined;
      }

      if (setting.type !== "json") {
        value = process.env[key];

      } else {
        try {
          value = JSON.parse(process.env[key]);

          // if value was parsed, check that given json matches the schema (if !ALLOW_UNSAFE_SETTINGS)
          if (!(await Settings.get("ALLOW_UNSAFE_SETTINGS"))) {
            const ajv = new Ajv();
            const validate = ajv.compile(setting.jsonSchema);
            if (!validate(value)) {
              console.error('AJV Validation Error: Value from process.env does not match the schema');
              return undefined;
            }
          }
        } catch (e) {
          console.error(`Error trying to parse value from process.env: ${e}`);
          return undefined;
        }
      }

      return cleanValue(value);
    }

    /** If variable present in a database */
    let setting = await Settings.findOne({key: key});
    if (setting && (setting.value !== null || setting.defaultValue !== null)) {
      value = setting.value !== null ? setting.value : setting.defaultValue;
      return cleanValue(setting.value);
    }

    /** Variable present in sails config */
    if (setting && setting.module) {
      let appId = setting.module as string;
      if (sails.config[appId] && sails.config[appId][key]) {
        value = sails.config[appId][key];
        return cleanValue(value);
      }
    }

    sails.log.silly(`Settings: [${key}] not found`);

    return undefined;
  },

  async get<K extends keyof SettingList, T = SettingList[K]>(key: K): Promise<T> {
    let _key: string = key;
    // return error if setting was not declared by specification
    if (!SettingsHelper.isInDeclaredSettings(key) && !(await Settings.get("ALLOW_UNSAFE_SETTINGS"))) {
      sails.log.error(`Settings get: Requested setting [${key}] was not declared by specification`);
      return;
    }

    if (settings[_key] !== undefined) {
      return cleanValue(settings[_key]);
    } else {
      const value = await Settings.use(_key);
      settings[_key] = value;
      return cleanValue(value);
    }
  },

  async set<K extends keyof SettingList, T = SettingList[K]>(key: K, settingsSetInput: SettingsSetInput): Promise<Settings> {
    if (settingsSetInput["key"] !== key) {
      throw `Key [${key}] does not match with SettingsSetInput.key: [${settingsSetInput.key}]`;
    }

    // process non-module setting (contains only key and value)
    if (Object.keys(settingsSetInput).length === 3) {
      settings[settingsSetInput.key] = settingsSetInput.value;
      // Write to Database
      try {
        const setting = await Settings.findOne({key: settingsSetInput.key});
        if (!setting) {
          return await Settings.create({
            key: settingsSetInput.key,
            value: settingsSetInput.value,
            type: null,
            module: null,
            readOnly: settingsSetInput.readOnly || false
          }).fetch();
        } else {
          if (setting.readOnly) throw `Property cannot be changed (read only)`;
          return (await Settings.update({key: settingsSetInput.key}, {
            value: settingsSetInput.value
          }).fetch())[0];
        }
      } catch (e) {
        sails.log.error("CORE > Settings > set: ", settingsSetInput, e);
        return
      }
    }

    // check required fields
    if (settingsSetInput.appId === undefined || settingsSetInput.key === undefined || settingsSetInput.type === undefined) {
      sails.log.error(`Setting set error: missed one or more required fields: appId (${settingsSetInput.appId}),
			 key (${settingsSetInput.key}), type (${settingsSetInput.type}), jsonSchema (${settingsSetInput.jsonSchema}) required`);
      return;
    }

    // check that jsonSchema is present for a json type
    if (settingsSetInput.type === "json" && settingsSetInput.jsonSchema === undefined) {
      sails.log.error(`Setting set [${settingsSetInput.appId}] error: jsonSchema is missed for type "json"`);
    }

    // convert some values for boolean type
    if (settingsSetInput.type === "boolean") {
      if (["yes", "YES", "Yes", "1", "true", "TRUE", "True"].includes(`${settingsSetInput.value}`)) {
        settingsSetInput.value = true;
      } else if (["no", "NO", "No", "0", "false", "FALSE", "False"].includes(`${settingsSetInput.value}`)) {
        settingsSetInput.value = false;
      }

      if (["yes", "YES", "Yes", "1", "true", "TRUE", "True"].includes(`${settingsSetInput.defaultValue}`)) {
        settingsSetInput.defaultValue = true;
      } else if (["no", "NO", "No", "0", "false", "FALSE", "False"].includes(`${settingsSetInput.defaultValue}`)) {
        settingsSetInput.defaultValue = false;
      }
    }

    // check that value and defaultValue match the schema for json type (if !ALLOW_UNSAFE_SETTINGS)
    if (settingsSetInput.type === "json" && !(await Settings.get("ALLOW_UNSAFE_SETTINGS"))) {
      const ajv = new Ajv();
      const validate = ajv.compile(settingsSetInput.jsonSchema);
      if ((settingsSetInput.value !== undefined && !validate(settingsSetInput.value)) ||
          (settingsSetInput.defaultValue !== undefined && !validate(settingsSetInput.defaultValue))) {
        sails.log.error('AJV Validation Error: Value or defaultValue does not match the schema');
        return;
      }
    }

    // Set in local variable (local storage)
    if (settingsSetInput.appId === null) {
      settings[settingsSetInput.key] = settingsSetInput.value !== undefined ? settingsSetInput.value : settingsSetInput.defaultValue;
    } else {
      settings[`${settingsSetInput.appId}_${settingsSetInput.key}`] = settingsSetInput.value !== undefined ? settingsSetInput.value : settingsSetInput.defaultValue;
    }

    // Write to Database
    try {
      const setting = await Settings.findOne({module: settingsSetInput.appId, key: settingsSetInput.key});
      if (!setting) {
        return await Settings.create({
          key: settingsSetInput.key,
          type: settingsSetInput.type,
          jsonSchema: settingsSetInput.jsonSchema,
          module: settingsSetInput.appId,
          name: settingsSetInput.name,
          value: settingsSetInput.value,
          defaultValue: settingsSetInput.defaultValue,
          description: settingsSetInput.description,
          tooltip: settingsSetInput.tooltip,
          uiSchema: settingsSetInput.uiSchema,
          readOnly: settingsSetInput.readOnly || false
        }).fetch();
      } else {
        if (setting.readOnly) throw `Property cannot be changed (read only)`;
        return (await Settings.update({module: settingsSetInput.appId, key: settingsSetInput.key}, {
          type: settingsSetInput.type,
          jsonSchema: settingsSetInput.jsonSchema,
          name: settingsSetInput.name,
          value: settingsSetInput.value,
          defaultValue: settingsSetInput.defaultValue,
          description: settingsSetInput.description,
          tooltip: settingsSetInput.tooltip,
          uiSchema: settingsSetInput.uiSchema,
          readOnly: settingsSetInput.readOnly || false
        }).fetch())[0];
      }
    } catch (e) {
      sails.log.error("CORE > Settings > set: ", settingsSetInput, e);
    }
  }

};

module.exports = {
  primaryKey: "key",
  attributes: attributes,
  ...Model,
};

declare global {
  // TODO даже при том что мы выключили модель Settings в mm, типизация ломается, потому что нельзя 2 раза декларировать модель
  const Settings: typeof Model & ORMModel<Settings, "key" | "type">;
  interface SettingList {
    MODULE_STORAGE_LICENSE: string // system setting
    /**
     * Allow settings without strict declaration presented in specification
     * */
    ALLOW_UNSAFE_SETTINGS: boolean
  }
}

function cleanValue(value) {
  if (value === "undefined" || value === "NaN" || value === "null") {
    return undefined
  }

  return value
}

interface SettingsSetInput {
  key: string
  appId?: string
  type?: SettingType
  jsonSchema?: any,
  name?: string
  description?: string
  tooltip?: string
  value?: SettingValue
  defaultValue?: SettingValue
  uiSchema?: UISchema
  readOnly?: boolean
}
