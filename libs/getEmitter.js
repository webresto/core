"use strict";
/**
 * DEPRECATED
 */
Object.defineProperty(exports, "__esModule", { value: true });
const AwaitEmitter_1 = require("./AwaitEmitter");
let emitter;
/**
 * Получение эмиттера ядра
 */
function getEmitter() {
    if (!emitter) {
        emitter = new AwaitEmitter_1.default('core', sails.config.restocore.awaitEmitterTimeout);
    }
    return emitter;
}
exports.default = getEmitter;
