import ORM from "../interfaces/ORM";
import ORMModel from "../interfaces/ORMModel";

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
    required: true
  } as unknown as string,

  /** Описание */
  description: "string" as string,

  /** Значение свойства */
  value: "json" as unknown as any,

  /** Секция, к которой относится свойство */
  section: "string" as string,
  
  /** Источника происхождения */
  from: "string" as string,
}

type attributes = typeof attributes;
interface Settings extends attributes, ORM {}
export default Settings

let Model  =  {  
  /** retrun setting value by key */
  async use(config: string, key: string): Promise<Settings> {
    sails.log.silly("CORE > Settings > use: ", key, config);
    if (!key) {
      key = config;
      config = "restocore";
    }

    /** ENV variable is important*/
    if (process.env[key] !== undefined) {
      try {
        return JSON.parse(process.env[key]);
      } catch (e) {
        sails.log.error("CORE > Settings > use ENV parse error: ", e);
      }
    }

    let obj = (await Settings.find({ key: key }).limit(1))[0];
    sails.log.silly("CORE > Settings > findOne: ", key, obj);

    if (!obj) {
      let value: string;

      if (sails.config[config][key]) {
        value = sails.config[config][key];
      } else {
        return undefined;
      }

      value = JSON.stringify(value);
      try {
        obj = await Settings.set(key, value, config);
      } catch (e) {
        sails.log.error(key, value, config, e);
      }
    }

    let value = obj.value;
    try {
      value = JSON.parse(obj.value);
    } finally {
      return value;
    }
  },

  /**
   * Проверяет существует ли настройка, если не сущестует, то создаёт новую и возвращает ее. Если существует, то обновляет его значение (value)
   * на новые. Также при первом внесении запишется параметр (config), отвечающий за раздел настройки.
   */
  async set(key: string, value: any, config?: string): Promise<any> {
    try {
      const propety = await Settings.findOne({ key: key });
      if (!propety) {
        return Settings.create({
          key: key,
          value: value,
          from: config,
        });
      } else {
        return (await Settings.update({ key: key }, { value: value }).fetch())[0];
      }
    } catch (e) {
      sails.log.error("CORE > Settings > set: ", key, value, config, e);
    }
  }
} 

module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model
}

declare global {
  const Settings: typeof Model & ORMModel<Settings>;
}
