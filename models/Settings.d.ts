import ORM from "../interfaces/ORM";
import ORMModel from "../interfaces/ORMModel";
declare let attributes: {
    /**Id */
    id: string;
    /** Ключ доступа к свойству */
    key: string;
    /** Описание */
    description: string;
    /** Значение свойства */
    value: any;
    /** Секция, к которой относится свойство */
    section: string;
    /** Источника происхождения */
    from: string;
};
declare type attributes = typeof attributes;
interface Settings extends attributes, ORM {
}
export default Settings;
declare let Model: {
    afterUpdate: (record: any, proceed: any) => any;
    afterCreate: (record: any, proceed: any) => any;
    /** retrun setting value by key */
    use(key: string, from?: string): Promise<any>;
    /** ⚠️ Experemental! Read setting from memory store */
    get(key: string): any;
    /**
     * Проверяет существует ли настройка, если не сущестует, то создаёт новую и возвращает ее. Если существует, то обновляет его значение (value)
     * на новые. Также при первом внесении запишется параметр (config), отвечающий за раздел настройки.
     */
    set(key: string, value: any, from?: string): Promise<any>;
};
declare global {
    namespace NodeJS {
        const Settings: typeof Model & ORMModel<Settings>;
    }
}
