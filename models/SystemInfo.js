"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const defaultConfig_1 = require("../config/defaultConfig");
module.exports = {
    attributes: {
        id: {
            type: 'integer',
            autoIncrement: true,
            primaryKey: true
        },
        key: {
            type: 'string',
            unique: true
        },
        description: 'string',
        value: 'string',
        section: 'string',
        from: 'string'
    },
    /**
     * Отдаёт запрашиваемый ключ из запрашиваемого конфига. Если ключ, который запрашивается, отсуствует в базе, то данные
     * будут взяты из sails.config[config][key] и записаны в базу. При последующих запросах того же ключа будут возвращаться данные
     * из базы данных. Если указать только один параметр ключ, то данные будут доставаться из sails.config.restocore[key].
     * @param config - конфиг откуда доставать ключ
     * @param key - ключ, если не указывать второй параметр, то первый будет считаться за ключ
     * @return найденное значение или 0, если значение не было найдено.
     */
    async use(config, key) {
        sails.log.silly("CORE > SystemInfo > use: ", key, config);
        if (!key) {
            key = config;
            config = 'restocore';
        }
        /** ENV variable is important*/
        if (process.env[key] !== undefined) {
            let value;
            try {
                return JSON.parse(process.env[key]);
            }
            catch (e) {
                sails.log.error("CORE > SystemInfo > use ENV parse error: ", e);
                value = process.env[key];
            }
            finally {
                if (!(await SystemInfo.find({ key: key }).limit(1))[0])
                    await SystemInfo.set(key, value, "env");
                return value;
            }
        }
        let obj = await SystemInfo.findOne({ key: key });
        sails.log.silly("CORE > SystemInfo > findOne: ", key, obj);
        if (!obj) {
            // if (!sails.config[config][key] || !defaultConfig[key]){
            //   sails.log.error("CORE > SystemInfo > key ", key, "not found" );
            //   throw undefined
            // }
            let value;
            if (!sails.config[config]) {
                value = defaultConfig_1.default[key];
            }
            else {
                if (sails.config[config][key]) {
                    value = sails.config[config][key];
                }
                else {
                    return undefined;
                }
            }
            value = JSON.stringify(value);
            try {
                obj = await SystemInfo.set(key, value, config);
            }
            catch (e) {
                sails.log.error(key, value, config, e);
            }
        }
        let value = obj.value;
        try {
            value = JSON.parse(obj.value);
        }
        finally {
            return value;
        }
    },
    /**
   * Проверяет существует ли настройка, если не сущестует, то создаёт новую и возвращает ее. Если существует, то обновляет его значение (value)
   * на новые. Также при первом внесении запишется параметр (config), отвечающий за раздел настройки.
   * @param values
   * @return обновлённое или созданное блюдо
   */
    async set(key, value, config) {
        try {
            const propety = await SystemInfo.findOne({ key: key });
            if (!propety) {
                return SystemInfo.create({
                    key: key,
                    value: value,
                    from: config
                });
            }
            else {
                return (await SystemInfo.update({ key: key }, { value: value }))[0];
            }
        }
        catch (e) {
            sails.log.error("CORE > SystemInfo > set: ", key, value, config, e);
        }
    }
};
