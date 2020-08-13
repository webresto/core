"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const defaultConfig_1 = require("../config/defaultConfig");
module.exports = {
    migrate: 'drop',
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
