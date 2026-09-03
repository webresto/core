import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import { WorkTime } from "@webresto/worktime";
import { DishRecord } from "./Dish";
import { CityRecord } from "./City";
declare let attributes: {
    id: string;
    name: string;
    description: string;
    /**
     * Legacy change-detection hash written by the old module's `createOrUpdate`.
     * Kept so an existing column is never orphaned; new code compares
     * `sourceHash` instead.
     */
    hash: string;
    /** Lower values are matched first; the search stops at the first hit. */
    sortOrder: number;
    /**
     * Operator switch. A synchronisation never writes it on a row that already
     * exists; the one thing it decides is that an imported zone is created off.
     */
    enable: boolean;
    /** When the zone accepts orders. Empty means "always". */
    worktime: WorkTime[];
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
    minDeliveryTime: number | null;
    /** Orders below this total are not delivered to the zone. */
    minOrderTotal: number | null;
    /** Orders from this total are delivered free of charge. */
    freeDeliveryFrom: number | null;
    deliveryCost: number | null;
    /**
     * A product charged instead of `deliveryCost`. The column has always been a
     * plain string; the association is declared for the admin panel picker.
     */
    deliveryItem: DishRecord | string;
    /** Shown to the customer at checkout. */
    deliveryMessage: string;
    /**
     * The polygon. Empty on a layer, which is a row that groups other rows.
     *
     * A layer is not a separate model: the tariff fields are the same fields, and
     * one table keeps the rule readable — a row with a `parent` takes its tariff
     * from that parent and ignores its own. Matching only ever looks at rows that
     * have a polygon, so a layer is never matched.
     */
    polygon: number[][];
    /**
     * The layer this zone belongs to, or `null`.
     *
     * One level deep. A layer has no parent of its own, and nothing reads a
     * grandparent: the rule is "if there is a parent, the tariff is the parent's",
     * and a chain would turn that one line into a walk.
     */
    parent: DeliveryZoneRecord | string | null;
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
    termsApplyToZones: boolean;
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
    city: CityRecord | string | null;
    /** External system that owns the geometry, e.g. `kml`. `null` = local zone. */
    source: string | null;
    /** Stable identifier of the zone inside `source`. Unique per source. */
    externalId: string | null;
    /** Hash of the source-owned payload; equal hash means nothing to write. */
    sourceHash: string | null;
    /** When the source itself says the zone last changed, if it says so at all. */
    sourceUpdatedAt: string | null;
    /** When a snapshot last confirmed this zone. */
    lastSyncedAt: number | null;
    /**
     * When a complete snapshot of `source` last came back without this zone.
     * Deleting is deliberately left to the operator: a renamed or re-keyed zone in
     * the source would otherwise silently destroy hand-made tariffs.
     */
    missingFromSourceAt: number | null;
    customData: {
        [key: string]: string | boolean | number;
    } | string;
    createdAt: number;
    updatedAt: number;
};
type attributes = typeof attributes;
/**
 * @deprecated use `DeliveryZoneRecord` instead
 */
interface DeliveryZone extends Partial<Omit<attributes, "createdAt" | "updatedAt">>, ORM {
}
export interface DeliveryZoneRecord extends Partial<Omit<attributes, "createdAt" | "updatedAt">>, ORM {
}
export default DeliveryZone;
declare let Model: {
    beforeCreate(init: DeliveryZoneRecord, cb: (err?: string) => void): Promise<void>;
    beforeUpdate(values: Partial<DeliveryZoneRecord>, cb: (err?: string) => void): Promise<void>;
    afterCreate(record: DeliveryZoneRecord, proceed: (err?: string) => void): Promise<void>;
    afterUpdate(record: DeliveryZoneRecord, proceed: (err?: string) => void): Promise<void>;
    afterDestroy(record: DeliveryZoneRecord, proceed: (err?: string) => void): Promise<void>;
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
    findServing(): Promise<DeliveryZoneRecord[]>;
};
declare global {
    const DeliveryZone: typeof Model & ORMModel<DeliveryZoneRecord, "id">;
}
