"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hookTools_1 = require("../libs/hookTools");
const path_1 = require("path");
const afterHook_1 = require("./afterHook");
const _ = require("lodash");
const bindAssets_1 = require("./bindAssets");
const bindDictonaries_1 = require("./bindDictonaries");
/**
 * Set global emmiter
 */
const getEmitter_1 = require("../libs/getEmitter");
// @ts-ignore
global.emitter = getEmitter_1.default();
/**
 * Set global NotificationManager
 */
const NotificationManager_1 = require("../libs/NotificationManager");
// @ts-ignore
global.NotificationManager = new NotificationManager_1.NotificationManager;
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
        // Bind assets
        bindAssets_1.default();
        // Bind dictonaries
        bindDictonaries_1.default();
        /**
         * Bind models
         */
        hookTools_1.default.bindModels(path_1.resolve(__dirname, "../models")).then(cb);
    };
}
exports.default = ToInitialize;
