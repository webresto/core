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
        value: 'string',
        section: 'string',
        from: 'string'
    },
    async use(config, key) {
        sails.log.verbose("CORE > SystemInfo > use: ", key, config);
        if (!key) {
            key = config;
            config = 'restocore';
        }
        let obj = await SystemInfo.findOne({ key: key, from: config });
        if (!obj) {
            let value = sails.config[config][key] || defaultConfig_1.default[key] || 0;
            value = JSON.stringify(value);
            try {
                obj = await SystemInfo.set(key, value, config);
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
    },
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
