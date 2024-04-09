"use strict";
/**
 * Attention! We use MM "Settings" model in production mode, but for tests and core integrity, we support this model
 * */
Object.defineProperty(exports, "__esModule", { value: true });
const ajv_1 = require("ajv");
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
        let origSettings = await Settings.findOne({ key: key });
        if (origSettings) {
            Object.assign(origSettings, settingsSetInput);
            //@ts-ignore
            settingsSetInput = origSettings;
        }
        console.log(origSettings);
        if (settingsSetInput["key"] && settingsSetInput["key"] !== key) {
            throw `Key [${key}] does not match with SettingsSetInput.key: [${settingsSetInput.key}]`;
        }
        // calculate 'type' by value (if value was given)
        let settingType = settingsSetInput.type;
        if (!settingType && origSettings) {
            settingType = origSettings.type;
        }
        // Detect type if not defined
        if (!settingType && settingsSetInput.jsonSchema && settingsSetInput.jsonSchema.type) {
            settingType = settingsSetInput.jsonSchema.type;
        }
        if (!settingType && settingsSetInput.value) {
            let detectedType = typeof settingsSetInput.value;
            if (["string", "boolean", "json", "number"].includes(detectedType)) {
                //@ts-ignore
                settingType = typeof settingsSetInput.value;
            }
        }
        if (!settingType && settingsSetInput.defaultValue) {
            let detectedType = typeof settingsSetInput.defaultValue;
            if (["string", "boolean", "json", "number"].includes(detectedType)) {
                //@ts-ignore
                settingType = typeof settingsSetInput.value;
            }
        }
        if (!settingType) {
            const errorMessage = `Settings set error: Can not calculate type by given value [${settingType}], but type is required field`;
            sails.log.error(errorMessage);
            throw errorMessage;
        }
        // check that jsonSchema is present for a json type
        if (settingType === "json" && settingsSetInput.jsonSchema === undefined) {
            const errorMessage = `Setting set [${settingsSetInput.key}] error: jsonSchema is missed for type "json"`;
            sails.log.error(errorMessage);
            throw errorMessage;
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
            if (settingsSetInput.value !== undefined && !validate(settingsSetInput.value)) {
                let mErr = 'AJV Validation Error: Value does not match the schema';
                sails.log.error(mErr);
                throw mErr;
            }
            if (settingsSetInput.defaultValue !== undefined && !validate(settingsSetInput.defaultValue)) {
                let mErr = 'AJV Validation Error: DefaultValue does not match the schema';
                sails.log.error(mErr);
                throw mErr;
            }
        }
        // Set in local variable (local storage)
        settings[key.toString()] = settingsSetInput.value !== undefined ? settingsSetInput.value : settingsSetInput.defaultValue;
        // Write to Database
        try {
            const setting = await Settings.findOne({ key: key });
            if (!setting) {
                return await Settings.create({
                    key: key,
                    type: settingType,
                    module: settingsSetInput.appId || null,
                    ...settingsSetInput.jsonSchema && { jsonSchema: settingsSetInput.jsonSchema },
                    ...settingsSetInput.name && { name: settingsSetInput.name },
                    ...settingsSetInput.value && { value: settingsSetInput.value },
                    ...settingsSetInput.defaultValue && { defaultValue: settingsSetInput.defaultValue },
                    ...settingsSetInput.description && { description: settingsSetInput.description },
                    ...settingsSetInput.tooltip && { tooltip: settingsSetInput.tooltip },
                    ...settingsSetInput.uiSchema && { uiSchema: settingsSetInput.uiSchema },
                    readOnly: settingsSetInput.readOnly ?? false
                }).fetch();
            }
            else {
                if (setting.readOnly)
                    throw `Property cannot be changed (read only)`;
                return (await Settings.update({ key: key }, {
                    type: settingType,
                    ...settingsSetInput.jsonSchema && { jsonSchema: settingsSetInput.jsonSchema },
                    ...settingsSetInput.name && { name: settingsSetInput.name },
                    ...settingsSetInput.value && { value: settingsSetInput.value },
                    ...settingsSetInput.defaultValue && { defaultValue: settingsSetInput.defaultValue },
                    ...settingsSetInput.description && { description: settingsSetInput.description },
                    ...settingsSetInput.tooltip && { tooltip: settingsSetInput.tooltip },
                    ...settingsSetInput.uiSchema && { uiSchema: settingsSetInput.uiSchema },
                    ...settingsSetInput.readOnly && { readOnly: settingsSetInput.readOnly }
                }).fetch())[0];
            }
        }
        catch (e) {
            sails.log.error("CORE > Settings > set DB error: ", settingsSetInput, e);
            throw `Error Set settings in DB`;
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
