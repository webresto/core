import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import { v4 as uuid } from "uuid";
import { DishRecord } from "./Dish";
import { PlaceRecord } from "./Place";
import { toId } from "../lib/association-id";
import { isBalanceValue, isEmptyRow, mergeValues } from "../lib/dish-place/row";

let attributes = {
  id: {
    type: "string",
  } as unknown as string,

  /** The dish this row limits. */
  dish: {
    model: "dish",
    required: true,
  } as unknown as DishRecord | string,

  place: {
    model: "place",
    required: true,
  } as unknown as PlaceRecord | string,

  /** Operator-managed stock. `null` means this source has not supplied a value. */
  localBalance: {
    type: "number",
    allowNull: true,
    custom(value: unknown) {
      return isBalanceValue(value);
    },
  } as unknown as number | null,

  /** RMS-managed stock. Stock Manager must never write this field. */
  rmsBalance: {
    type: "number",
    allowNull: true,
    custom(value: unknown) {
      return isBalanceValue(value);
    },
  } as unknown as number | null,

  /**
   * Operator switch for this dish at this place. `false` is a hard stop that
   * wins over any balance, so a point can drop a product without editing stock.
   */
  enable: {
    type: "boolean",
    defaultsTo: true,
  } as unknown as boolean,

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
export interface DishPlaceRecord extends Omit<attributes, "createdAt" | "updatedAt">, ORM {}

export interface DishPlaceValues {
  localBalance?: number | null;
  rmsBalance?: number | null;
  /**
   * We recommend not using this with an RMS adapter.
   */
  enable?: boolean;
}

let Model = {
  /**
   * `(dish, place)` is unique. Postgres enforces it with an index, but
   * sails-disk does not, so the pair is also checked here: a duplicate row
   * would silently split one product's stock into two competing records.
   */
  async beforeCreate(record: DishPlaceRecord, cb: (err?: string) => void) {
    if (!record.id) record.id = uuid();

    const dish = toId(record.dish);
    const place = toId(record.place);
    if (!dish || !place) return cb("DishPlace requires both dish and place");

    try {
      const existing = await DishPlace.findOne({ dish, place });
      if (existing) return cb(`DishPlace for dish ${dish} and place ${place} already exists`);
    } catch (error) {
      return cb(String(error));
    }

    cb();
  },

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
  async upsertForPlace(dish: string, place: string, values: DishPlaceValues): Promise<DishPlaceRecord | null> {
    const existing = await DishPlace.findOne({ dish, place });
    if (existing) {
      if (isEmptyRow(mergeValues(existing, values))) {
        await DishPlace.destroy({ id: existing.id }).fetch();
        return null;
      }
      return await DishPlace.updateOne({ id: existing.id }, values);
    }

    // Nothing to store: a row saying "no limit, enabled" is the default state.
    if (isEmptyRow(values)) return null;

    try {
      return await DishPlace.create({ dish, place, ...values }).fetch();
    } catch (error) {
      // Lost a race against a concurrent create: the unique pair already exists.
      const concurrent = await DishPlace.findOne({ dish, place });
      if (!concurrent) throw error;
      if (isEmptyRow(mergeValues(concurrent, values))) {
        await DishPlace.destroy({ id: concurrent.id }).fetch();
        return null;
      }
      return await DishPlace.updateOne({ id: concurrent.id }, values);
    }
  },
};

module.exports = {
  primaryKey: "id",
  tableName: "dish_place",
  attributes,
  ...Model,
};

declare global {
  const DishPlace: typeof Model & ORMModel<DishPlaceRecord, "dish" | "place">;
}
