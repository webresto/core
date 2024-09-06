"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const hookTools_1 = __importDefault(require("../libs/hookTools"));
const path_1 = require("path");
const afterHook_1 = __importDefault(require("./afterHook"));
const _ = __importStar(require("lodash"));
const bindAssets_1 = __importDefault(require("./bindAssets"));
const bindDictionaries_1 = __importDefault(require("./bindDictionaries"));
/**
 * Set global emitter
 */
const getEmitter_1 = __importDefault(require("../libs/getEmitter"));
// @ts-ignore
global.emitter = (0, getEmitter_1.default)();
/**
 * Set global NotificationManager
 */
const NotificationManager_1 = require("../libs/NotificationManager");
// @ts-ignore
global.NotificationManager = NotificationManager_1.NotificationManager;
/**
 * Set global DialogBox
 */
const DialogBox_1 = require("../libs/DialogBox");
// @ts-ignore
global.DialogBox = DialogBox_1.DialogBox;
const index_1 = require("../adapters/index");
const bindAdminpanel_1 = __importDefault(require("./bindAdminpanel"));
const bindLocales_1 = __importDefault(require("./bindLocales"));
// @ts-ignore
global.Adapter = index_1.Adapter;
function ToInitialize(sails) {
    /**
     * Required hooks
     */
    const requiredHooks = ["orm", "policies", "stateflow", "i18n"];
    return function initialize(cb) {
        try {
            sails.log.info(`RestoCore initialize from dir [${__dirname}]`);
            if (process.env.WEBRESTO_CORE_DISABLED) {
                return cb();
            }
            // Disable blueprints magic
            if (process.env.BLUEPRINTS_SECURITY_OFF !== "TRUE" && sails.config.blueprints) {
                sails.config.blueprints.shortcuts = false;
                sails.config.blueprints.rest = false;
                sails.log.info("Blueprints rest/shortcuts magic is OFF ");
            }
            if (sails.config.restocore.stateflow) { // @ts-ignore
                sails.config.stateflow = _.merge(sails.config.stateflow, sails.config.restocore.stateflow);
            }
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
            (0, bindAssets_1.default)();
            // Bind dictonaries
            (0, bindDictionaries_1.default)();
            // Bind locales
            (0, bindLocales_1.default)();
            // Bind sails-adminpanel configuraton
            (0, bindAdminpanel_1.default)();
            // Bind models
            let modelsToSkip = process.env.CORE_MODELS_TO_SKIP !== undefined ? process.env.CORE_MODELS_TO_SKIP.split(";") : [];
            hookTools_1.default.bindModels((0, path_1.resolve)(__dirname, "../models"), modelsToSkip).then(cb);
        }
        catch (error) {
            sails.log.error(`Restocore initializer error`, error);
        }
    };
}
exports.default = ToInitialize;
