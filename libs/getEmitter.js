"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AwaitEmitter_1 = require("./AwaitEmitter");
let _emitter;
/**
 * Получение эмиттера ядра
 */
function emitter() {
    if (!_emitter) {
        const awaitEmitterTimeout = sails.config.restocore ? sails.config.restocore.awaitEmitterTimeout || 60000 : 60000;
        _emitter = new AwaitEmitter_1.default("core", awaitEmitterTimeout);
    }
    return _emitter;
}
exports.default = emitter;
