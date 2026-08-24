/**
 * Settings model
 * Core Settings model used in production mode
 * */
import { OptionalAll, RequiredField } from "../interfaces/toolsTS";
import { ORMModel } from "../interfaces/ORMModel";
import ORM from "../interfaces/ORM";
import { ControlElement, Layout } from "@jsonforms/core";
type PlainValue = string | boolean | number | string[] | number[] | SettingValue[];
type SettingValue = PlainValue | {
    [key: string]: SettingList[keyof SettingList];
};
type SettingType = "string" | "boolean" | "json" | "number";
interface UISchema {
    type?: string;
    elements?: (ControlElement | Layout)[];
    label?: string;
    rule?: any;
    scope?: string;
    options?: any;
}
declare function setDeclaredSetting(key: string): void;
declare function isInDeclaredSettings(key: string): boolean;
declare function parseBoolean(value: string | undefined): boolean | undefined;
declare let attributes: {
    id: string;
    key: string;
    name: string;
    description: string;
    tooltip: string;
    value: SettingValue;
    /** In case value is not defined */
    defaultValue: SettingValue;
    type: SettingType;
    /** JSON schema for value and defaultValue */
    jsonSchema: any;
    uiSchema: UISchema;
    /** Only reading */
    readOnly: boolean;
    module: string;
    isRequired: boolean;
    /** Value is a secret (token/password/key): it is stored in the DB only and must never be shown in any UI or API output. */
    secret: boolean;
    /** Changing the value takes effect only after the application is restarted. */
    restartRequired: boolean;
    /** SHA-256 checksum of the JSON manifest that declared this setting. */
    manifestChecksum: string;
};
type attributes = typeof attributes & ORM;
/**
 * @deprecated use `SettingsRecord` instead
 */
interface Settings extends RequiredField<OptionalAll<attributes>, "key" | "type"> {
}
export interface SettingsRecord extends RequiredField<OptionalAll<attributes>, "key" | "type"> {
}
declare let Model: {
    beforeCreate: (record: SettingsRecord, cb: (err?: string) => void) => void;
    beforeUpdate: (record: SettingsRecord, cb: (err?: string) => void) => Promise<void>;
    afterUpdate: (record: SettingsRecord, cb: (err?: string) => void) => Promise<void>;
    afterCreate: (record: SettingsRecord, cb: (err?: string) => void) => Promise<void>;
    /** return setting value by unique key */
    use(key: string): Promise<SettingValue>;
    get<K extends keyof SettingList, T = SettingList[K]>(key: K): Promise<T | undefined>;
    set<K extends keyof SettingList>(key: K, settingsSetInput: SettingsSetInput<K, SettingList[K]>): Promise<Settings>;
    env<K extends keyof SettingList>(key: K): SettingList[K] | undefined;
    /**
     * Pull stored values for envMirroredSettings (e.g. JWT_SECRET) from the DB
     * into process.env on boot, so libraries reading process.env[key] directly
     * stay in sync with the value configured in Settings.
     * Does not overwrite process.env if it is already set (env takes priority).
     */
    syncEnvMirroredSettings(): Promise<void>;
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
    loadSettingsManifests(): Promise<void>;
    setDeclaredSetting: typeof setDeclaredSetting;
    isInDeclaredSettings: typeof isInDeclaredSettings;
    parseBoolean: typeof parseBoolean;
};
declare global {
    const Settings: typeof Model & ORMModel<SettingsRecord, "key" | "type">;
    interface SettingList {
        MODULE_STORAGE_LICENSE: string;
        /**
         * Allow settings without strict declaration presented in specification
          * */
        ALLOW_UNSAFE_SETTINGS: boolean;
        /**
         * Set visible: true for new dishes and groups from RMS sync
         * */
        VISIBLE_BY_DEFAULT_ON_SYNC: boolean;
        /**
         * Set enable: true for new dishes and groups from RMS sync
         * */
        ENABLE_BY_DEFAULT_ON_SYNC: boolean;
        /** Newly self-registered auth providers start disabled by default */
        DEFAULT_ENABLE_AUTH_PROVIDERS: boolean;
        /** Relax the User phone-required invariant for social-first login */
        ALLOW_USER_WITHOUT_PHONE: boolean;
        /** Public base URL used to build OAuth redirect_uri and post-login redirect */
        AUTH_CALLBACK_BASE_URL: string;
    }
}
interface SettingsSetInputBase<K extends string, F> {
    type?: SettingType;
    key?: `${K}`;
    appId?: string;
    jsonSchema?: any;
    name?: string;
    description?: string;
    tooltip?: string;
    uiSchema?: UISchema;
    readOnly?: boolean;
    isRequired?: boolean;
    /** Secret value: kept in the DB only, never exposed in UI/API output */
    secret?: boolean;
    /** Change takes effect only after an application restart */
    restartRequired?: boolean;
    /** SHA-256 checksum of the JSON manifest that declared this setting. */
    manifestChecksum?: string;
}
type SettingsSetInput<K extends string, F> = ({
    value: F;
    defaultValue?: F;
} & SettingsSetInputBase<K, F>) | ({
    value?: F;
    defaultValue: F;
} & SettingsSetInputBase<K, F>);
export {};
