import AwaitEmitter from "./AwaitEmitter";

let emitter: AwaitEmitter;

/**
 * Получение эмиттера ядра
 */
export default function getEmitter(): AwaitEmitter {
  if (!emitter) {
    const awaitEmitterTimeout = sails.config.restocore ? sails.config.restocore.awaitEmitterTimeout || 60000 : 60000;
    emitter = new AwaitEmitter("core", awaitEmitterTimeout);
  }
  return emitter;
}
