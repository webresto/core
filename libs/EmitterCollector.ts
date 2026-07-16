/**
 * Factory for emitter-backed collection stores.
 *
 * A collection store lets modules *provide* data without anyone knowing they
 * exist: the owner declares an event, modules subscribe to it, and the store
 * polls them live on every read. Because collection is a pull at emit time
 * rather than a push at load time, module load order is irrelevant — a module
 * that subscribes later is simply picked up by the next collect().
 *
 * This is the second use of the pattern (admin-frontend's SnippetProvider was
 * the first), so the mechanics live here once: declare, emit, drop errored and
 * timed-out subscribers, normalize, and de-duplicate.
 */

export interface EmitterCollectorOptions<T> {
  /** Event modules subscribe to, e.g. `admin-panel:collect-links`. */
  event: string;
  /** Shown in the emitter's declarations list. */
  description: string;
  /**
   * Turn one raw provided item into a stored item, or return null to drop it.
   * `subscriberId` is the id the module passed to `emitter.on`, so it can stand
   * in for an omitted module name.
   */
  normalize: (raw: any, subscriberId: string) => T | null;
  /** Stable id used to drop duplicates — the first provider of an id wins. */
  idOf: (item: T) => string;
  /** Overrides the emitter's default per-subscriber timeout (1000 ms). */
  timeout?: number;
}

export class EmitterCollector<T> {
  private declared = false;

  constructor(private readonly options: EmitterCollectorOptions<T>) {}

  private log(): any {
    return typeof sails !== "undefined" ? sails.log : console;
  }

  /**
   * Read the bare `emitter` global (set by hook/initialize.ts) rather than
   * calling getEmitter() here. Under the app's tsx runtime, getEmitter() can
   * resolve to a different loaded instance (CJS/ESM dual-loading) and silently
   * hand back a separate emitter with no subscribers. Modules subscribe through
   * the same global, so reading it guarantees we see them.
   */
  private bus(): any {
    return typeof emitter !== "undefined" ? emitter : undefined;
  }

  /** Declare the event so it shows up in the system event list. Best-effort. */
  public declare(): void {
    if (this.declared) return;
    const bus = this.bus();
    if (!bus || typeof bus.declare !== "function") return;
    try {
      bus.declare(this.options.event as any, this.options.description);
      this.declared = true;
    } catch (e) {
      /* declare is best-effort */
    }
  }

  /**
   * Subscribe a provider. Modules normally call `emitter.on` themselves; this is
   * a convenience for providers that already hold the store.
   *
   * AwaitEmitter.on takes (name, id, handler) — the subscriber id is required,
   * omit it and the handler lands in the id slot and throws at emit time.
   */
  public provide(subscriberId: string, handler: () => T | T[] | Promise<T | T[]>): void {
    const bus = this.bus();
    if (!bus || typeof bus.on !== "function") return;
    this.declare();
    bus.on(this.options.event as any, subscriberId, handler as any);
  }

  /**
   * Poll every subscribed module. Runs live on every call, so nothing is cached
   * and a module that stops answering simply drops out of the result.
   * Subscribers that throw or time out are omitted rather than failing the read.
   */
  public async collect(): Promise<T[]> {
    const bus = this.bus();
    if (!bus || typeof bus.emit !== "function") return [];
    this.declare();

    let responses: any[];
    try {
      const args: any[] = [this.options.event];
      if (this.options.timeout !== undefined) args.push(this.options.timeout);
      responses = await bus.emit.apply(bus, args);
    } catch (e) {
      this.log().error(`[EmitterCollector] emit failed for [${this.options.event}]:`, e);
      return [];
    }

    const collected: T[] = [];
    const seen: { [id: string]: true } = {};
    for (const res of responses || []) {
      if (!res || res.state !== "success") continue; // skip errored / timed-out subscribers
      const items = Array.isArray(res.result) ? res.result : res.result ? [res.result] : [];
      for (const raw of items) {
        const item = this.options.normalize(raw, res.id);
        if (!item) continue;
        const id = this.options.idOf(item);
        if (!id || seen[id]) continue; // first provider wins on a duplicate id
        seen[id] = true;
        collected.push(item);
      }
    }
    return collected;
  }
}

/** Create a collection store for `options.event`. */
export function createEmitterCollector<T>(options: EmitterCollectorOptions<T>): EmitterCollector<T> {
  return new EmitterCollector<T>(options);
}
