"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hookTools_1 = require("../libs/hookTools");
const path_1 = require("path");
const afterHook_1 = require("./afterHook");
const _ = require("lodash");
const getEmitter_1 = require("../libs/getEmitter");
// @ts-ignore
global.emitter = (0, getEmitter_1.default)();
function ToInitialize(sails) {
    /**
     * Required hooks
     */
    const requiredHooks = ["blueprints", "http", "orm", "policies", "stateflow"];
    return function initialize(cb) {
        if (process.env.WEBRESTO_CORE_DISABLED) {
            return cb();
        }
        // Disable blueprints magic
        if (process.env.BLUEPRINTS_SECURITY_OFF !== "TRUE") {
            sails.config.blueprints.shortcuts = false;
            sails.config.blueprints.rest = false;
            sails.log.info("Blueprints rest/shortcuts magic is OFF ");
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
            sails.log.error(error);
        }
        /**
         * Bind models
         */
        hookTools_1.default.bindModels((0, path_1.resolve)(__dirname, "../models")).then(cb);
    };
}
exports.default = ToInitialize;
