"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const decimal_js_1 = require("decimal.js");
let attributes = {
    /** ID */
    id: {
        type: "string",
    },
    /** Type of bonuses (default: true)
     * came is incoming (positive transaction)
     * gone is outgoin (negative transaction)
     */
    isNegative: "boolean",
    /** Custom badges */
    group: "string",
    amount: {
        type: "number",
    },
    /** automatic recalculate */
    balanceAfter: {
        type: "number",
    },
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
    async beforeCreate(init, cb) {
        try {
            if (!init.id) {
                init.id = (0, uuid_1.v4)();
            }
            let userBonus = await UserBonusProgram.findOne({ bonusProgram: init.bonusProgram, user: init.user });
            if (!userBonus)
                cb("beforeCreate: Bonus program not found for user");
            // set negative by default
            if (init.isNegative === undefined) {
                init.isNegative = true;
                init.isStable = false;
            }
            // If Bonus program not active, should stop
            let bonusProgram = await BonusProgram.findOne({ id: init.bonusProgram });
            const bonusProgramAdapterExist = await BonusProgram.isAlived(bonusProgram.adapter);
            if (!bonusProgramAdapterExist)
                cb(`Bonus program not alived`);
            if (init.isNegative === true) {
                if (bonusProgramAdapterExist && init.user !== undefined && typeof init.user === "string") {
                    if (userBonus.balance < init.amount) {
                        cb(`UserBonusTransaction user [${init.user}] balance [${userBonus.balance}] not enough [${init.amount}]`);
                    }
                }
                else {
                    cb("UserBonusTransaction user not defined");
                }
            }
            cb();
        }
        catch (error) {
            sails.log.error(error);
            cb(error);
        }
    },
    async afterCreate(record, cb) {
        try {
            // After writing to the model, core safely calculate new bonuses
            const bonusProgram = await BonusProgram.findOne({ id: record.bonusProgram });
            const bonusProgramAdapter = await BonusProgram.getAdapter(bonusProgram.adapter);
            let userBonus = await UserBonusProgram.findOne({ bonusProgram: bonusProgram.id, user: record.user });
            if (!userBonus)
                cb("afterCreate: Bonus program not found for user");
            if (bonusProgramAdapter !== undefined) {
                if (record.isNegative === true && userBonus.balance < record.amount) {
                    cb(`UserBonusTransaction user [${record.user}] balance [${userBonus.balance}] not enough [${record.amount}]`);
                }
                let calculate = new decimal_js_1.default(userBonus.balance);
                if (record.isNegative === true) {
                    calculate = calculate.minus(record.amount);
                }
                else {
                    calculate = calculate.plus(record.amount);
                }
                let newBalance = parseFloat(calculate.toFixed(bonusProgram.decimals ?? 0));
                const user = await User.findOne({ id: record.user });
                // First write transaction
                await UserBonusProgram.updateOne({ id: userBonus.id }, { balance: newBalance });
                // Exec write unstabled transaction in external system
                if (record.isStable !== true) {
                    try {
                        await bonusProgramAdapter.writeTransaction(bonusProgram, user, record);
                    }
                    catch (error) {
                        if ((await Settings.get("DISABLE_BONUSPROGRAM_ON_ERROR")) === true) {
                            await BonusProgram.updateOne({ id: bonusProgram.id }, { enable: false });
                        }
                        cb(error);
                    }
                    // Set IsStable
                    await UserBonusTransaction.updateOne({ id: record.id }, { isStable: true });
                }
            }
            cb();
        }
        catch (error) {
            sails.log.error(error);
            cb(error);
        }
    },
    beforeDestroy() {
        throw "destory bonus transaction not allowed";
    },
    beforeUpdate(record, cb) {
        /**
         * only stability updates allowed
         */
        if (record.isStable === true) {
            record = {
                id: record.id,
                isStable: record.isStable,
            };
        }
        else {
            throw "update bonus transaction not allowed";
        }
        if (Object.keys(record).length !== 2)
            throw "only isStable allwed for update";
        cb();
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
