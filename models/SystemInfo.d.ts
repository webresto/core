/**
 * @api {API} SystemInfo SystemInfo
 * @apiGroup Models
 * @apiDescription Системная информация (в данный момент ревизия)
 *
 * @apiParam {Integer} id ID
 * @apiParam {String} key Ключ доступа к свойству
 * @apiParam {String} value Значение свойства
 * @apiParam {String} section Секция, к которой относится свойство
 */
import ORM from "@webresto/core/modelsHelp/ORM";
import ORMModel from "@webresto/core/modelsHelp/ORMModel";
import Config from "@webresto/core/modelsHelp/Config";
/**
 * Описывает одно поле конфига, его значение, ключ и откуда оно было взято
 */
export default interface SystemInfo extends ORM {
    id: number;
    key: string;
    value: string;
    section: string;
}
declare type config = typeof sails.config;
/**
 * Описывает класс конфигурации
 */
export interface SystemInfoModel extends ORMModel<SystemInfo> {
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
}
declare global {
    const SystemInfo: SystemInfoModel;
}
export {};
