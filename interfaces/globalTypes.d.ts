import sails from "@42pub/typed-sails";
import Config from "./Config";
import AwaitEmitter from "../libs/AwaitEmitter";
type sailsConfig = typeof sails.config;
import { NotificationManager } from "../libs/NotificationManager";
interface RestocoreHook {
    dictionaries: {
        countries: {
            [key: string]: {
                phoneCode: string;
                iso: string;
                name: string;
                nativeCountryName: string;
                language: string[];
                currency: string;
                currencySymbol: string;
                currencyISO: string;
                currencyUnit: string;
                currencyDenomination: number;
                phoneMask: string[];
                flag: string;
            };
        };
    };
    [key: string]: any | object | Function;
}
interface SailsHooks {
    restocore: RestocoreHook;
    [key: string]: any | object | Function;
}
declare global {
    const emitter: AwaitEmitter;
    const NotificationManager: NotificationManager;
    const Adapter: typeof import("../adapters").Adapter;
    interface Sails extends sails.Sails {
        on: any;
        emit: any;
        router: any;
        hooks: SailsHooks;
        models: any;
        config: _sailsConfig;
        log: any;
        after: any;
    }
    interface _sailsConfig extends sailsConfig {
        restocore: Config;
        [key: string]: any | object;
    }
    const sails: Sails;
    type ReqType = sails.Request;
    type ResType = sails.Response;
    type PropType<TObj, TProp extends keyof TObj> = TObj[TProp];
}
export {};
