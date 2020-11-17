import * as sails from 'typed-sails';
import Config from "../modelsHelp/Config";
declare type sailsConfig = typeof sails.config;
interface A<T> extends Array<T> {
    add(id: any): void;
    remove(id: any): void;
}
declare global {
    interface Sails extends sails.Sails {
        config: SailsConfig;
        iikoFail: boolean;
    }
    interface SailsConfig extends sailsConfig {
        restocore: Config;
    }
    const sails: Sails;
    type ReqType = sails.Request;
    type ResType = sails.Response;
    type Association<T> = A<T>;
    type PropType<TObj, TProp extends keyof TObj> = TObj[TProp];
}
export {};
