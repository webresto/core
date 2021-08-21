/**
 * @api {API} Settings Settings
 * @apiGroup Models
 * @apiDescription Системная информация (в данный момент ревизия)
 *
 * @apiParam {Integer} id ID
 * @apiParam {String} key Ключ доступа к свойству
 * @apiParam {String} value Значение свойства
 * @apiParam {String} section Секция, к которой относится свойство
 */
import ORM from "../interfaces/ORM";
import ORMModel from "../interfaces/ORMModel";
import Config from "../interfaces/Config";
/**
 * Описывает одно поле конфига, его значение, ключ и откуда оно было взято
 */
export default interface Settings extends ORM {
    id: number;
    key: string;
    value: string;
    section: string;
}
declare type config = typeof sails.config;
/**
 * Описывает класс конфигурации
 */
export interface SettingsModel extends ORMModel<Settings> {
    /**
     * Отдаёт запрашиваемый ключ из запрашиваемого конфига. Если ключ, который запрашивается, отсуствует в базе, то данные
     * будут взяты из sails.config[config][key] и записаны в базу. При последующих запросах того же ключа будут возвращаться данные
     * из базы данных. Если указать только один параметр ключ, то данные будут доставаться из sails.config.restocore[key].
     * @param key - ключ
     * @return найденное значение или 0, если значение не было найдено.
     */
    use<T extends keyof Config>(key: T): Promise<PropType<Config, T>>;
    /**
     * Отдаёт запрашиваемый ключ из запрашиваемого конфига. Если ключ, который запрашивается, отсуствует в базе, то данные
     * будут взяты из sails.config[config][key] и записаны в базу. При последующих запросах того же ключа будут возвращаться данные
     * из базы данных. Если указать только один параметр ключ, то данные будут доставаться из sails.config.restocore[key].
     * @param config - конфиг откуда доставать ключ
     * @param key - ключ, если не указывать второй параметр, то первый будет считаться за ключ
     * @return найденное значение или 0, если значение не было найдено.
     */
    use<T extends keyof config[U], U extends keyof config>(config: U, key: T): Promise<PropType<config[U], T>>;
    use(key: string): Promise<any>;
    use(config: string, key: string): Promise<any>;
    /**
     * Проверяет существует ли настройка, если не сущестует, то создаёт новую и возвращает ее. Если существует, то обновляет его значение (value)
     * на новые. Также при первом внесении запишется параметр (config), отвечающий за раздел настройки.
     * @param values
     * @return обновлённое или созданное блюдо
     */
    set(key: string, value: string | number | boolean, config?: string): Promise<any>;
}
declare global {
    const Settings: SettingsModel;
}
export {};
