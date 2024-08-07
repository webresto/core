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
interface Settings extends RequiredField<OptionalAll<attributes>, "key" | "type"> {
}
export default Settings;
declare let Model: {
    beforeCreate: (record: Settings, cb: (err?: string) => void) => void;
    beforeUpdate: (record: Settings, cb: (err?: string) => void) => Promise<void>;
    afterUpdate: (record: Settings, cb: (err?: string) => void) => Promise<void>;
    afterCreate: (record: Settings, cb: (err?: string) => void) => Promise<void>;
    /** return setting value by unique key */
    use(key: string): Promise<SettingValue>;
    get<K extends keyof SettingList, T = SettingList[K]>(key: K): Promise<T>;
    set<K_1 extends keyof SettingList>(key: K_1, settingsSetInput: SettingsSetInput<K_1, SettingList[K_1]>): Promise<Settings>;
};
declare global {
    const Settings: typeof Model & ORMModel<Settings, "key" | "type">;
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
