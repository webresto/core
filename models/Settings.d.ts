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
    value: string;
    /** Секция, к которой относится свойство */
    section: string;
    /** Источника происхождения */
    from: string;
};
declare type Settings = typeof attributes & ORM;
export default Settings;
declare let Model: {
    /** retrun setting value by key */
    use(config: string, key: string): Promise<Settings>;
    /**
     * Проверяет существует ли настройка, если не сущестует, то создаёт новую и возвращает ее. Если существует, то обновляет его значение (value)
     * на новые. Также при первом внесении запишется параметр (config), отвечающий за раздел настройки.
     */
    set(key: string, value: string, config?: string): Promise<any>;
};
declare global {
    const Settings: typeof Model & ORMModel<Settings>;
}
