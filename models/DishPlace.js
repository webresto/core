"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isEmptyRow = isEmptyRow;
const uuid_1 = require("uuid");
const dish_place_balance_1 = require("../lib/dish-place-balance");
function toId(value) {
    if (typeof value === "string")
        return value.trim() || null;
    if (value && typeof value === "object" && typeof value.id === "string") {
        return value.id.trim() || null;
    }
    return null;
}
function isBalanceValue(value) {
    return value === null || (typeof value === "number" && Number.isFinite(value) && value >= -1);
}
/** `-1` and `null` both mean "this source reports no limit". */
function limitsNothing(value) {
    return value === null || value === undefined || value === dish_place_balance_1.UNLIMITED_BALANCE;
}
/**
 * A row that limits nothing and is enabled says exactly what a missing row says.
 *
 * The rule deliberately ignores the balance mode: the mode is a setting an
 * operator flips on a live system, while deleting a row is irreversible. Judging
 * emptiness by the active mode would throw away a real RMS value in `local-only`
 * with nowhere to get it back from after a switch to `minimum`.
 */
function isEmptyRow(values) {
    return limitsNothing(values.localBalance) && limitsNothing(values.rmsBalance) && values.enable !== false;
}
/**
 * The state a row would end up in after the update.
 *
 * A caller writes one source and leaves the others out, so an absent key must
 * keep the stored value rather than read as "no limit" — otherwise writing
 * `rmsBalance: -1` would silently drop an operator stop stored next to it.
 */
function mergeValues(existing, values) {
    return {
        localBalance: values.localBalance !== undefined ? values.localBalance : existing.localBalance ?? null,
        rmsBalance: values.rmsBalance !== undefined ? values.rmsBalance : existing.rmsBalance ?? null,
        enable: values.enable !== undefined ? values.enable : existing.enable !== false,
    };
}
let attributes = {
    id: {
        type: "string",
    },
    /** The dish this row limits. */
    dish: {
        model: "dish",
        required: true,
    },
    place: {
        model: "place",
        required: true,
    },
    /** Operator-managed stock. `null` means this source has not supplied a value. */
    localBalance: {
        type: "number",
        allowNull: true,
        custom(value) {
            return isBalanceValue(value);
        },
    },
    /** RMS-managed stock. Stock Manager must never write this field. */
    rmsBalance: {
        type: "number",
        allowNull: true,
        custom(value) {
            return isBalanceValue(value);
        },
    },
    /**
     * Operator switch for this dish at this place. `false` is a hard stop that
     * wins over any balance, so a point can drop a product without editing stock.
     */
    enable: {
        type: "boolean",
        defaultsTo: true,
    },
    createdAt: {
        type: "number",
        autoCreatedAt: true,
    },
    updatedAt: {
        type: "number",
        autoUpdatedAt: true,
    },
};
let Model = {
    /**
     * `(dish, place)` is unique. Postgres enforces it with an index, but
     * sails-disk does not, so the pair is also checked here: a duplicate row
     * would silently split one product's stock into two competing records.
     */
    async beforeCreate(record, cb) {
        if (!record.id)
            record.id = (0, uuid_1.v4)();
        const dish = toId(record.dish);
        const place = toId(record.place);
        if (!dish || !place)
            return cb("DishPlace requires both dish and place");
        try {
            const existing = await DishPlace.findOne({ dish, place });
            if (existing)
                return cb(`DishPlace for dish ${dish} and place ${place} already exists`);
        }
        catch (error) {
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
    async upsertForPlace(dish, place, values) {
        const existing = await DishPlace.findOne({ dish, place });
        if (existing) {
            if (isEmptyRow(mergeValues(existing, values))) {
                await DishPlace.destroy({ id: existing.id }).fetch();
                return null;
            }
            return await DishPlace.updateOne({ id: existing.id }, values);
        }
        // Nothing to store: a row saying "no limit, enabled" is the default state.
        if (isEmptyRow(values))
            return null;
        try {
            return await DishPlace.create({ dish, place, ...values }).fetch();
        }
        catch (error) {
            // Lost a race against a concurrent create: the unique pair already exists.
            const concurrent = await DishPlace.findOne({ dish, place });
            if (!concurrent)
                throw error;
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
