import  HookTools from "../libs/hookTools";
import { resolve } from "path";
import afterHook from "./afterHook";
import * as _ from "lodash";
import bindAssets from "./bindAssets";
import bindDictionaries from "./bindDictionaries";
import { CartCleanup } from "../libs/CartCleanup";

/**
 * Set global emitter
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
 * Set global DialogBox
 */
import { DialogBox } from "../libs/DialogBox";
// @ts-ignore
global.DialogBox = DialogBox




import { Adapter } from "../adapters/index";
import bindLocales from "./bindLocales";
// @ts-ignore
global.Adapter = Adapter

export default function ToInitialize(sails: Sails) {
  /**
   * Required hooks
   */
  const requiredHooks = ["orm", "policies", "i18n"];

  return function initialize(cb: ()=>{}) {
    try {
      sails.log.info(`RestoCore initialize from dir [${__dirname}]`)
  
      if(process.env.WEBRESTO_CORE_DISABLED){
        return cb();
      }
  
      // Disable blueprints magic
      if (process.env.BLUEPRINTS_SECURITY_OFF !== "TRUE" && sails.config.blueprints) {
        sails.config.blueprints.shortcuts = false;
        sails.config.blueprints.rest = false;
        sails.log.info("Blueprints rest/shortcuts magic is OFF ");
      }
  
  
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
      bindDictionaries();
  
      // Bind locales
      bindLocales();
  
      // Bind sails-adminpanel configuraton
      try {
        const bindAdminpanel = require("./bindAdminpanel").default;
        bindAdminpanel();
      } catch (error) {
        sails.log.debug("Adminpanel bindings skipped", error);
      }
  
      // Bind models
      let modelsToSkip = process.env.CORE_MODELS_TO_SKIP !== undefined ? process.env.CORE_MODELS_TO_SKIP.split(";") : [];
      HookTools.bindModels(resolve(__dirname, "../models"), modelsToSkip).then(() => {
        CartCleanup.start();
        cb();
      });
    } catch (error) {
      sails.log.error(`Restocore initializer error`, error)      
    }
  };
}
