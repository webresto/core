"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const getEmitter_1 = require("../libs/getEmitter");
// Memory store
let settings = {};
sails.after(["hook:orm:loaded"], () => {
    //@ts-ignore
    let allSettings = await Settings.find({});
    allSettings.forEach(settingsItem => {
        settings[settingsItem.key] = settingsItem.value;
    });
});
///////////////
let attributes = {
    /**Id */
    id: {
        type: "number",
        autoIncrement: true,
    },
    /** Ключ доступа к свойству */
    key: {
        type: "string",
        unique: true,
        required: true,
    },
    /** Описание */
    description: "string",
    /** Значение свойства */
    value: "json",
    /** Секция, к которой относится свойство */
    section: "string",
    /** Источника происхождения */
    from: "string",
};
let Model = {
    afterUpdate: function (record, proceed) {
        getEmitter_1.default().emit(`settings:${record.key}`, record);
        settings[record.key] = record.value;
        return proceed();
    },
    afterCreate: function (record, proceed) {
        getEmitter_1.default().emit(`settings:${record.key}`, record);
        settings[record.key] = record.value;
        return proceed();
    },
    /** retrun setting value by key */
    async use(key, from) {
        sails.log.silly("CORE > Settings > use: ", key, from);
        let value;
        /** ENV variable is important*/
        if (process.env[key] !== undefined) {
            try {
                value = JSON.parse(process.env[key]);
            }
            catch (e) {
                sails.log.error("CORE > Settings > use ENV parse error: ", e);
                value = process.env[key];
            }
            finally {
                if (!(await Settings.find({ key: key }).limit(1))[0])
                    await Settings.set(key, value, "env");
                return value;
            }
        }
        /** If variable present in database */
        let setting = (await Settings.find({ key: key }).limit(1))[0];
        sails.log.silly("CORE > Settings > findOne: ", key, setting);
        if (setting && setting.value)
            return setting.value;
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
    /** ⚠️ Experemental! Read setting from memory store */
    get(key) {
        if (settings[key] !== undefined) {
            return settings[key];
        }
        else {
            return undefined;
        }
    }
    /**
     * Проверяет существует ли настройка, если не сущестует, то создаёт новую и возвращает ее. Если существует, то обновляет его значение (value)
     * на новые. Также при первом внесении запишется параметр (config), отвечающий за раздел настройки.
     */
    ,
    /**
     * Проверяет существует ли настройка, если не сущестует, то создаёт новую и возвращает ее. Если существует, то обновляет его значение (value)
     * на новые. Также при первом внесении запишется параметр (config), отвечающий за раздел настройки.
     */
    async set(key, value, from) {
        if (key === undefined || value === undefined)
            throw `Setting set key (${key}) and value (${value}) required`;
        try {
            const propety = await Settings.findOne({ key: key });
            if (!propety) {
                return Settings.create({
                    key: key,
                    value: value,
                    from: from,
                }).fetch();
            }
            else {
                return (await Settings.update({ key: key }, { value: value }).fetch())[0];
            }
        }
        catch (e) {
            sails.log.error("CORE > Settings > set: ", key, value, from, e);
        }
    },
};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
