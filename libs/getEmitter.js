"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = getEmitter;
const AwaitEmitter_1 = __importDefault(require("./AwaitEmitter"));
let emitter;
/**
 * Getting the core emitter
 */
function getEmitter() {
    if (!emitter) {
        const awaitEmitterTimeout = sails.config.restocore ? sails.config.restocore.awaitEmitterTimeout || 60000 : 60000;
        emitter = new AwaitEmitter_1.default("core", parseInt(awaitEmitterTimeout));
    }
    return emitter;
}
