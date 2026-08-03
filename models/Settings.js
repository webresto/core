"use strict";
/**
 * Settings model
 * Core Settings model used in production mode
 * */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ajv_1 = __importDefault(require("ajv"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Directory holding per-setting manifest files (settings/*.json). Each manifest
// declares a setting (key/type/name/defaultValue/jsonSchema/...) and is the single
// source of truth for seeding it at boot. See loadSettingsManifests().
const SETTINGS_MANIFEST_DIR = path_1.default.resolve(__dirname, "../settings");
// Memory store
let settings = {};
// Declared settings tracker (ported from MM settingsHelper)
const declaredSettings = ["MODULE_STORAGE_LICENSE", "ALLOW_UNSAFE_SETTINGS"];
const isInDeclaredSettingsErrorCollector = new Map();
// Settings whose value, when stored in DB, must also be mirrored into process.env
// because some libraries read process.env[key] directly instead of Settings.get(key)
const envMirroredSettings = ["JWT_SECRET"];
function setDeclaredSetting(key) {
    declaredSettings.push(key);
}
function isInDeclaredSettings(key) {
    return declaredSettings.includes(key);
}
/** Mirror a setting's value into process.env so libraries reading process.env[key] stay in sync with the DB */
function syncToEnv(record) {
    if (!envMirroredSettings.includes(record.key)) {
        return;
    }
    const value = record.value ?? record.defaultValue ?? undefined;
    if (value === undefined || value === null) {
        return;
    }
    process.env[record.key] = typeof value === "string" ? value : JSON.stringify(value);
}
function parseBoolean(value) {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }
    const trueValues = ["yes", "YES", "Yes", "1", "true", "TRUE", "True"];
    const falseValues = ["no", "NO", "No", "0", "false", "FALSE", "False"];
    if (trueValues.includes(value)) {
        return true;
    }
    if (falseValues.includes(value)) {
        return false;
    }
    return false;
}
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
    tooltip: {
        type: "string",
        allowNull: true
    },
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
        type: "boolean",
        allowNull: true
    },
    module: {
        type: "string",
        allowNull: true
    },
    isRequired: {
        type: "boolean",
        allowNull: true
    }
};
let Model = {
    beforeCreate: function (record, cb) {
        record.key = record.key.replace(/ /g, '_');
        cb();
    },
    beforeUpdate: async function (record, cb) {
        // Todo: IN adminpanel it produce error becuse we not know id in beforeUpdate
        // if (!record.id) {
        // 	cb("Settings error: Setting.id is required for update");
        // }
        // let setting = await Settings.findOne({ id: record.id });
        // if (setting.readOnly && setting.value !== null) {
        // 	cb(`Settings error: Setting [${record.key}] cannot be changed (read only)`);
        // }
        if (record.key) {
            record.key = record.key.replace(/ /g, '_');
        }
        cb();
    },
    afterUpdate: async function (record, cb) {
        try {
            emitter.emit(`settings:${record.key}`, record);
        }
        catch (error) {
            sails.log.silly(`Emitter does not exist`, error);
        }
        settings[record.key] = cleanValue(record.value ?? record.defaultValue ?? undefined);
        syncToEnv(record);
        cb();
    },
    afterCreate: async function (record, cb) {
        try {
            emitter.emit(`settings:${record.key}`, record);
        }
        catch (error) {
            sails.log.silly(`Emitter does not exist`, error);
        }
        settings[record.key] = cleanValue(record.value ?? record.defaultValue ?? undefined);
        syncToEnv(record);
        cb();
    },
    /** return setting value by unique key */
    async use(key) {
        let value;
        /** ENV variable is more important than database, but it should match the schema */
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
                    // Check if jsonSchema expects a primitive type (string, number, boolean)
                    const schemaType = setting.jsonSchema?.type;
                    if (schemaType === "string") {
                        value = process.env[key];
                    }
                    else if (schemaType === "number" || schemaType === "integer") {
                        value = parseInt(process.env[key], 10);
                        if (isNaN(value)) {
                            sails.log.error(`Error: Value [${process.env[key]}] for [${key}] cannot be converted to number`);
                            return undefined;
                        }
                    }
                    else if (schemaType === "boolean") {
                        const parsed = parseBoolean(process.env[key]);
                        value = parsed !== undefined ? parsed : false;
                    }
                    else {
                        value = JSON.parse(process.env[key]);
                    }
                    // if value was parsed, check that given json matches the schema (if !ALLOW_UNSAFE_SETTINGS)
                    if (!(Settings.env("ALLOW_UNSAFE_SETTINGS") ?? false)) {
                        const ajv = new ajv_1.default();
                        const validate = ajv.compile(setting.jsonSchema);
                        if (!validate(value)) {
                            sails.log.error(`AJV Validation Error: Value [${value}] from process.env for [${key}] does not match the schema`, validate.errors);
                            return undefined;
                        }
                    }
                }
                catch (e) {
                    sails.log.error(`Error trying to parse value from process.env: ${e}`);
                    return undefined;
                }
            }
            return cleanValue(value);
        }
        /** If variable present in database */
        let setting = await Settings.findOne({ key: key });
        if (setting && (setting.value !== null || setting.defaultValue !== null)) {
            value = setting.value !== null ? setting.value : setting.defaultValue;
            return cleanValue(value);
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
        if (!isInDeclaredSettings(key) && !Settings.env("ALLOW_UNSAFE_SETTINGS")) {
            if (!isInDeclaredSettingsErrorCollector.has(key)) {
                sails.log.warn(`Settings get error: Requested setting [${key}] was not declared by specification`);
                isInDeclaredSettingsErrorCollector.set(key, true);
            }
        }
        if (settings[_key] !== undefined) {
            //@ts-ignore
            return cleanValue(settings[_key]);
        }
        else {
            const value = await Settings.use(_key);
            settings[_key] = value;
            //@ts-ignore
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
        // @ts-ignore
        if (settingsSetInput["key"] && settingsSetInput["key"] !== key) {
            sails.log.error(`Key [${key}] does not match with SettingsSetInput.key: [${settingsSetInput.key}]`);
            return;
        }
        // calculate type
        let settingType = settingsSetInput.type;
        if (!settingType && origSettings) {
            settingType = origSettings.type;
        }
        // calculate type by value
        if (!settingType && settingsSetInput.value) {
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
                    sails.log.error(`Settings set error: Can not calculate type for [${key}] by given value [${settingType}], but type is required field`);
                    return;
            }
        }
        // if type was not calculated by value, calculate type by defaultValue
        if (!settingType && settingsSetInput.defaultValue) {
            switch (typeof settingsSetInput.defaultValue) {
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
                    sails.log.error(`Settings set error: Can not calculate type for [${key}] by given value [${settingType}], but type is required field`);
                    return;
            }
        }
        if (!settingType) {
            const errorMessage = `Settings set error: Can not calculate type for [${key}] by given value [${settingType}], but type is required field`;
            sails.log.error(errorMessage);
            return;
        }
        // check that jsonSchema is present for a json type
        if (settingType === "json" && settingsSetInput.jsonSchema === undefined) {
            const errorMessage = `Setting set [${key}] error: jsonSchema is missed for type "json"`;
            sails.log.error(errorMessage);
            return;
        }
        // convert some values for boolean type
        if (settingType === "boolean") {
            if (settingsSetInput.value !== undefined) {
                const parsedValue = parseBoolean(`${settingsSetInput.value}`);
                if (parsedValue !== undefined) {
                    settingsSetInput.value = parsedValue;
                }
            }
            if (settingsSetInput.defaultValue !== undefined) {
                const parsedDefaultValue = parseBoolean(`${settingsSetInput.defaultValue}`);
                if (parsedDefaultValue !== undefined) {
                    settingsSetInput.defaultValue = parsedDefaultValue;
                }
            }
        }
        // coerce value/defaultValue to match jsonSchema type (DB stores "json" which may auto-parse strings to numbers)
        if (settingsSetInput.jsonSchema) {
            const expectedType = settingsSetInput.jsonSchema.type;
            if (expectedType === "string") {
                if (settingsSetInput.value !== undefined && settingsSetInput.value !== null && typeof settingsSetInput.value !== "string") {
                    settingsSetInput.value = String(settingsSetInput.value);
                }
                if (settingsSetInput.defaultValue !== undefined && settingsSetInput.defaultValue !== null && typeof settingsSetInput.defaultValue !== "string") {
                    settingsSetInput.defaultValue = String(settingsSetInput.defaultValue);
                }
            }
            else if (expectedType === "number" || expectedType === "integer") {
                if (settingsSetInput.value !== undefined && settingsSetInput.value !== null && typeof settingsSetInput.value === "string") {
                    settingsSetInput.value = Number(settingsSetInput.value);
                }
                if (settingsSetInput.defaultValue !== undefined && settingsSetInput.defaultValue !== null && typeof settingsSetInput.defaultValue === "string") {
                    settingsSetInput.defaultValue = Number(settingsSetInput.defaultValue);
                }
            }
        }
        // check that value and defaultValue match the schema for json type (if !ALLOW_UNSAFE_SETTINGS)
        if (settingsSetInput.jsonSchema && !Settings.env("ALLOW_UNSAFE_SETTINGS")) {
            const ajv = new ajv_1.default();
            let validate;
            try {
                validate = ajv.compile(settingsSetInput.jsonSchema);
            }
            catch (e) {
                sails.log.error(`AJV Validation Error: Can not compile the schema`, e);
                return;
            }
            // undefined if value is from input, null if value is from origSettings
            if (settingsSetInput.value !== undefined && settingsSetInput.value !== null && !validate(settingsSetInput.value)) {
                let mErr = `AJV Validation Error: [${key}] Value [${settingsSetInput.value}] does not match the schema, see logs for more info`;
                sails.log.error(mErr, JSON.stringify(validate.errors, null, 2));
                return;
            }
            if (settingsSetInput.defaultValue !== undefined && settingsSetInput.defaultValue !== null && !validate(settingsSetInput.defaultValue)) {
                let mErr = `AJV Validation Error: [${key}] DefaultValue [${settingsSetInput.defaultValue}] does not match the schema, see logs for more info`;
                sails.log.error(mErr, JSON.stringify(validate.errors, null, 2));
                return;
            }
        }
        // Set in local variable (local storage)
        settings[key.toString()] = settingsSetInput.value !== undefined ? settingsSetInput.value : settingsSetInput.defaultValue;
        // Sanitize jsonSchema to replace keys starting with $ with __s__ to avoid NeDB error, only if not production
        if (process.env.NODE_ENV !== 'production' && settingsSetInput.jsonSchema && Settings.env("ALLOW_UNSAFE_SETTINGS")) {
            settingsSetInput.jsonSchema = null;
        }
        // Write to Database
        try {
            let setting = await Settings.findOne({ key: key });
            let inputValue = settingsSetInput.isRequired ? settingsSetInput.value ?? settingsSetInput.defaultValue : settingsSetInput.value;
            const createData = {
                key: key,
                type: settingType,
                module: settingsSetInput.appId || null,
                jsonSchema: settingsSetInput.jsonSchema,
                name: settingsSetInput.name,
                value: inputValue,
                defaultValue: settingsSetInput.defaultValue,
                description: settingsSetInput.description,
                tooltip: settingsSetInput.tooltip,
                uiSchema: settingsSetInput.uiSchema,
                readOnly: settingsSetInput.readOnly ?? false,
                isRequired: settingsSetInput.isRequired ?? false
            };
            const updateData = {
                key: key,
                type: settingType,
                ...(settingsSetInput.jsonSchema !== undefined ? { jsonSchema: settingsSetInput.jsonSchema } : {}),
                ...(settingsSetInput.name !== undefined ? { name: settingsSetInput.name } : {}),
                ...(inputValue !== undefined ? { value: inputValue } : {}),
                ...(settingsSetInput.defaultValue !== undefined ? { defaultValue: settingsSetInput.defaultValue } : {}),
                ...(settingsSetInput.description !== undefined ? { description: settingsSetInput.description } : {}),
                ...(settingsSetInput.tooltip !== undefined ? { tooltip: settingsSetInput.tooltip } : {}),
                ...(settingsSetInput.uiSchema !== undefined ? { uiSchema: settingsSetInput.uiSchema } : {}),
                ...(settingsSetInput.readOnly !== undefined ? { readOnly: settingsSetInput.readOnly } : {}),
                ...(settingsSetInput.isRequired !== undefined ? { isRequired: settingsSetInput.isRequired } : {}),
            };
            if (!setting) {
                try {
                    const created = await Settings.create(createData).fetch();
                    sails.log.debug(`CORE > Settings > created [${key}]:`, JSON.stringify({ value: inputValue, defaultValue: settingsSetInput.defaultValue, type: settingType }));
                    return created;
                }
                catch (e) {
                    if ((e === null || e === void 0 ? void 0 : e.code) !== "E_UNIQUE") {
                        throw e;
                    }
                    // Another bootstrap path created the same setting between findOne and create.
                    setting = await Settings.findOne({ key: key });
                    if (!setting) {
                        throw e;
                    }
                }
            }
            const updated = (await Settings.update({ key: key }, updateData).fetch())[0];
            const _fmt = (v) => { const s = JSON.stringify(v); return s && s.length > 1024 ? '[long object]' : s; };
            sails.log.debug(`CORE > Settings > updated [${key}]:`, JSON.stringify({ value: _fmt(updateData.value), defaultValue: _fmt(updateData.defaultValue), type: settingType }));
            return updated;
        }
        catch (e) {
            sails.log.error(`CORE > Settings > set DB error: key [${key}]`, settingsSetInput, e);
        }
    },
    env(key) {
        const envValue = process.env[key];
        if (envValue === undefined) {
            return undefined;
        }
        // For ALLOW_UNSAFE_SETTINGS, we know it's boolean
        if (key === "ALLOW_UNSAFE_SETTINGS") {
            const parsed = parseBoolean(envValue);
            return (parsed !== undefined ? parsed : false);
        }
        // For other keys, try to parse as JSON, fallback to string
        try {
            return JSON.parse(envValue);
        }
        catch {
            return envValue;
        }
    },
    /**
     * Pull stored values for envMirroredSettings (e.g. JWT_SECRET) from the DB
     * into process.env on boot, so libraries reading process.env[key] directly
     * stay in sync with the value configured in Settings.
     * Does not overwrite process.env if it is already set (env takes priority).
     */
    async syncEnvMirroredSettings() {
        for (const key of envMirroredSettings) {
            if (process.env[key] !== undefined) {
                continue;
            }
            const setting = await Settings.findOne({ key: key });
            if (!setting) {
                continue;
            }
            syncToEnv(setting);
        }
    },
    /**
     * Seed settings from the manifest files in settings/*.json.
     *
     * Each manifest is the declarative source of truth for one setting (replacing
     * hardcoded Settings.set(...) calls at boot). For every manifest we:
     *   1. declare the key (so Settings.get passes the declared-settings guard), and
     *   2. seed it into the DB only when it is not already present — an existing
     *      value (operator-configured or previously seeded) is never overwritten.
     *
     * Manifests must satisfy libs/schemas/settingsFile.json (json type requires a
     * jsonSchema). Malformed or invalid manifests are logged and skipped.
     */
    async loadSettingsManifests() {
        if (!fs_1.default.existsSync(SETTINGS_MANIFEST_DIR)) {
            sails.log.warn(`CORE > Settings > manifest dir not found: ${SETTINGS_MANIFEST_DIR}`);
            return;
        }
        for (const file of fs_1.default.readdirSync(SETTINGS_MANIFEST_DIR)) {
            if (!file.endsWith(".json"))
                continue;
            let manifest;
            try {
                manifest = JSON.parse(fs_1.default.readFileSync(path_1.default.join(SETTINGS_MANIFEST_DIR, file), "utf8"));
            }
            catch (e) {
                sails.log.error(`CORE > Settings > failed to parse manifest [${file}]`, e);
                continue;
            }
            if (!manifest || !manifest.key || !manifest.type || !manifest.name) {
                sails.log.error(`CORE > Settings > manifest [${file}] missing required fields (key/type/name)`);
                continue;
            }
            if (manifest.type === "json" && manifest.jsonSchema === undefined) {
                sails.log.error(`CORE > Settings > manifest [${file}] type "json" requires jsonSchema`);
                continue;
            }
            // Always declare, so Settings.get(key) never trips the declared-settings guard.
            setDeclaredSetting(manifest.key);
            // Seed only if absent — do not clobber operator-configured values.
            if (await Settings.get(manifest.key) !== undefined) {
                continue;
            }
            try {
                await Settings.set(manifest.key, {
                    key: manifest.key,
                    type: manifest.type,
                    name: manifest.name,
                    description: manifest.description,
                    tooltip: manifest.tooltip,
                    value: manifest.value,
                    defaultValue: manifest.defaultValue,
                    jsonSchema: manifest.jsonSchema,
                    uiSchema: manifest.uiSchema,
                    readOnly: manifest.readOnly,
                    isRequired: manifest.isRequired,
                });
            }
            catch (e) {
                sails.log.error(`CORE > Settings > failed to seed manifest [${manifest.key}]`, e);
            }
        }
    },
    // Expose declared settings management for MM settingsHelper
    setDeclaredSetting,
    isInDeclaredSettings,
    parseBoolean
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
