"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hookTools_1 = require("./hookTools");
const path_1 = require("path");
const afterHook_1 = require("./afterHook");
/**
 * SET BLUEBIRD AS GLOBAL PROMISE
 * Use @types/bluebird-global in devDep
 */
const Bluebird = require("bluebird");
global.Promise = Bluebird;
const State = require('sails-hook-stateflow').State;
/**
 * Initialize hook. If sails.config.restocore not exists hook will not be loaded.
 * Bind models.
 * @param sails
 * @constructor
 */
function ToInitialize(sails) {
    /**
     * List of hooks that required
     */
    const requiredHooks = [
        'blueprints',
        'http',
        'orm',
        'policies'
    ];
    return function initialize(cb) {
        /**
         * Small security fixes
         */
        if (process.env.BLUEPRINTS_SECURITY_OFF !== "TRUE") {
            sails.log.info("Security > blueprints rest/shortcuts is OFF ");
            //@ts-ignore
            sails.config.blueprints.shortcuts = false;
            //@ts-ignore
            sails.config.blueprints.rest = false;
        }
        /**
         * CONFIG
         */
        // If disabled. Do not load anything
        if (!hookTools_1.default.checkConfig('restocore')) {
           // return cb();
        }
        /**
         * AFTER OTHERS HOOKS
         */
        hookTools_1.default.waitForHooks('restocore', requiredHooks, afterHook_1.default);
        /**
         * Set cart states in sails-hook-stateflow
         * Эта штука не работает =) Дало заказать
         */
        sails.stateflow = [
            new State('CART', ['CHECKOUT'], function (cb) {
                cb(null, true);
            }),
            new State('CHECKOUT', ['ORDER', 'PAYMENT', 'CART'], function (cb) {
                /**
                 * CHECKOUT -> ORDER если тип платежной "promise", или отсутствует
                 * CHECKOUT -> CART  В любой момент (без условий)
                 * CHECKOUT -> PAYMENT  Если тип платежной системы "ixternal" || "internal".
                 */
                cb(null, true);
            }),
            new State('PAYMENT', ['ORDER', 'CHECKOUT'], function (cb) {
                /**
                 * PAYMENT -> ORDER при успешной оплате.
                 * PAYMENT -> CHECKOUT при неуспешной оплате
                 */
                cb(null, true);
            }),
            new State('ORDER', [], function (cb) {
                cb(null, true);
            })
        ];
        /**
         * MODELS
         */
        hookTools_1.default.bindModels(path_1.resolve(__dirname, '../models')).then(cb);
    };
}
exports.default = ToInitialize;
;
