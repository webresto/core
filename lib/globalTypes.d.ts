import * as sailsParent from 'typed-sails';
import Config from "@webresto/core/modelsHelp/Config";
declare type sailsConfig = typeof sailsParent.sails.config;
interface A<T> extends Array<T> {
    add(id: any): void;
    remove(id: any): void;
}
declare global {
    interface Sails extends sailsParent.sails.Sails {
        config: SailsConfig;
        iikoFail: boolean;
    }
    interface SailsConfig extends sailsConfig {
        restocore: Config;
    }
    const sails: Sails;
    type ReqType = sailsParent.sails.Request;
    type ResType = sailsParent.sails.Response;
    type Association<T> = A<T>;
    type PropType<TObj, TProp extends keyof TObj> = TObj[TProp];
}
export {};
