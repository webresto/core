import HookTools from "../libs/hookTools";
import { resolve } from "path";
import afterHook from "./afterHook";
import * as _ from "lodash";

export default function ToInitialize(sails) {
  /**
   * Required hooks
   */
  const requiredHooks = ["blueprints", "http", "orm", "policies", "stateflow"];

  return function initialize(cb) {
    // Disable blueprints magic
    if (process.env.BLUEPRINTS_SECURITY_OFF !== "TRUE") {
      sails.log.info("Blueprints rest/shortcuts magic is OFF");
      sails.config.blueprints.shortcuts = false;
      sails.config.blueprints.rest = false;
    }

    if (sails.config.restocore.stateflow) sails.config.stateflow = _.merge(sails.config.stateflow, sails.config.restocore.stateflow);

    /**
     * AFTER OTHERS HOOKS
     */
    HookTools.waitForHooks("restocore", requiredHooks, afterHook);

    /**
     * Bind models
     */
    HookTools.bindModels(resolve(__dirname, "../models")).then(cb);
  };
}
