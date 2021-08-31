import * as sails from 'typed-sails';
import Config from "../interfaces/Config";
declare type sailsConfig = typeof sails.config;
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
    type PropType<TObj, TProp extends keyof TObj> = TObj[TProp];
}
export {};
