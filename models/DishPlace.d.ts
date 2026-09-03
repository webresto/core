import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import { DishRecord } from "./Dish";
import { PlaceRecord } from "./Place";
/**
 * A row that limits nothing and is enabled says exactly what a missing row says.
 *
 * The rule deliberately ignores the balance mode: the mode is a setting an
 * operator flips on a live system, while deleting a row is irreversible. Judging
 * emptiness by the active mode would throw away a real RMS value in `local-only`
 * with nowhere to get it back from after a switch to `minimum`.
 */
export declare function isEmptyRow(values: DishPlaceValues): boolean;
declare let attributes: {
    id: string;
    /** The dish this row limits. */
    dish: DishRecord | string;
    place: PlaceRecord | string;
    /** Operator-managed stock. `null` means this source has not supplied a value. */
    localBalance: number | null;
    /** RMS-managed stock. Stock Manager must never write this field. */
    rmsBalance: number | null;
    /**
     * Operator switch for this dish at this place. `false` is a hard stop that
     * wins over any balance, so a point can drop a product without editing stock.
     */
    enable: boolean;
    createdAt: number;
    updatedAt: number;
};
type attributes = typeof attributes;
export interface DishPlaceRecord extends Omit<attributes, "createdAt" | "updatedAt">, ORM {
}
export interface DishPlaceValues {
    localBalance?: number | null;
    rmsBalance?: number | null;
    enable?: boolean;
}
declare let Model: {
    /**
     * `(dish, place)` is unique. Postgres enforces it with an index, but
     * sails-disk does not, so the pair is also checked here: a duplicate row
     * would silently split one product's stock into two competing records.
     */
    beforeCreate(record: DishPlaceRecord, cb: (err?: string) => void): Promise<void>;
    /**
     * Returns the row for the pair, creating it only when a real value arrives.
     *
     * A product with no row is available everywhere with unlimited stock, so rows
     * are materialized lazily: by an operator edit, by an RMS stop list, or by
     * disabling the product at the point.
     *
     * The mirror of that rule applies on the way back: once the merged row limits
     * nothing, it is deleted and `null` is returned. Callers must treat `null` as
     * "unlimited and enabled here", which is exactly what a missing row means.
     */
    upsertForPlace(dish: string, place: string, values: DishPlaceValues): Promise<DishPlaceRecord | null>;
};
declare global {
    const DishPlace: typeof Model & ORMModel<DishPlaceRecord, "dish" | "place">;
}
export {};
