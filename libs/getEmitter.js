"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = getEmitter;
const AwaitEmitter_1 = __importDefault(require("./AwaitEmitter"));
// Keyed off `global` rather than a module-scoped variable: under some runtimes
// (e.g. this app's tsx interpreter mixing ESM and CommonJS loading) the very
// same file can end up instantiated as two distinct module objects — a
// module-closure singleton would then silently split into two independent
// emitters, and subscribers registered through one copy are invisible to
// `emit()` calls made through the other (no error either side, just no
// subscribers found). Storing the instance on `global` guarantees every copy
// of this module reads/writes the exact same object regardless of how many
// times the module itself gets loaded.
const GLOBAL_KEY = "__webrestoCoreEmitter";
/**
 * Getting the core emitter
 */
function getEmitter() {
    const g = global;
    if (!g[GLOBAL_KEY]) {
        const awaitEmitterTimeout = sails.config.restocore ? sails.config.restocore.awaitEmitterTimeout || 60000 : 60000;
        g[GLOBAL_KEY] = new AwaitEmitter_1.default("core", parseInt(awaitEmitterTimeout));
    }
    return g[GLOBAL_KEY];
}
