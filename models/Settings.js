"use strict";
/**
 * Attention! We use MM "Settings" model in production mode, but for tests and core integrity, we support this model
 * */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ajv_1 = __importDefault(require("ajv"));
// Memory store
let settings = {};
let attributes = {
    id: {
        type: "number",
        autoIncrement: true,
    },
    key: {
        type: "string",
        unique: true,
        required: true,
    }, // all spaces will be replaced by "_"
    name: "string",
    description: "string",
    tooltip: "string",
    value: "json",
    /** In case value is not defined */
    defaultValue: "json", // can be set only by file
    type: {
        type: "string",
        required: true,
        isIn: ["string", "boolean", "json", "number"]
    },
    /** JSON schema for value and defaultValue */
    jsonSchema: {
        type: "json"
    },
    uiSchema: {
        type: "json"
    },
    /** Only reading */
    readOnly: {
        type: "boolean"
    },
    module: {
        type: "string",
        allowNull: true
    },
    isRequired: "boolean"
};
let Model = {
    beforeCreate: function (record, cb) {
        record.key = record.key.replace(/ /g, '_');
        cb();
    },
    beforeUpdate: function (record, cb) {
        if (record.key || record.module) {
            cb("Settings error: Can not change record.key and record.module. Delete and create new setting instead.");
        }
        cb();
    },
    afterUpdate: async function (record, cb) {
        emitter.emit(`settings:${record.key}`, record);
        settings[record.key] = cleanValue(record.value);
        // let moduleId = record.module as string;
        // await ModuleHelper.checkSettings(moduleId);
        cb();
    },
    afterCreate: async function (record, cb) {
        emitter.emit(`settings:${record.key}`, record);
        settings[record.key] = cleanValue(record.value);
        // let moduleId = record.module as string;
        // await ModuleHelper.checkSettings(moduleId);
        cb();
    },
    /** return setting value by unique key */
    async use(key) {
        let value;
        /** ENV variable is more important than a database, but it should match the schema */
        if (process.env[key] !== undefined) {
            // ENV variable should be in database
            let setting = await Settings.findOne({ key: key });
            if (!setting) {
                return undefined;
            }
            if (setting.type !== "json") {
                value = process.env[key];
            }
            else {
                try {
                    value = JSON.parse(process.env[key]);
                    // if value was parsed, check that given json matches the schema (if !ALLOW_UNSAFE_SETTINGS)
                    if (!(await Settings.get("ALLOW_UNSAFE_SETTINGS"))) {
                        const ajv = new ajv_1.default();
                        const validate = ajv.compile(setting.jsonSchema);
                        if (!validate(value)) {
                            console.error('AJV Validation Error: Value from process.env does not match the schema');
                            return undefined;
                        }
                    }
                }
                catch (e) {
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
            let appId = setting.module;
            if (sails.config[appId] && sails.config[appId][key]) {
                value = sails.config[appId][key];
                return cleanValue(value);
            }
        }
        sails.log.silly(`Settings: [${key}] not found`);
        return undefined;
    },
    async get(key) {
        let _key = key;
        // return error if setting was not declared by specification
        // if (!SettingsHelper.isInDeclaredSettings(key) && !(await Settings.get("ALLOW_UNSAFE_SETTINGS"))) {
        //   sails.log.error(`Settings get: Requested setting [${key}] was not declared by specification`);
        //   return;
        // }
        if (settings[_key] !== undefined) {
            return cleanValue(settings[_key]);
        }
        else {
            const value = await Settings.use(_key);
            settings[_key] = value;
            return cleanValue(value);
        }
    },
    async set(key, settingsSetInput) {
        if (settingsSetInput["key"] !== key) {
            throw `Key [${key}] does not match with SettingsSetInput.key: [${settingsSetInput.key}]`;
        }
        // calculate 'type' by value (if value was given)
        let settingType = settingsSetInput.type;
        if (!settingType) {
            switch (typeof settingsSetInput.value) {
                case 'object':
                    settingType = 'json';
                    break;
                case 'boolean':
                    settingType = 'boolean';
                    break;
                case 'number':
                    settingType = 'number';
                    break;
                case 'string':
                    settingType = 'string';
                    break;
                default:
                    sails.log.error('Settings set error: Can not calculate type by given value, but type is required field');
                    return;
            }
        }
        // check that jsonSchema is present for a json type
        if (settingType === "json" && settingsSetInput.jsonSchema === undefined) {
            sails.log.error(`Setting set [${settingsSetInput.key}] error: jsonSchema is missed for type "json"`);
        }
        // convert some values for boolean type
        if (settingType === "boolean") {
            if (["yes", "YES", "Yes", "1", "true", "TRUE", "True"].includes(`${settingsSetInput.value}`)) {
                settingsSetInput.value = true;
            }
            else if (["no", "NO", "No", "0", "false", "FALSE", "False"].includes(`${settingsSetInput.value}`)) {
                settingsSetInput.value = false;
            }
            if (["yes", "YES", "Yes", "1", "true", "TRUE", "True"].includes(`${settingsSetInput.defaultValue}`)) {
                settingsSetInput.defaultValue = true;
            }
            else if (["no", "NO", "No", "0", "false", "FALSE", "False"].includes(`${settingsSetInput.defaultValue}`)) {
                settingsSetInput.defaultValue = false;
            }
        }
        // check that value and defaultValue match the schema for json type (if !ALLOW_UNSAFE_SETTINGS)
        if (settingType === "json" && !(await Settings.get("ALLOW_UNSAFE_SETTINGS"))) {
            const ajv = new ajv_1.default();
            const validate = ajv.compile(settingsSetInput.jsonSchema);
            if ((settingsSetInput.value !== undefined && !validate(settingsSetInput.value)) ||
                (settingsSetInput.defaultValue !== undefined && !validate(settingsSetInput.defaultValue))) {
                sails.log.error('AJV Validation Error: Value or defaultValue does not match the schema');
                return;
            }
        }
        // Set in local variable (local storage)
        settings[settingsSetInput.key] = settingsSetInput.value !== undefined ? settingsSetInput.value : settingsSetInput.defaultValue;
        // Write to Database
        try {
            const setting = await Settings.findOne({ key: settingsSetInput.key });
            if (!setting) {
                return await Settings.create({
                    key: settingsSetInput.key,
                    type: settingType,
                    jsonSchema: settingsSetInput.jsonSchema,
                    module: settingsSetInput.appId || null,
                    name: settingsSetInput.name,
                    value: settingsSetInput.value,
                    defaultValue: settingsSetInput.defaultValue,
                    description: settingsSetInput.description,
                    tooltip: settingsSetInput.tooltip,
                    uiSchema: settingsSetInput.uiSchema,
                    readOnly: settingsSetInput.readOnly || false
                }).fetch();
            }
            else {
                if (setting.readOnly)
                    throw `Property cannot be changed (read only)`;
                return (await Settings.update({ key: settingsSetInput.key }, {
                    type: settingType,
                    jsonSchema: settingsSetInput.jsonSchema,
                    name: settingsSetInput.name,
                    value: settingsSetInput.value,
                    defaultValue: settingsSetInput.defaultValue,
                    description: settingsSetInput.description,
                    tooltip: settingsSetInput.tooltip,
                    uiSchema: settingsSetInput.uiSchema,
                    readOnly: settingsSetInput.readOnly || false
                }).fetch())[0];
            }
        }
        catch (e) {
            sails.log.error("CORE > Settings > set: ", settingsSetInput, e);
            return;
        }
    }
};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
function cleanValue(value) {
    if (value === "undefined" || value === "NaN" || value === "null") {
        return undefined;
    }
    return value;
}
