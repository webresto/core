import AwaitEmitter from "@webresto/core/lib/AwaitEmitter";

let emitter: AwaitEmitter;

/**
 * Получение эмиттера ядра
 */
export default function getEmitter(): AwaitEmitter {
  if (!emitter) {
    emitter = new AwaitEmitter('core', sails.config.restocore.awaitEmitterTimeout || 2000);
  }
  return emitter;
}
