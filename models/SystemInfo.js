"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const defaultConfig_1 = require("../../../@webresto/core/config/defaultConfig");
module.exports = {
    // migrate: 'drop',
    attributes: {
        id: {
            type: 'integer',
            autoIncrement: true,
            primaryKey: true
        },
        key: 'string',
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
        if (!key) {
            key = config;
            config = 'restocore';
        }
        let obj = await SystemInfo.findOne({ key: key, from: config });
        if (!obj) {
            let value = sails.config[config][key] || defaultConfig_1.default[key] || 0;
            value = JSON.stringify(value);
            try {
                obj = await SystemInfo.create({
                    key: key,
                    value: value,
                    from: config
                });
            }
            catch (e) {
                sails.log.error(key, value, config, e);
                obj = await SystemInfo.findOne({ key: key, from: config });
            }
        }
        let value = obj.value;
        try {
            value = JSON.parse(obj.value);
        }
        finally {
            return value;
        }
    }
};
