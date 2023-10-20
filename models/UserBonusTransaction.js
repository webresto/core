"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const decimal_js_1 = __importDefault(require("decimal.js"));
let attributes = {
    /** ID */
    id: {
        type: "string",
    },
    /**
     * ID transaction in 3dparty system
     * */
    externalId: {
        type: "string",
        allowNull: true
    },
    /** Type of bonuses (default: true)
     * came is incoming (positive transaction)
     * gone is outgoin (negative transaction)
     */
    isNegative: "boolean",
    /** Custom badges */
    group: "string",
    /** Text */
    comment: "string",
    amount: {
        type: "number",
    },
    /** automatic recalculate */
    balanceAfter: {
        type: "number"
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
    async beforeCreate(init, cb) {
        try {
            if (!init.id) {
                init.id = (0, uuid_1.v4)();
            }
            let userBonus = await UserBonusProgram.findOne({ bonusProgram: init.bonusProgram, user: init.user });
            if (!userBonus)
                return cb("beforeCreate: Bonus program not found for user");
            init.isStable = false;
            // set negative by default
            if (init.isNegative === undefined) {
                init.isNegative = true;
            }
            // If Bonus program not active, should stop
            let bonusProgram = await BonusProgram.findOne({ id: init.bonusProgram });
            const bonusProgramAdapterExist = await BonusProgram.isAlived(bonusProgram.adapter);
            if (!bonusProgramAdapterExist)
                cb(`Bonus program not alived`);
            if (init.isNegative === true) {
                if (bonusProgramAdapterExist && init.user !== undefined && typeof init.user === "string") {
                    if (await UserBonusProgram.checkEnoughToSpend(init.user, init.bonusProgram, init.amount) !== true) {
                        return cb(`UserBonusTransaction beforeCreate > user [${init.user}] balance [${userBonus.balance}] not enough [${init.amount}]`);
                    }
                }
                else {
                    return cb("UserBonusTransaction user not defined");
                }
            }
            return cb();
        }
        catch (error) {
            sails.log.error(error);
            return cb(error);
        }
    },
    async afterCreate(record, cb) {
        try {
            // After writing to the model, core safely calculate new bonuses
            const bonusProgram = await BonusProgram.findOne({ id: record.bonusProgram });
            const bonusProgramAdapter = await BonusProgram.getAdapter(bonusProgram.adapter);
            let userBonus = await UserBonusProgram.findOne({ bonusProgram: bonusProgram.id, user: record.user });
            if (!userBonus)
                return cb("afterCreate: Bonus program not found for user");
            if (bonusProgramAdapter !== undefined) {
                if (record.isNegative === true && await UserBonusProgram.checkEnoughToSpend(record.user, record.bonusProgram, record.amount) !== true) {
                    return cb(`UserBonusTransaction afterCreate > user [${record.user}] balance [${userBonus.balance}] not enough [${record.amount}]`);
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
                let bonusProgramAdapterTransaction = {};
                if (record.isStable !== true) {
                    try {
                        bonusProgramAdapterTransaction = await bonusProgramAdapter.writeTransaction(user, userBonus, record);
                    }
                    catch (error) {
                        if ((await Settings.get("DISABLE_BONUS_PROGRAM_ON_FAIL")) === true) {
                            await BonusProgram.updateOne({ id: bonusProgram.id }, { enable: false });
                        }
                        return cb(error);
                    }
                    // Set IsStable
                    if (bonusProgramAdapterTransaction && !bonusProgramAdapterTransaction.externalId) {
                        return cb();
                    }
                    await UserBonusTransaction.updateOne({ id: record.id }, { externalId: bonusProgramAdapterTransaction.externalId, isStable: true });
                }
            }
            return cb();
        }
        catch (error) {
            sails.log.error(error);
            return cb(error);
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
        return cb();
    }
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
