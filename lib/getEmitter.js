"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AwaitEmitter_1 = require("./AwaitEmitter");
let emitter;
function getEmitter() {
    if (!emitter) {
        emitter = new AwaitEmitter_1.default('core', sails.config.restocore.awaitEmitterTimeout || 2000);
    }
    return emitter;
}
exports.default = getEmitter;
