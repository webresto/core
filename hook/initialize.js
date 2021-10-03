"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hookTools_1 = require("../libs/hookTools");
const path_1 = require("path");
const afterHook_1 = require("./afterHook");
const _ = require("lodash");
function ToInitialize(sails) {
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
        if (sails.config.restocore.stateflow)
            sails.config.stateflow = _.merge(sails.config.stateflow, sails.config.restocore.stateflow);
        /**
         * AFTER OTHERS HOOKS
         */
        try {
            hookTools_1.default.waitForHooks("restocore", requiredHooks, afterHook_1.default);
        }
        catch (error) {
            console.log(error);
        }
        /**
         * Bind models
         */
        hookTools_1.default.bindModels(path_1.resolve(__dirname, "../models")).then(cb);
    };
}
exports.default = ToInitialize;
