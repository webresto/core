import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import { RequiredField, OptionalAll } from "../interfaces/toolsTS";
type PlainValie = string | boolean | number | string[] | number[];
type SettingValue = PlainValie | {
    [key: string]: string | boolean | number;
};
declare let attributes: {
    /**Id */
    id: string;
    /** Ключ доступа к свойству */
    key: string;
    /** Описание */
    description: string;
    /** Значение свойства */
    value: SettingValue;
    /** Секция, к которой относится свойство */
    section: string;
    /** Источника происхождения */
    from: string;
    /** Only reading */
    readOnly: boolean;
};
type attributes = typeof attributes & ORM;
interface Settings extends RequiredField<OptionalAll<attributes>, "key" | "value"> {
}
export default Settings;
declare let Model: {
    beforeCreate: (record: Settings, cb: (err?: string) => void) => void;
    beforeUpdate: (record: Settings, cb: (err?: string) => void) => void;
    afterUpdate: (record: Settings, cb: (err?: string) => void) => void;
    afterCreate: (record: Settings, cb: (err?: string) => void) => void;
    /** retrun setting value by key */
    use(key: string, from?: string): Promise<SettingValue>;
    get(key: string): Promise<SettingValue>;
    /**
     * Проверяет существует ли настройка, если не сущестует, то создаёт новую и возвращает ее. Если существует, то обновляет его значение (value)
     * на новые. Также при первом внесении запишется параметр (config), отвечающий за раздел настройки.
     */
    set(key: string, value: any, from?: string, readOnly?: boolean): Promise<Settings>;
    setDefault(key: string, value: any, from?: string, readOnly?: boolean): Promise<void>;
};
declare global {
    const Settings: typeof Model & ORMModel<Settings, "key" | "value">;
}
