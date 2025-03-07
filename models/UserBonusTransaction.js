"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
let attributes = {
    /** ID */
    id: {
        type: "string",
    },
    /**
     * ID transaction in 3d party system
     * */
    externalId: {
        type: "string",
        allowNull: true
    },
    /** Type of bonuses (default: true)
     * came is incoming (positive transaction)
     * gone is outgoing (negative transaction)
     */
    isNegative: {
        type: "boolean",
        required: true,
    },
    /** Custom badges */
    group: "string",
    /** Text */
    comment: "string",
    amount: {
        type: "number",
    },
    // /** automatic recalculate */
    // balanceAfter: {
    //   type: "number"
    // } as unknown as number,
    /** User can delete transaction */
    isDeleted: {
        type: "boolean",
    },
    /**
     * Indicates whether the call was made after creation. If so, this means that the bonus adapter worked without errors
     */
    isStable: {
        type: "boolean",
    },
    /**
     * Indicates that the transaction was canceled
     */
    canceled: {
        type: "boolean",
    },
    /** UTC time */
    time: "string",
    bonusProgram: {
        model: "bonusprogram",
        required: true,
    },
    user: {
        model: "user",
        required: true,
    },
    customData: "json",
};
let Model = {
    /**
     * Before create, a check is made to see if there are enough funds to write off.
     * Immediately after create saving the transaction in the local database, the external adapter is called to save the transaction
     */
    async beforeCreate(init, cb) {
        if (!init.id) {
            init.id = (0, uuid_1.v4)();
        }
        if (init.isStable === undefined) {
            init.isStable = true;
        }
        return cb();
    },
    async afterCreate(record, cb) {
        return cb();
    },
    // beforeDestroy() {
    // },
    beforeUpdate(record, cb) {
        return cb();
    }
};
/**
 * When paying or accruing a transaction, core writes it to the UserBonusTransaction model.
 * Further, the systems that will be docked must themselves implement synchronization with the external system,
 * to replenish and withdraw bonuses.
 *
 * Before making a transaction, the core compares whether the user has an available balance
 */
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
