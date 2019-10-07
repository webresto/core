const AwaitEventEmitter = require('await-event-emitter');

export default class Emitter {
  private static emitter;

  public static async emit(type: string, ...args: any): Promise<boolean> {
    if (!this.emitter) {
      this.emitter = new AwaitEventEmitter();
    }
    return this.emitter.emit.call(this.emitter, type, args);
  }

  public static async on(type: string, fn: Function): Promise<any> {
    if (!this.emitter) {
      this.emitter = new AwaitEventEmitter();
    }
    return this.emitter.on(type, fn);
  }
}
