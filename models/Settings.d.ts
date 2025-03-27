/**
 * Attention! We use MM "Settings" model in production mode, but for tests and core integrity, we support this model
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
    beforeUpdate: (record: SettingsRecord, cb: (err?: string) => void) => any;
    afterUpdate: (record: SettingsRecord, cb: (err?: string) => void) => any;
    afterCreate: (record: SettingsRecord, cb: (err?: string) => void) => any;
    /** return setting value by unique key */
    use(key: string): Promise<SettingValue>;
    get<K extends keyof SettingList, T = SettingList[K]>(key: K): Promise<T | undefined>;
    set<K extends keyof SettingList>(key: K, settingsSetInput: SettingsSetInput<K, SettingList[K]>): Promise<Settings>;
};
declare global {
    const Settings: typeof Model & ORMModel<SettingsRecord, "key" | "type">;
    interface SettingList {
        MODULE_STORAGE_LICENSE: string;
        /**
         * Allow settings without strict declaration presented in specification
         * */
        ALLOW_UNSAFE_SETTINGS: boolean;
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
}
type SettingsSetInput<K extends string, F> = ({
    value: F;
    defaultValue?: F;
} & SettingsSetInputBase<K, F>) | ({
    value?: F;
    defaultValue: F;
} & SettingsSetInputBase<K, F>);
export {};
