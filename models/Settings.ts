import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";

import { RequiredField, OptionalAll } from "../interfaces/toolsTS";


// Memory store
let settings: SettingValue = {}
type PlainValie = string | boolean | number | string[] | number[]
type SettingValue = PlainValie | {
  [key: string]: string | boolean | number;
};

///////////////

let attributes = {
  /**Id */
  id: {
    type: "number",
    autoIncrement: true,
  } as unknown as string,

  /** Ключ доступа к свойству */
  key: {
    type: "string",
    unique: true,
    required: true,
  } as unknown as string,

  /** Описание */
  description: "string" as string,

  /** Значение свойства */
  value: "json" as unknown as SettingValue,

  /** Секция, к которой относится свойство */
  section: "string" as string,

  /** Источника происхождения */
  from: "string" as string,

  /** Only reading */
  readOnly: {
    type: "boolean"
  } as unknown as boolean,

  schema: "json" as unknown as any
};

type attributes = typeof attributes & ORM;
interface Settings extends  RequiredField<OptionalAll<attributes>, "key" | "value"> {}
export default Settings;

let Model = {

  beforeCreate: function (record: Settings, cb:  (err?: string) => void) {
    record.key = toScreamingSnake(record.key)
    cb();
  },

  beforeUpdate: function (record: Settings, cb:  (err?: string) => void) {
    if (record.key) {
      record.key = toScreamingSnake(record.key)
    }
    cb();
  },

  afterUpdate: function (record: Settings, cb:  (err?: string) => void) {
    emitter.emit(`settings:${record.key}`, record);
    settings[record.key] = cleanValue(record.value);
    cb();
  },

  afterCreate: function (record: Settings, cb:  (err?: string) => void) {
    emitter.emit(`settings:${record.key}`, record);
    settings[record.key] = cleanValue(record.value);
    return cb();
  },

  /** retrun setting value by key */
  async use(key: string, from?: string): Promise<SettingValue> {
    key = toScreamingSnake(key);
    sails.log.silly("CORE > Settings > use: ", key, from);
    let value: SettingValue;

    /** ENV variable is important*/
    if (process.env[key] !== undefined) {
      try {
        value = JSON.parse(process.env[key]);
      } catch (e) {
        // sails.log.error("CORE > Settings > use ENV parse error: ", e);
        value = process.env[key];
      } finally {
        if (!(await Settings.find({ key: key }).limit(1))[0]) await Settings.set(key, value, "env");

        return cleanValue(value);
      }
    }

    /** If variable present in database */

    let setting = (await Settings.find({ key: key }).limit(1))[0];
    sails.log.silly("CORE > Settings > findOne: ", key, setting);
    if (setting && setting.value) {
      if (typeof value === "string") {
        process.env[key] = value
      } else {
        process.env[key] = JSON.stringify(value)
      }
      return cleanValue(setting.value);
    } 

    /** Variable present in sails config */
    if (from) {
      if (sails.config[from] && sails.config[from][key]) {
        value = sails.config[from][key];
        await Settings.set(key, value, from);
        return cleanValue(value);
      }
    }
    sails.log.silly(`Settings: ( ${key} ) not found`);

    return undefined;
  },


  async get(key: string): Promise<SettingValue> { 
    key = toScreamingSnake(key);
    if (settings[key] !== undefined) {
      return cleanValue(settings[key]);
    } else  {
      const value = await Settings.use(key)
      settings[key] = value
      return cleanValue(value);
    }
  },
  
  /**
   * Проверяет существует ли настройка, если не сущестует, то создаёт новую и возвращает ее. Если существует, то обновляет его значение (value)
   * на новые. Также при первом внесении запишется параметр (config), отвечающий за раздел настройки.
   */
  async set(key: string, value: any, from?: string, readOnly: boolean = false): Promise<Settings> {
    if (key === undefined || value === undefined) throw `Setting set key (${key}) and value (${value}) required`;
    key = toScreamingSnake(key);

    value = cleanValue(value);
    // Set in local variable
    settings[key] = value;

    // Set in ENV
    if (typeof value === "string") {
      process.env[key] = value
    } else {
      process.env[key] = JSON.stringify(value)
    }

    // Write to Database
    try {
      const propety = await Settings.findOne({ key: key });
      if (!propety) {
        return await Settings.create({
          key: key,
          value: value,
          from: from,
          readOnly: readOnly
        }).fetch();
      } else {
        if (propety.readOnly) throw `Property cannot be changed (read only)`
        return (await Settings.update({ key: key }, { value: value }).fetch())[0];
      }
    } catch (e) {
      sails.log.error("CORE > Settings > set: ", key, value, from, e);
    }
  },  
  async setDefault(key: string, value: any, from?: string, readOnly: boolean = false): Promise<void> {
    let setting = (await Settings.find({ key: key }).limit(1))[0];
    if(!setting){
      await Settings.create({
        key: key,
        value: cleanValue(value),
        from: from,
        readOnly: readOnly
      });
    }
  }

};



module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model,
};

declare global {
    const Settings: typeof Model & ORMModel<Settings,  "key" | "value">;
}


function toScreamingSnake(str: string): string {
  if (!str) {
    return '';
  }

  // Test123___Test_test -> TEST123_TEST_TEST
  return str.replace(/\.?([A-Z]+)/g, function (x,y){return "_" + y.toLowerCase()}).replace(/^_/, "").replace(/_{1,}/g,"_").toUpperCase();
}

function cleanValue(value) {
  if(value === "undefined" || value === "NaN" || value === "null") {
    return undefined
  } 

  return value
}