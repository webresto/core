/**
 * Attention! We use MM "Settings" model in production mode, but for tests and core integrity, we support this model
 * */

import { OptionalAll, RequiredField } from "../interfaces/toolsTS"
import { ORMModel } from "../interfaces/ORMModel";
import ORM from "../interfaces/ORM";
import { ControlElement, Layout } from "@jsonforms/core";
import Ajv from 'ajv';

// Memory store
let settings: SettingValue = {}
type PlainValue = string | boolean | number | string[] | number[] | SettingValue[]
type SettingValue = PlainValue | {
  [key: string]: SettingList[keyof SettingList];
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
    type: "string",
    allowNull: true
  } as unknown as string,
  isRequired: "boolean" as unknown as boolean
};

type attributes = typeof attributes & ORM;

interface Settings extends RequiredField<OptionalAll<attributes>, "key" | "type"> { }

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

    // let moduleId = record.module as string;
    // await ModuleHelper.checkSettings(moduleId);
    cb();
  },

  afterCreate: async function (record: Settings, cb: (err?: string) => void) {
    emitter.emit(`settings:${record.key}`, record);
    settings[record.key] = cleanValue(record.value);

    // let moduleId = record.module as string;
    // await ModuleHelper.checkSettings(moduleId);
    cb();
  },

  /** return setting value by unique key */
  async use(key: string): Promise<SettingValue> {
    let value: SettingValue;

    /** ENV variable is more important than a database, but it should match the schema */
    if (process.env[key] !== undefined) {
      // ENV variable should be in database
      let setting = await Settings.findOne({ key: key });
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
    let setting = await Settings.findOne({ key: key });
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
    // if (!SettingsHelper.isInDeclaredSettings(key) && !(await Settings.get("ALLOW_UNSAFE_SETTINGS"))) {
    //   sails.log.error(`Settings get: Requested setting [${key}] was not declared by specification`);
    //   return;
    // }

    if (settings[_key] !== undefined) {
      return cleanValue(settings[_key]);
    } else {
      const value = await Settings.use(_key);
      settings[_key] = value;
      return cleanValue(value);
    }
  },

  async set<K extends keyof SettingList>(key: K, settingsSetInput: SettingsSetInput<K, SettingList[K]>): Promise<Settings> {
    let origSettings = await Settings.findOne({key: key});
    if(origSettings){
        Object.assign(origSettings, settingsSetInput)
        //@ts-ignore
        settingsSetInput = origSettings;
    }
    
    console.log(origSettings)

    if (settingsSetInput["key"] && settingsSetInput["key"] !== key) {
      throw `Key [${key}] does not match with SettingsSetInput.key: [${settingsSetInput.key}]`;
    }

    // calculate 'type' by value (if value was given)
    let settingType = settingsSetInput.type 
    if(!settingType && origSettings) {
      settingType = origSettings.type
    }
    // Detect type if not defined
    if (!settingType && settingsSetInput.jsonSchema && settingsSetInput.jsonSchema.type) {
      settingType = settingsSetInput.jsonSchema.type;
    }

    if (!settingType && settingsSetInput.value) {
      let detectedType = typeof settingsSetInput.value
      if (["string", "boolean", "json", "number"].includes(detectedType)) {
        //@ts-ignore
        settingType = typeof settingsSetInput.value
      }
    }

    if (!settingType && settingsSetInput.defaultValue) {
      let detectedType = typeof settingsSetInput.defaultValue
      if (["string", "boolean", "json", "number"].includes(detectedType)) {
        //@ts-ignore
        settingType = typeof settingsSetInput.value
      }
    }

    if (!settingType) {
      const errorMessage = `Settings set error: Can not calculate type by given value [${settingType}], but type is required field`
      sails.log.error(errorMessage)
      throw errorMessage
    }

    // check that jsonSchema is present for a json type
    if (settingType === "json" && settingsSetInput.jsonSchema === undefined) {
      const errorMessage = `Setting set [${settingsSetInput.key}] error: jsonSchema is missed for type "json"`
      sails.log.error(errorMessage);
      throw errorMessage
    }

    // convert some values for boolean type
    if (settingType === "boolean") {
      if (["yes", "YES", "Yes", "1", "true", "TRUE", "True"].includes(`${settingsSetInput.value}`)) {
        settingsSetInput.value = true as unknown as any;
      } else if (["no", "NO", "No", "0", "false", "FALSE", "False"].includes(`${settingsSetInput.value}`)) {
        settingsSetInput.value = false as unknown as any;
      }

      if (["yes", "YES", "Yes", "1", "true", "TRUE", "True"].includes(`${settingsSetInput.defaultValue}`)) {
        settingsSetInput.defaultValue = true as unknown as any;
      } else if (["no", "NO", "No", "0", "false", "FALSE", "False"].includes(`${settingsSetInput.defaultValue}`)) {
        settingsSetInput.defaultValue = false as unknown as any;
      }
    }

    // check that value and defaultValue match the schema for json type (if !ALLOW_UNSAFE_SETTINGS)
    if (settingType === "json" && !(await Settings.get("ALLOW_UNSAFE_SETTINGS"))) {
      const ajv = new Ajv();
      const validate = ajv.compile(settingsSetInput.jsonSchema);
      if (settingsSetInput.value !== undefined && !validate(settingsSetInput.value)) {
        let mErr = 'AJV Validation Error: Value does not match the schema';
        sails.log.error(mErr);
        throw mErr
      }
      
      if (settingsSetInput.defaultValue !== undefined && !validate(settingsSetInput.defaultValue)) {
        let mErr = 'AJV Validation Error: DefaultValue does not match the schema';
        sails.log.error(mErr);
        throw mErr
      }
    }

    // Set in local variable (local storage)
    settings[key.toString()] = settingsSetInput.value !== undefined ? settingsSetInput.value : settingsSetInput.defaultValue;

    // Write to Database
    try {
      const setting = await Settings.findOne({ key:key });
      if (!setting) {
        return await Settings.create({
          key: key,
          type: settingType,
          module: settingsSetInput.appId || null,
          ...settingsSetInput.jsonSchema && { jsonSchema: settingsSetInput.jsonSchema },
          ...settingsSetInput.name && {name: settingsSetInput.name},
          ...settingsSetInput.value && {value: settingsSetInput.value},
          ...settingsSetInput.defaultValue && {defaultValue: settingsSetInput.defaultValue},
          ...settingsSetInput.description && {description: settingsSetInput.description},
          ...settingsSetInput.tooltip && { tooltip: settingsSetInput.tooltip},
          ...settingsSetInput.uiSchema && {uiSchema: settingsSetInput.uiSchema},
          readOnly: settingsSetInput.readOnly ?? false
        }).fetch();
      } else {
        if (setting.readOnly) throw `Property cannot be changed (read only)`;
        return (await Settings.update({ key: key }, {
          type: settingType,
          ...settingsSetInput.jsonSchema && { jsonSchema: settingsSetInput.jsonSchema },
          ...settingsSetInput.name && {name: settingsSetInput.name},
          ...settingsSetInput.value && {value: settingsSetInput.value},
          ...settingsSetInput.defaultValue && {defaultValue: settingsSetInput.defaultValue},
          ...settingsSetInput.description && {description: settingsSetInput.description},
          ...settingsSetInput.tooltip && { tooltip: settingsSetInput.tooltip},
          ...settingsSetInput.uiSchema && {uiSchema: settingsSetInput.uiSchema},
          ...settingsSetInput.readOnly && {readOnly: settingsSetInput.readOnly }
        }).fetch())[0];

      }
    } catch (e) {
      sails.log.error("CORE > Settings > set DB error: ", settingsSetInput, e);
      throw `Error Set settings in DB`
    }
  }

};

module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model,
};

declare global {
  // @ts-ignore
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




interface SettingsSetInputBase<K extends string, F> {
  type?: SettingType
  key?: `${K}`
  appId?: string
  jsonSchema?: any,
  name?: string
  description?: string
  tooltip?: string
  uiSchema?: UISchema
  readOnly?: boolean
}

type SettingsSetInput<K extends string, F> = 
  | ({ value: F, defaultValue?: F } & SettingsSetInputBase<K, F>)
  | ({ value?: F,defaultValue: F } & SettingsSetInputBase<K, F>);