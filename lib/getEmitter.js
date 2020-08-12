"use strict";
exports.__esModule = true;
var AwaitEmitter_1 = require("./AwaitEmitter");
var emitter;
function getEmitter() {
    if (!emitter) {
        emitter = new AwaitEmitter_1["default"]('core', sails.config.restocore.awaitEmitterTimeout || 2000);
    }
    return emitter;
}
exports["default"] = getEmitter;
