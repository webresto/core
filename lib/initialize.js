"use strict";
exports.__esModule = true;
var hookTools_1 = require("./hookTools");
var path_1 = require("path");
var afterHook_1 = require("./afterHook");
var Bluebird = require("bluebird");
global.Promise = Bluebird;
var State = require('sails-hook-stateflow').State;
function ToInitialize(sails) {
    var requiredHooks = [
        'blueprints',
        'http',
        'orm',
        'policies'
    ];
    return function initialize(cb) {
        if (!hookTools_1["default"].checkConfig('restocore')) {
            return cb();
        }
        hookTools_1["default"].waitForHooks('restocore', requiredHooks, afterHook_1["default"]);
        sails.stateflow = [
            new State('CART', ['CHECKOUT'], function (cb) {
                cb(null, true);
            }),
            new State('CHECKOUT', ['ORDER', 'PAYMENT', 'CART'], function (cb) {
                cb(null, true);
            }),
            new State('PAYMENT', ['ORDER', 'CHECKOUT'], function (cb) {
                cb(null, true);
            }),
            new State('ORDER', [], function (cb) {
                cb(null, true);
            })
        ];
        hookTools_1["default"].bindModels(path_1.resolve(__dirname, '../models')).then(cb);
    };
}
exports["default"] = ToInitialize;
;
