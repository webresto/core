import ORM from "../interfaces/ORM";
import ORMModel from "../interfaces/ORMModel";
import { RequiredField, OptionalAll } from "../interfaces/toolsTS";
import getEmitter from "../libs/getEmitter";

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
};

type attributes = typeof attributes & ORM;
interface Settings extends  RequiredField<OptionalAll<attributes>, "key" | "value"> {}
export default Settings;

let Model = {

  afterUpdate: function (record, proceed) {
    getEmitter().emit(`settings:${record.key}`, record);
    settings[record.key] = record.value;
    return proceed();
  },

  afterCreate: function (record, proceed) {
    getEmitter().emit(`settings:${record.key}`, record);
    settings[record.key] = record.value;
    return proceed();
  },

  /** retrun setting value by key */
  async use(key: string, from?: string): Promise<SettingValue> {
    sails.log.silly("CORE > Settings > use: ", key, from);

    let value: SettingValue;

    /** ENV variable is important*/
    if (process.env[key] !== undefined) {
      try {
        value = JSON.parse(process.env[key]);
      } catch (e) {
        sails.log.error("CORE > Settings > use ENV parse error: ", e);
        value = process.env[key];
      } finally {
        if (!(await Settings.find({ key: key }).limit(1))[0]) await Settings.set(key, value, "env");

        return value;
      }
    }

    /** If variable present in database */

    let setting = (await Settings.find({ key: key }).limit(1))[0];
    sails.log.silly("CORE > Settings > findOne: ", key, setting);
    if (setting && setting.value) return setting.value;

    /** Variable present in config */
    if (from) {
      if (sails.config[from] && sails.config[from][key]) {
        value = sails.config[from][key];
        await Settings.set(key, value, from);
        return value;
      }
    }
    sails.log.warn(`Settings: ( ${key} ) not found`);

    return undefined;
  },


  async get(key: string): Promise<SettingValue> { 
    if (settings[key] !== undefined) {
      return settings[key];
    } else  {
      const value = await Settings.use(key)
      settings[key] =  value
      return value;
    }
  },
  
  /**
   * Проверяет существует ли настройка, если не сущестует, то создаёт новую и возвращает ее. Если существует, то обновляет его значение (value)
   * на новые. Также при первом внесении запишется параметр (config), отвечающий за раздел настройки.
   */
  async set(key: string, value: any, from?: string): Promise<Settings> {
    if (key === undefined || value === undefined) throw `Setting set key (${key}) and value (${value}) required`;
    try {
      const propety = await Settings.findOne({ key: key });
      settings[key] = value;
      if (!propety) {
        return await Settings.create({
          key: key,
          value: value,
          from: from,
        });
      } else {
        return (await Settings.update({ key: key }, { value: value }).fetch())[0];
      }
    } catch (e) {
      sails.log.error("CORE > Settings > set: ", key, value, from, e);
    }
  },
};

module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model,
};

declare global {
    const Settings: typeof Model & ORMModel<Settings,  "key" | "value">;
}
