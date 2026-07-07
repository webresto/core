import AwaitEmitter from "./AwaitEmitter";

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
export default function getEmitter(): AwaitEmitter {
  const g = global as unknown as { [GLOBAL_KEY]?: AwaitEmitter };
  if (!g[GLOBAL_KEY]) {
    const awaitEmitterTimeout = sails.config.restocore ? sails.config.restocore.awaitEmitterTimeout || 60000 : 60000;
    g[GLOBAL_KEY] = new AwaitEmitter("core", parseInt(awaitEmitterTimeout as string));
  }
  return g[GLOBAL_KEY];
}
