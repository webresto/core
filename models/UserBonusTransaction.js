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
    },
    async sync(user, bonusProgram, balanceOnly = true) {
        try {
            if (typeof user === "string") {
                user = await User.findOne({ id: user });
            }
            if (typeof bonusProgram === "string") {
                bonusProgram = await BonusProgram.findOne({ id: bonusProgram });
            }
            if (!user || !bonusProgram) {
                throw `User or BonusProgram not found: user: [${user.login}] bonusProgram: [${bonusProgram}]`;
            }
            const userBonusProgram = await UserBonusProgram.findOne({ user: user.id, bonusProgram: bonusProgram.id });
            if (!userBonusProgram) {
                throw `UserBonusProgram not found: user: [${user.login}] bonusProgram: [${bonusProgram}]`;
            }
            if (!user || !bonusProgram || !userBonusProgram) {
                throw `sync > user, bonusprogram, userBonusProgram not found`;
            }
            const adapter = await BonusProgram.getAdapter(bonusProgram.adapter);
            let extBalance = parseFloat(new decimal_js_1.default(await adapter.getBalance(user, userBonusProgram)).toFixed(bonusProgram.decimals));
            userBonusProgram.balance = extBalance;
            sails.log.debug(`Start full sync UserBonusProgram for user ${user.login}`);
            if (balanceOnly) {
                return;
            }
            // In case full sunc
            let afterTime = new Date(0);
            if (userBonusProgram.syncedToTime && userBonusProgram.syncedToTime !== "0") {
                try {
                    afterTime = new Date(userBonusProgram.syncedToTime);
                }
                catch { }
            }
            else {
                try {
                    // Sync transaction after time from Settings SYNC_BONUSTRANSACTION_AFTER_TIME
                    const SYNC_BONUSTRANSACTION_AFTER_TIME = await Settings.get('SYNC_BONUSTRANSACTION_AFTER_TIME') ?? 0;
                    afterTime = new Date(SYNC_BONUSTRANSACTION_AFTER_TIME);
                }
                catch { }
            }
            let skip = 0;
            const limit = 10;
            let lastTransaction = {};
            while (true) {
                const transactions = await adapter.getTransactions(user, afterTime, limit, skip);
                if (transactions.length === 0) {
                    break;
                }
                for (const transaction of transactions) {
                    const userBonusTransaction = {
                        isNegative: transaction.isNegative,
                        externalId: transaction.externalId,
                        group: transaction.group,
                        amount: transaction.amount,
                        isDeleted: false,
                        isStable: true,
                        bonusProgram: bonusProgram.id,
                        user: user.id,
                        customData: transaction.customData
                    };
                    if (transaction.externalId) {
                        lastTransaction = await UserBonusTransaction.findOrCreate({ externalId: transaction.externalId }, userBonusTransaction);
                    }
                    else {
                        lastTransaction = await UserBonusTransaction.create(userBonusTransaction).fetch();
                    }
                }
                // Если возвращается меньше транзакций, чем лимит, значит, мы получили все транзакции
                if (transactions.length < limit) {
                    await UserBonusProgram.update({ id: userBonusProgram.id }, { syncedToTime: new Date().toISOString() }).fetch();
                    break;
                }
                skip += limit;
            }
        }
        catch (error) {
            sails.log.error(error);
        }
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
