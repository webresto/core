"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Memory store
let settings = {};
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
    /** Only reading */
    readOnly: {
        type: "boolean"
    },
    schema: "json"
};
let Model = {
    beforeCreate: function (record, cb) {
        record.key = toScreamingSnake(record.key);
        cb();
    },
    beforeUpdate: function (record, cb) {
        if (record.key) {
            record.key = toScreamingSnake(record.key);
        }
        cb();
    },
    afterUpdate: function (record, cb) {
        emitter.emit(`settings:${record.key}`, record);
        settings[record.key] = record.value;
        cb();
    },
    afterCreate: function (record, cb) {
        emitter.emit(`settings:${record.key}`, record);
        settings[record.key] = record.value;
        return cb();
    },
    /** retrun setting value by key */
    async use(key, from) {
        key = toScreamingSnake(key);
        sails.log.silly("CORE > Settings > use: ", key, from);
        let value;
        /** ENV variable is important*/
        if (process.env[key] !== undefined) {
            try {
                value = JSON.parse(process.env[key]);
            }
            catch (e) {
                // sails.log.error("CORE > Settings > use ENV parse error: ", e);
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
        if (setting && setting.value) {
            if (typeof value === "string") {
                process.env[key] = value;
            }
            else {
                process.env[key] = JSON.stringify(value);
            }
            return setting.value;
        }
        /** Variable present in sails config */
        if (from) {
            if (sails.config[from] && sails.config[from][key]) {
                value = sails.config[from][key];
                await Settings.set(key, value, from);
                return value;
            }
        }
        sails.log.silly(`Settings: ( ${key} ) not found`);
        return undefined;
    },
    async get(key) {
        key = toScreamingSnake(key);
        if (settings[key] !== undefined) {
            return settings[key];
        }
        else {
            const value = await Settings.use(key);
            settings[key] = value;
            return value;
        }
    },
    /**
     * Проверяет существует ли настройка, если не сущестует, то создаёт новую и возвращает ее. Если существует, то обновляет его значение (value)
     * на новые. Также при первом внесении запишется параметр (config), отвечающий за раздел настройки.
     */
    async set(key, value, from, readOnly = false) {
        if (key === undefined || value === undefined)
            throw `Setting set key (${key}) and value (${value}) required`;
        key = toScreamingSnake(key);
        // Set in local variable
        settings[key] = value;
        // Set in ENV
        if (typeof value === "string") {
            process.env[key] = value;
        }
        else {
            process.env[key] = JSON.stringify(value);
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
                });
            }
            else {
                if (propety.readOnly)
                    throw `Property cannot be changed (read only)`;
                return (await Settings.update({ key: key }, { value: value }).fetch())[0];
            }
        }
        catch (e) {
            sails.log.error("CORE > Settings > set: ", key, value, from, e);
        }
    },
    async setDefault(key, value, from, readOnly = false) {
        let setting = (await Settings.find({ key: key }).limit(1))[0];
        if (!setting) {
            await Settings.create({
                key: key,
                value: value,
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
function toScreamingSnake(str) {
    if (!str) {
        console.log("STR", str);
        return '';
    }
    // Test123___Test_test -> TEST123_TEST_TEST
    return str.replace(/\.?([A-Z]+)/g, function (x, y) { return "_" + y.toLowerCase(); }).replace(/^_/, "").replace(/_{1,}/g, "_").toUpperCase();
}
