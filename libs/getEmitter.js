"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AwaitEmitter_1 = require("./AwaitEmitter");
let emitter;
/**
 * Получение эмиттера ядра
 */
function getEmitter() {
    if (!emitter) {
        const awaitEmitterTimeout = sails.config.restocore ? sails.config.restocore.awaitEmitterTimeout || 60000 : 60000;
        emitter = new AwaitEmitter_1.default("core", parseInt(awaitEmitterTimeout));
    }
    return emitter;
}
exports.default = getEmitter;
