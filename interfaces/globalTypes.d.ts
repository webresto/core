import sails from "typed-sails";
import Config from "./Config";

type sailsConfig = typeof sails.config;

declare global {

  interface Sails extends sails.Sails {
    on: any
    emit: any
    router: any
    hooks: any
    models: any;
    config: _sailsConfig;
    log: any;
    after: any;
  }
  interface _sailsConfig extends sailsConfig {
    restocore: Config;
    [key:string]: any | object;
  }
  const sails: Sails;
  type ReqType = sails.Request;
  type ResType = sails.Response;
  type PropType<TObj, TProp extends keyof TObj> = TObj[TProp];
}
