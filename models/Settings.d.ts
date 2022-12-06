import ORM from "../interfaces/ORM";
import ORMModel from "../interfaces/ORMModel";
declare type Value = {
    [key: string]: string | boolean | number;
} | string | boolean | number | string[] | number[];
declare let attributes: {
    /**Id */
    id: string;
    /** Ключ доступа к свойству */
    key: string;
    /** Описание */
    description: string;
    /** Значение свойства */
    value: Value;
    /** Секция, к которой относится свойство */
    section: string;
    /** Источника происхождения */
    from: string;
};
declare type attributes = typeof attributes & ORM;
interface Settings extends attributes {
}
export default Settings;
declare let Model: {
    afterUpdate: (record: any, proceed: any) => any;
    afterCreate: (record: any, proceed: any) => any;
    /** retrun setting value by key */
    use(key: string, from?: string): Promise<Value>;
    get(key: string): Promise<Value>;
    /**
     * Проверяет существует ли настройка, если не сущестует, то создаёт новую и возвращает ее. Если существует, то обновляет его значение (value)
     * на новые. Также при первом внесении запишется параметр (config), отвечающий за раздел настройки.
     */
    set(key: string, value: any, from?: string): Promise<Settings>;
};
declare global {
    const Settings: typeof Model & ORMModel<Settings>;
}
