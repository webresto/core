import  HookTools from "../libs/hookTools";
import { resolve } from "path";
import afterHook from "./afterHook";
import * as _ from "lodash";
import bindAssets from "./bindAssets"
import bindDictonaries from "./bindDictonaries";
/**
 * Set global emmiter
 */
import getEmitter from "../libs/getEmitter";
// @ts-ignore
global.emitter = getEmitter();
   
/**
 * Set global NotificationManager
 */
import { NotificationManager } from "../libs/NotificationManager";
// @ts-ignore
global.NotificationManager = NotificationManager

/**
 * Set global NotificationManager
 */
import { Adapter } from "../adapters/index";
import bindAdminpanel from "./bindAdminpanel";
import bindLocales from "./bindLocales";
// @ts-ignore
global.Adapter = Adapter

export default function ToInitialize(sails: Sails) {
  /**
   * Required hooks
   */
  const requiredHooks = ["blueprints", "http", "orm", "policies", "stateflow"];
  
  return function initialize(cb) {
    sails.log.info(`RestoCore initialize from dir [${__dirname}]`)

    if(process.env.WEBRESTO_CORE_DISABLED){
      return cb();
    }

    // Disable blueprints magic
    if (process.env.BLUEPRINTS_SECURITY_OFF !== "TRUE") {
      sails.config.blueprints.shortcuts = false;
      sails.config.blueprints.rest = false;
      sails.log.info("Blueprints rest/shortcuts magic is OFF ");
    }

    if (sails.config.restocore.stateflow) sails.config.stateflow = _.merge(sails.config.stateflow, sails.config.restocore.stateflow);

    
    /**
     * AFTER OTHERS HOOKS
     */
    try {
      HookTools.waitForHooks("restocore", requiredHooks, afterHook);
    } catch (error) {
      sails.log.error(error)
    }

    // Bind assets
    bindAssets();

    // Bind dictonaries
    bindDictonaries();
    
    // Bind locales
    bindLocales();

    // Bind sails-adminpanel configuraton
    bindAdminpanel();

    // Bind models
    HookTools.bindModels(resolve(__dirname, "../models")).then(cb);
  };
}
