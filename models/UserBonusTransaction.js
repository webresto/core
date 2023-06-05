"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const decimal_js_1 = require("decimal.js");
let attributes = {
    /** ID */
    id: {
        type: "string",
        required: true,
    },
    /** Type of bonuses (default: true)
    * came is incoming (positive transaction)
    * gone is outgoin (negative transaction)
    */
    isNegative: "boolean",
    /** Custom badges */
    group: "string",
    /**
     * binary sign of transaction type
     */
    isPositive: {
        type: 'boolean',
        required: true
    },
    amount: {
        type: 'number',
    },
    balanceAfter: {
        type: 'number',
    },
    isDeleted: {
        type: 'boolean',
    },
    /**
     * Indicates whether the call was made after creation. If so, this means that the bonus adapter worked without errors
     */
    isStable: {
        type: 'boolean',
    },
    bonusProgram: {
        model: 'bonusprogram',
        required: true
    },
    user: {
        model: 'user',
        required: true
    },
    customData: "json",
};
let Model = {
    async beforeCreate(init, next) {
        // set negative by default
        if (init.isNegative === undefined) {
            init.isNegative = true;
            init.isStable = false;
        }
        // If Bonus program not active, should stop
        let bonusProgram = await BonusProgram.findOne({ id: init.bonusProgram });
        const bonusProgramAdapterExist = await BonusProgram.isAlived(bonusProgram.id);
        // Check user balance
        if (bonusProgramAdapterExist && init.isNegative && init.user !== undefined && typeof init.user === "string") {
            if (typeof init.bonusProgram !== "string")
                throw "init.bonusProgram should be string";
            let userBonus = await UserBonusProgram.findOne({ id: init.bonusProgram, user: init.user });
            if (!userBonus)
                throw 'Bonus program not found for user';
            if (userBonus.balance < init.amount) {
                throw `UserBonusTransaction user [${init.user}] balance [${userBonus.balance}] not enough [${init.amount}]`;
            }
        }
        else {
            throw 'UserBonusTransaction.user not defined';
        }
        if (!init.id) {
            init.id = (0, uuid_1.v4)();
        }
        next();
    },
    async afterCreate(record, next) {
        // After writing to the model, core safely calculate new bonuses
        const bonusProgram = await BonusProgram.findOne({ id: record.bonusProgram });
        const bonusProgramAdapter = await BonusProgram.getAdapter(bonusProgram.id);
        let userBonus = await UserBonusProgram.findOne({ id: record.bonusProgram, user: record.user });
        if (!userBonus)
            throw 'Bonus program not found for user';
        if (bonusProgramAdapter !== undefined && userBonus.balance < record.amount) {
            throw `UserBonusTransaction user [${record.user}] balance [${userBonus.balance}] not enough [${record.amount}]`;
        }
        else {
            let calculate = new decimal_js_1.default(userBonus.balance);
            if (record.isNegative) {
                calculate.minus(record.amount);
            }
            else {
                calculate.plus(record.amount);
            }
            let newBalance = parseFloat(calculate.toFixed(bonusProgram.decimals ?? 0));
            const user = await User.findOne({ id: record.user });
            await bonusProgramAdapter.writeTransaction(bonusProgram, user, record);
            await UserBonusProgram.updateOne({ id: userBonus.id }, { balance: newBalance });
            // Set IsStable
            await UserBonusTransaction.updateOne({ id: record.id }, { isStable: true });
        }
        next();
    },
    beforeDestroy() {
        throw 'destory bonus transaction not allowed';
    },
    beforeUpdate(record, next) {
        /**
         * only stability updates allowed
         */
        if (record.isStable === true) {
            record = {
                id: record.id,
                isStable: record.isStable
            };
        }
        else {
            throw 'update bonus transaction not allowed';
        }
        if (Object.keys(record).length !== 2)
            throw 'only isStable allwed for update';
        next();
    },
};
/**
 * When paying or accruing a transaction, core write it to the UserBonusTransaction model.
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
