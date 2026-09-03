import { v4 as uuid } from "uuid";
import { ObservablePromise } from "../../../libs/ObservablePromise";
import { Delivery } from "../..";
import { fetchKmlZones, KML_SOURCE_NAME } from "./kml";
import { DeliveryZoneImportService, ZoneImportResult } from "./zone-import";

/**
 * Running the zone sync.
 *
 * This service owns the schedule, the concurrency control and the import; the
 * KML side only fetches. That split is what keeps the fetch from growing its own
 * timer, its own database writes and its own idea of when a run is safe.
 *
 * `DeliveryZone` is the default adapter's model, so nothing here runs when
 * `DELIVERY_ADAPTER` points somewhere else: syncing a map another adapter never
 * reads would be work nobody asked for, against rows nobody consults.
 */

export type SyncReason = "manual" | "schedule" | "settings-change" | "startup";

export interface SyncRunOptions {
  reason: SyncReason;
  /** Produces the diff without writing anything. */
  dryRun?: boolean;
}

/** Why a run did not happen. `null` reason means it did. */
export interface SyncSkipped {
  skipped: true;
  reason:
    | "sync-disabled"
    | "not-the-default-adapter"
    | "already-running";
}

export type SyncOutcome = ZoneImportResult | SyncSkipped;

export function isSkipped(outcome: SyncOutcome): outcome is SyncSkipped {
  return (outcome as SyncSkipped).skipped === true;
}

/**
 * The floor under the synchronisation interval: zone sources change rarely and
 * rate limit, so five minutes is as often as this is worth asking.
 *
 * Applied when the interval is read, not when it is written, so a smaller value
 * already in the database is raised rather than refused.
 */
export const MIN_INTERVAL_SECONDS = 300;



/** One fetch: which city it covers, and the configuration to fetch it with. */
export interface SyncTarget {
  city: string | null;
  config: Record<string, any>;
}

/**
 * Turns `DELIVERY_ZONE_SYNC_CONFIG` into the list of fetches to perform.
 *
 * A single-city installation writes the source configuration flat, exactly as
 * before — `{ "url": "..." }` — and gets one fetch with no city. An installation
 * with several cities adds a `cities` list, and the keys outside it become
 * defaults each entry can override:
 *
 *     { "timeoutMs": 15000, "cities": [ { "city": "<id>", "url": "..." } ] }
 *
 * The city lives in the configuration rather than in the registry on purpose.
 * Two *modules* claiming to be the zone source is a conflict; two *cities* is one
 * source doing its job. Keying the registry by city would have brought hook load
 * order back into a decision that must not depend on it.
 */
export function syncTargets(config: Record<string, any>): SyncTarget[] {
  const cities = config?.cities;
  if (!Array.isArray(cities)) return [{ city: null, config: config ?? {} }];

  if (!cities.length) {
    throw new Error("DELIVERY_ZONE_SYNC_CONFIG has an empty cities list; remove it or add an entry");
  }

  const { cities: _ignored, ...shared } = config;
  const targets: SyncTarget[] = [];
  const seen = new Set<string>();

  for (const [index, entry] of cities.entries()) {
    if (!entry || typeof entry !== "object") {
      throw new Error(`DELIVERY_ZONE_SYNC_CONFIG cities[${index}] is not an object`);
    }

    const city = typeof entry.city === "string" ? entry.city.trim() : "";
    if (!city) {
      throw new Error(`DELIVERY_ZONE_SYNC_CONFIG cities[${index}] has no city`);
    }

    // Two entries for one city would run twice against the same rows, and the
    // second would mark everything the first imported as missing.
    if (seen.has(city)) {
      throw new Error(`DELIVERY_ZONE_SYNC_CONFIG lists city "${city}" twice`);
    }
    seen.add(city);

    targets.push({ city, config: { ...shared, ...entry } });
  }

  return targets;
}

/**
 * How one run names itself in the log: `kml` on a single-city install,
 * `kml:<cityId>` when cities are configured.
 *
 * It used to key a `DeliveryZoneSyncState` row. That model is gone — the journal
 * is the console now — and the string survives only as a label.
 */
export function runLabelOf(source: string, city: string | null): string {
  return city ? `${source}:${city}` : source;
}

function failedRun(source: string, city: string | null, dryRun: boolean, message: string): ZoneImportResult {
  return {
    source,
    city,
    dryRun,
    stats: { created: 0, updated: 0, unchanged: 0, missing: 0, failed: 0 },
    entries: [],
    errors: [message],
  };
}

export class DeliveryZoneSyncService {
  private static timer: ReturnType<typeof setInterval> | null = null;
  /** One run per process, so a second click joins the first run's promise. */
  private static running: ObservablePromise<SyncOutcome> | null = null;

  /**
   * The map link configured for each city, keyed by city id.
   *
   * `null` is the key of a single-city installation, which writes the
   * configuration flat and whose zones carry no city. An empty map means nothing
   * is synchronised anywhere and every polygon is the operator's to draw.
   *
   * This is what ownership is read from, so a malformed configuration must not
   * throw here: an operator mid-edit would otherwise find the zones page refusing
   * to render at all. The run itself still reports the error loudly.
   */
  public static async configuredSourceUrls(): Promise<Map<string | null, string>> {
    const urls = new Map<string | null, string>();

    let targets: SyncTarget[];
    try {
      targets = syncTargets(((await Settings.get("DELIVERY_ZONE_SYNC_CONFIG")) ?? {}) as Record<string, any>);
    } catch {
      return urls;
    }

    for (const target of targets) {
      const url = target.config?.url;
      if (typeof url === "string" && url.trim()) urls.set(target.city, url.trim());
    }

    return urls;
  }


  public static async intervalSeconds(): Promise<number> {
    const configured = await Settings.get("DELIVERY_ZONE_SYNC_INTERVAL_SECONDS");
    const seconds = typeof configured === "number" && Number.isFinite(configured) ? configured : 3600;
    return Math.max(seconds, MIN_INTERVAL_SECONDS);
  }

  /**
   * Starts the schedule if, and only if, this install actually has a zone
   * source and asked for it. An install with hand-made zones creates no timer.
   */
  public static async start(): Promise<void> {
    this.stop();

    // Says why on every outcome. "My zones are not updating" is otherwise
    // answered by reading three settings and guessing which one is at fault.
    if (!(await Delivery.isDefault())) {
      sails.log.debug("CORE > zone sync > delivery is served by another adapter, schedule not started");
      return;
    }

    const enabled = (await Settings.get("DELIVERY_ZONE_SYNC_ENABLED")) === true;
    if (!enabled) {
      sails.log.debug("CORE > zone sync > DELIVERY_ZONE_SYNC_ENABLED is off, no schedule started");
      return;
    }

    if (!(await this.configuredSourceUrls()).size) {
      sails.log.debug("CORE > zone sync > no city has a map link, schedule not started");
      return;
    }

    const seconds = await this.intervalSeconds();
    this.timer = setInterval(() => {
      this.run({ reason: "schedule" }).catch((error) => {
        sails.log.error("CORE > zone sync > scheduled run failed", error);
      });
    }, seconds * 1000);

    sails.log.debug(`CORE > zone sync > scheduled every ${seconds}s`);

    if ((await Settings.get("DELIVERY_ZONE_SYNC_ON_START")) === true) {
      this.run({ reason: "startup" }).catch((error) => {
        sails.log.error("CORE > zone sync > startup run failed", error);
      });
    }
  }

  public static stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Whether a run is in flight in this process. */
  public static isRunning(): boolean {
    return this.running !== null && this.running.status === "pending";
  }

  /**
   * The single entry point: admin button, schedule, settings change or startup.
   */
  public static async run(options: SyncRunOptions): Promise<SyncOutcome> {
    if (this.isRunning()) {
      sails.log.debug(`CORE > zone sync > ${options.reason} run joined the run already in flight`);
      return this.running!.promise;
    }

    const promise = this.execute(options);
    this.running = new ObservablePromise(promise);
    return promise;
  }

  private static async execute(options: SyncRunOptions): Promise<SyncOutcome> {
    const dryRun = options.dryRun === true;

    // A manual dry run is allowed while the schedule is off: that is how an
    // operator checks a source before switching anything on.
    if (!dryRun && options.reason !== "manual") {
      const enabled = (await Settings.get("DELIVERY_ZONE_SYNC_ENABLED")) === true;
      if (!enabled) return { skipped: true, reason: "sync-disabled" };
    }

    if (!(await Delivery.isDefault())) {
      return { skipped: true, reason: "not-the-default-adapter" };
    }

    const sourceName = KML_SOURCE_NAME;
    const config = ((await Settings.get("DELIVERY_ZONE_SYNC_CONFIG")) ?? {}) as Record<string, any>;

    let targets: SyncTarget[];
    try {
      targets = syncTargets(config);
    } catch (error) {
      return failedRun(sourceName, null, dryRun, error instanceof Error ? error.message : String(error));
    }

    const aggregate: ZoneImportResult = {
      source: sourceName,
      city: targets.length === 1 ? targets[0]!.city : null,
      dryRun,
      stats: { created: 0, updated: 0, unchanged: 0, missing: 0, failed: 0 },
      entries: [],
      errors: [],
    };

    for (const target of targets) {
      // One city at a time. A city whose map is unreachable must not stop the
      // others: on a multi-city installation that would mean one broken link
      // freezing every city's zones.
      const outcome = await this.executeCity(sourceName, target, dryRun, options);

      aggregate.stats.created += outcome.stats.created;
      aggregate.stats.updated += outcome.stats.updated;
      aggregate.stats.unchanged += outcome.stats.unchanged;
      aggregate.stats.missing += outcome.stats.missing;
      aggregate.stats.failed += outcome.stats.failed;
      aggregate.entries.push(...outcome.entries);
      aggregate.errors.push(...outcome.errors);
    }

    return aggregate;
  }

  /** One city: fetch, import, log. */
  private static async executeCity(
    sourceName: string,
    target: SyncTarget,
    dryRun: boolean,
    options: SyncRunOptions,
  ): Promise<ZoneImportResult> {
    // A label for the log, keyed on the source and the city — both known before
    // anything is downloaded, so an unreachable map still names itself.
    const runLabel = runLabelOf(sourceName, target.city);

    try {
      const snapshot = await fetchKmlZones(target.config);

      if (!snapshot?.source) {
        throw new Error("Zone snapshot does not name its source");
      }

      // The snapshot's `source` is what lands in `DeliveryZone.source`, and the
      // ownership rules compare that string against the same constant. Let the
      // two drift and every synchronised zone silently unlocks, while the next
      // run imports the same areas again under the other spelling.
      if (snapshot.source.trim().toLowerCase() !== sourceName) {
        throw new Error(
          `Zone source "${sourceName}" returned a snapshot labelled "${snapshot.source}"`,
        );
      }

      // Core decides which city a snapshot covers, not the source. A source that
      // returned the wrong city would take over another city's zones, and the
      // configuration is the only place that knows which document was asked for.
      const result = await DeliveryZoneImportService.apply(
        { ...snapshot, city: target.city },
        { dryRun },
      );

      if (!dryRun) {
        // The journal is the console, so it has to reach it: in the Sails scale
        // `debug` sits *above* `info`, and a stand set to `debug` — which is the
        // default — drops everything logged at `info`. That is why nothing here
        // uses `info`, however much these read like informational lines.
        //
        // A snapshot rejected by validation is not a success even though nothing
        // threw — the zones were left untouched on purpose — so the two cases
        // are still logged at different levels.
        if (result.errors.length) {
          sails.log.warn(
            `CORE > zone sync > "${runLabel}" finished with errors: ${result.errors.join("; ")}`,
            result.stats,
          );
        } else {
          sails.log.debug(`CORE > zone sync > "${runLabel}" finished`, result.stats);
        }
      }

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      // No special case for `DeliveryCapabilityError` any more: a source that is
      // in the registry has already declared itself able, so refusing mid-run is
      // a fault to record, not a configuration to shrug at.
      //
      // A failed fetch changes no zone. That is the guarantee: bad KML, a
      // network error or a repeated run all leave the map exactly as it was.
      sails.log.error(
        `CORE > zone sync > ${options.reason} run failed for "${runLabel}"`,
        error,
      );

      return failedRun(sourceName, target.city, dryRun, message);
    }
  }
}
