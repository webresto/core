import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import { v4 as uuid } from "uuid";
import { WorkTime } from "@webresto/worktime";
import { DishRecord } from "./Dish";
import { CityRecord } from "./City";
import { invalidateDeliveryZoneCache } from "../adapters/delivery/default/zone-cache";
import { isValidPolygon } from "../adapters/delivery/default/zone-match";

/**
 * A delivery zone: a polygon plus the commercial terms that apply inside it.
 *
 * The attribute list below is the schema the legacy `modules/delivery-zones`
 * created, extended with the two things core needs to own it: the kitchen the
 * zone belongs to (`city`) and where the polygon came from (`source`,
 * `externalId`, ...). Nothing was renamed or dropped, because migrations have to
 * keep working against a `deliveryzone` table that already exists in production.
 *
 * **Who may touch this model.** Only the delivery adapter and the things that
 * exist to serve it:
 *
 * - everything in `adapters/delivery/default/` — matching, pricing, the cache,
 *   the KML import and the sync;
 * - the admin page of the zones module (`delivery-zones-manager`), which is the
 *   only CRUD surface. There is deliberately no Adminizer model registration;
 * - the demo seed, which is a development tool we control.
 *
 * Nobody else — and in particular not `Order`. A zone is a transient of the
 * delivery calculation, not a property of an order: it is decided from the
 * address, it is reported back on `Delivery` (`zoneId`, `deliveryTimeMinutes`),
 * and storing a copy on the order only creates a second answer that goes stale
 * when the map is redrawn.
 *
 * Nothing enforces this — eslint does not run in this repository — so it is a
 * convention. It is also written down in CLAUDE.md.
 */

function toId(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (value && typeof value === "object" && typeof (value as { id?: unknown }).id === "string") {
    return (value as { id: string }).id.trim() || null;
  }
  return null;
}

let attributes = {
  id: {
    type: "string",
  } as unknown as string,

  name: "string",
  description: "string",

  /**
   * Legacy change-detection hash written by the old module's `createOrUpdate`.
   * Kept so an existing column is never orphaned; new code compares
   * `sourceHash` instead.
   */
  hash: "string",

  /** Lower values are matched first; the search stops at the first hit. */
  sortOrder: "number" as unknown as number,

  /**
   * Operator switch. A synchronisation never writes it on a row that already
   * exists; the one thing it decides is that an imported zone is created off.
   */
  enable: {
    type: "boolean",
    defaultsTo: true,
  } as unknown as boolean,

  /** When the zone accepts orders. Empty means "always". */
  worktime: "json" as unknown as WorkTime[],

  /**
   * The four commercial numbers, and all four are nullable.
   *
   * Empty is a state with a meaning of its own here — "this zone sets no
   * promise of its own", which is not the same statement as zero minutes or a
   * free delivery from nothing. It is also the state every one of them is in on
   * a zone that a layer prices, and on a zone the operator has just drawn.
   *
   * They came from the legacy schema without `allowNull`, and Waterline refuses
   * null on a plain `number`. The editor posts null for an empty field, so
   * creating a zone with any of them blank failed outright.
   */
  /** Baseline delivery promise of the zone, in minutes. */
  minDeliveryTime: {
    type: "number",
    allowNull: true,
  } as unknown as number | null,

  /** Orders below this total are not delivered to the zone. */
  minOrderTotal: {
    type: "number",
    allowNull: true,
  } as unknown as number | null,

  /** Orders from this total are delivered free of charge. */
  freeDeliveryFrom: {
    type: "number",
    allowNull: true,
  } as unknown as number | null,

  deliveryCost: {
    type: "number",
    allowNull: true,
  } as unknown as number | null,

  /**
   * A product charged instead of `deliveryCost`. The column has always been a
   * plain string; the association is declared for the admin panel picker.
   */
  deliveryItem: {
    model: "dish",
  } as unknown as DishRecord | string,

  /** Shown to the customer at checkout. */
  deliveryMessage: "string",

  /**
   * The polygon. Empty on a layer, which is a row that groups other rows.
   *
   * A layer is not a separate model: the tariff fields are the same fields, and
   * one table keeps the rule readable — a row with a `parent` takes its tariff
   * from that parent and ignores its own. Matching only ever looks at rows that
   * have a polygon, so a layer is never matched.
   */
  polygon: "json" as unknown as number[][],

  /**
   * The layer this zone belongs to, or `null`.
   *
   * One level deep. A layer has no parent of its own, and nothing reads a
   * grandparent: the rule is "if there is a parent, the tariff is the parent's",
   * and a chain would turn that one line into a walk.
   */
  // No `allowNull`: Waterline rejects that flag on associations, and a singular
  // association is nullable by default anyway.
  parent: {
    model: "deliveryzone",
  } as unknown as DeliveryZoneRecord | string | null,

  /**
   * On a layer: whether its delivery terms are the terms of its zones.
   *
   * A layer is two offers at once — a grouping, and a tariff every member
   * shares — and only the first is always wanted. A folder arriving from a KML
   * is a grouping the operator did not choose, and pricing five districts alike
   * because the map's author put them in one folder is not a decision anybody
   * made. So it is asked rather than assumed.
   *
   * On, which is the default, the seven term fields below come from the layer
   * and the zones' own copies are ignored. Off, the layer only groups, and each
   * zone is priced on its own.
   *
   * Meaningless on a zone: a row with a parent never lends its terms to
   * anything. `enable` and `sortOrder` are not governed by this — see
   * `findServing`, where each of the three rules is spelled out.
   */
  termsApplyToZones: {
    type: "boolean",
    defaultsTo: true,
  } as unknown as boolean,

  /**
   * The city this zone belongs to.
   *
   * `null` on a single-city installation, which is most of them, and the
   * matching code never filters on it there. It exists because zone sources are
   * per city — one KML per city — and because two cities routinely produce the
   * same external id: Google My Maps numbers placemarks per map, so without the
   * city in the identity the first district of one city and the first district
   * of another are the same zone.
   */
  // No `allowNull`: Waterline rejects that flag on associations, and a singular
  // association is nullable by default anyway.
  city: {
    model: "city",
  } as unknown as CityRecord | string | null,

  /** External system that owns the geometry, e.g. `kml`. `null` = local zone. */
  source: {
    type: "string",
    allowNull: true,
  } as unknown as string | null,

  /** Stable identifier of the zone inside `source`. Unique per source. */
  externalId: {
    type: "string",
    allowNull: true,
  } as unknown as string | null,

  /** Hash of the source-owned payload; equal hash means nothing to write. */
  sourceHash: {
    type: "string",
    allowNull: true,
  } as unknown as string | null,

  /** When the source itself says the zone last changed, if it says so at all. */
  sourceUpdatedAt: {
    type: "string",
    allowNull: true,
  } as unknown as string | null,

  /** When a snapshot last confirmed this zone. */
  lastSyncedAt: {
    type: "number",
    allowNull: true,
  } as unknown as number | null,



  /**
   * When a complete snapshot of `source` last came back without this zone.
   * Deleting is deliberately left to the operator: a renamed or re-keyed zone in
   * the source would otherwise silently destroy hand-made tariffs.
   */
  missingFromSourceAt: {
    type: "number",
    allowNull: true,
  } as unknown as number | null,

  customData: "json" as unknown as {
    [key: string]: string | boolean | number;
  } | string,

  createdAt: {
    type: "number",
    autoCreatedAt: true,
  } as unknown as number,

  updatedAt: {
    type: "number",
    autoUpdatedAt: true,
  } as unknown as number,
};

type attributes = typeof attributes;

/**
 * @deprecated use `DeliveryZoneRecord` instead
 */
interface DeliveryZone extends Partial<Omit<attributes, "createdAt" | "updatedAt">>, ORM {}
export interface DeliveryZoneRecord extends Partial<Omit<attributes, "createdAt" | "updatedAt">>, ORM {}
export default DeliveryZone;

// Which fields a source owns and which are the operator's is decided in
// `lib/delivery-zone-ownership.ts`. It cannot be stated here: the
// `module.exports = {...}` below replaces every named export of this file at
// runtime, so a constant declared in a model type-checks at the import site and
// arrives as `undefined`.

/**
 * What a layer owns and a polygon inherits.
 *
 * Kept as a list rather than "everything except geometry and identity": a field
 * added later must be a deliberate choice about who prices it, and a default of
 * "inherited" would silently move somebody's tariff.
 */
/**
 * What a layer lends its zones when `termsApplyToZones` is on.
 *
 * Terms only. `enable` and `sortOrder` used to be here and are not settings a
 * layer hands down — they are combined instead, in `findServing`.
 */
const INHERITED_FIELDS = [
  "worktime",
  "minDeliveryTime",
  "minOrderTotal",
  "freeDeliveryFrom",
  "deliveryCost",
  "deliveryItem",
  "deliveryMessage",
] as const;

function pickInheritedFields(layer: DeliveryZoneRecord): Partial<DeliveryZoneRecord> {
  const inherited: Partial<DeliveryZoneRecord> = {};
  for (const field of INHERITED_FIELDS) {
    (inherited as any)[field] = (layer as any)[field];
  }
  return inherited;
}

async function assertZone(record: Partial<DeliveryZoneRecord>): Promise<void> {
  // A layer has no shape, and "no shape" is written three ways: the column
  // absent, null, or an empty array — the last one is what the editor posts,
  // because a form sends every field it has. Only a non-empty polygon has to be
  // a ring; refusing the empty one meant no layer could be created from the
  // panel at all, while the import, which omits the column, was fine.
  const hasShape = Array.isArray(record.polygon) && record.polygon.length > 0;
  if (hasShape && !isValidPolygon(record.polygon)) {
    throw new Error("DeliveryZone polygon must be a ring of at least three distinct [lon, lat] points");
  }

  // One level, and it is checked rather than assumed: nesting a layer under a
  // layer would make "the tariff is the parent's" a walk instead of a lookup,
  // and the walk would price somebody's zones from a row they never opened.
  const parentId = record.parent === null ? null : toId(record.parent);
  if (parentId) {
    if (parentId === toId(record.id)) throw new Error("DeliveryZone cannot be its own layer");

    const layer = await DeliveryZone.findOne({ id: parentId });
    if (!layer) throw new Error(`DeliveryZone parent "${parentId}" does not exist`);
    if (toId(layer.parent)) throw new Error(`DeliveryZone parent "${parentId}" is itself inside a layer`);
    if (isValidPolygon(layer.polygon)) {
      throw new Error(`DeliveryZone parent "${parentId}" has a polygon, so it is a zone and not a layer`);
    }
  }

}

/**
 * `(source, city, externalId)` identifies a zone in its source and must stay
 * unique: a duplicate would make the next snapshot update an arbitrary one of
 * the two and leave the other frozen.
 *
 * The city is part of the identity because sources are per city. Google My Maps
 * numbers placemarks per map, so the same `externalId` arriving from two cities'
 * documents is the norm, not a collision.
 *
 * This check is the only owner of the rule: there is no database index behind
 * it, and none is needed — imports of one source run one at a time. The
 * comparison is done in JavaScript rather than in the query because "no city"
 * reaches the datastore as `null` from one path and `undefined` from another,
 * and those must count as the same city.
 */
async function assertUniqueExternalId(record: Partial<DeliveryZoneRecord>): Promise<void> {
  if (!record.source || !record.externalId) return;

  const city = toId(record.city);
  const clashes = (await DeliveryZone.find({
    source: record.source,
    externalId: record.externalId,
  })) as DeliveryZoneRecord[];

  if (clashes.some((zone) => toId(zone.city) === city)) {
    throw new Error(
      `DeliveryZone "${record.externalId}" of source "${record.source}"` +
        `${city ? ` in city "${city}"` : ""} already exists`,
    );
  }
}

let Model = {
  async beforeCreate(init: DeliveryZoneRecord, cb: (err?: string) => void) {
    if (!init.id) init.id = uuid();
    if (init.enable === undefined) init.enable = true;

    try {
      await assertZone(init);
      await assertUniqueExternalId(init);
      cb();
    } catch (error) {
      cb(error instanceof Error ? error.message : String(error));
    }
  },

  async beforeUpdate(values: Partial<DeliveryZoneRecord>, cb: (err?: string) => void) {
    try {
      await assertZone(values);
      cb();
    } catch (error) {
      cb(error instanceof Error ? error.message : String(error));
    }
  },

  // Delivery is calculated against a cached zone list; every write drops it.
  async afterCreate(record: DeliveryZoneRecord, proceed: (err?: string) => void) {
    invalidateDeliveryZoneCache();
    proceed();
  },

  async afterUpdate(record: DeliveryZoneRecord, proceed: (err?: string) => void) {
    invalidateDeliveryZoneCache();
    proceed();
  },

  async afterDestroy(record: DeliveryZoneRecord, proceed: (err?: string) => void) {
    invalidateDeliveryZoneCache();
    proceed();
  },

  /**
   * Every zone that can currently take an order, in match order, with the
   * tariff of its layer already applied.
   *
   * The inheritance is resolved here and nowhere else. Downstream — matching,
   * pricing, the promised time — reads a zone the way it always did and never
   * learns that layers exist. A row with a `parent` contributes its geometry and
   * its identity; everything an operator can price is the layer's.
   *
   * Three rules, and they are deliberately not one:
   *
   * - **terms** are the layer's when the layer says so (`termsApplyToZones`),
   *   and the zone's own otherwise;
   * - **enable** is combined, never lent: a layer that is off takes its zones
   *   with it, and a layer that is on leaves each zone its own switch. Copying
   *   it down meant a zone inside a layer could not be switched off at all;
   * - **order** is a pair. The layer's number places the whole layer among
   *   everything else, and a zone's own number orders it inside its layer.
   *   Copying the layer's number down gave every zone in it the same one, and
   *   "the search stops at the first hit" then had no defined first.
   */
  async findServing(): Promise<DeliveryZoneRecord[]> {
    // Layers are read too: they carry no polygon, so they are dropped from the
    // result, but a zone cannot be resolved without the row above it.
    const zones = (await DeliveryZone.find({})) as DeliveryZoneRecord[];
    const byId = new Map(zones.map((zone) => [String(zone.id), zone]));

    const layerOf = (zone: DeliveryZoneRecord): DeliveryZoneRecord | undefined => {
      const parentId = toId(zone.parent);
      return parentId ? byId.get(parentId) : undefined;
    };

    // [where the layer sits, where the zone sits inside it]. A zone with no
    // layer takes the outer position itself and has nothing inside.
    const orderKey = (zone: DeliveryZoneRecord): [number, number] => {
      const layer = layerOf(zone);
      return layer ? [layer.sortOrder ?? 0, zone.sortOrder ?? 0] : [zone.sortOrder ?? 0, 0];
    };

    return zones
      .filter((zone) => isValidPolygon(zone.polygon))
      .filter((zone) => {
        if (zone.enable === false) return false;
        const layer = layerOf(zone);
        return !layer || layer.enable !== false;
      })
      .map((zone) => {
        const layer = layerOf(zone);
        return layer && layer.termsApplyToZones !== false
          ? { ...zone, ...pickInheritedFields(layer) }
          : zone;
      })
      .sort((a, b) => {
        const [outerA, innerA] = orderKey(a);
        const [outerB, innerB] = orderKey(b);
        return outerA - outerB || innerA - innerB;
      });
  },
};

module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model,
};

declare global {
  // Only `id` is required on create: a layer is a row without a polygon.
  const DeliveryZone: typeof Model & ORMModel<DeliveryZoneRecord, "id">;
}
