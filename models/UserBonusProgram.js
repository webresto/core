"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const decimal_js_1 = __importDefault(require("decimal.js"));
// type Optional<T> = {
//   [P in keyof T]?: T[P];
// }
let attributes = {
    /** UserBonusProgram ID */
    id: {
        type: "string",
        //required: true,
    },
    /** External id for bonus program */
    externalId: {
        type: "string"
    },
    /** id for customer in external program */
    externalCustomerId: {
        type: "string"
    },
    balance: {
        type: 'number'
    },
    isDeleted: {
        type: 'boolean',
    },
    isActive: {
        type: 'boolean',
    },
    user: {
        model: 'user',
        required: true
    },
    bonusProgram: {
        model: 'bonusprogram'
    },
    /** UNIX era seconds */
    syncedToTime: "string",
    customData: "json",
};
let Model = {
    beforeCreate(init, cb) {
        if (!init.id) {
            init.id = (0, uuid_1.v4)();
        }
        cb();
    },
    async registration(user, adapterOrId) {
        const bp = await BonusProgram.getAdapter(adapterOrId);
        // TODO: this new standard call for models methods (Object or string)
        if (typeof user === "string") {
            user = await User.findOne({ id: user });
        }
        let extId = await bp.registration(user);
        return await UserBonusProgram.create({
            user: user.id,
            balance: 0,
            externalId: extId,
            isActive: true,
            isDeleted: false,
            bonusProgram: bp.id,
            syncedToTime: "0"
        }).fetch();
    },
    async delete(user, adapterOrId) {
        const bp = await BonusProgram.getAdapter(adapterOrId);
        if (typeof user === "string") {
            user = await User.findOne({ id: user });
        }
        await bp.delete(user);
        await UserBonusProgram.update({ user: user.id }, {
            isDeleted: true,
        }).fetch();
        return;
    },
    // Sync all active user bonusprogram
    async syncAll(user) {
        if (typeof user === "string") {
            user = await User.findOne({ id: user });
            if (!user)
                throw `syncAll > user not found`;
        }
        const userBonusPrograms = await UserBonusProgram.find({ user: user.id });
        for (const userBonusProgram of userBonusPrograms) {
            // Skip if less TIME_TO_SYNC_BONUSES_IN_MINUTES
            const diffInMinutes = (Math.abs(new Date().getTime() - new Date(userBonusProgram.syncedToTime).getTime())) / (1000 * 60);
            const timeToSyncBonusesInMinutes = await Settings.get("TIME_TO_SYNC_BONUSES_IN_MINUTES") ?? 15;
            if (diffInMinutes < timeToSyncBonusesInMinutes)
                continue;
            if (await BonusProgram.isAlive(userBonusProgram.bonusProgram)) {
                // Not await for parallel sync
                UserBonusProgram.sync(user.id, userBonusProgram.bonusProgram);
            }
        }
    },
    async sync(user, bonusProgram) {
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
            sails.log.debug(`Start full sync UserBonusProgram for user ${user.login}`);
            await UserBonusProgram.update({ id: userBonusProgram.id }, { balance: extBalance }).fetch();
            // point for call update SyncTransactions
        }
        catch (error) {
            sails.log.error(error);
        }
    },
    async checkEnoughToSpend(user, bonusProgram, amount) {
        // If Bonus program not active, should stop
        try {
            if (typeof user === "string") {
                user = await User.findOne({ id: user });
            }
            if (typeof bonusProgram === "string") {
                bonusProgram = await BonusProgram.findOne({ id: bonusProgram });
            }
            if (!user || !bonusProgram) {
                throw `User or BonusProgram not found: user: ${user.login} bonusProgram: ${bonusProgram}`;
            }
            const bonusProgramAdapterExist = await BonusProgram.isAlive(bonusProgram.adapter);
            if (!bonusProgramAdapterExist)
                throw `No BonusProgram ${bonusProgram.adapter} exist`;
            // Sync force before spend
            await UserBonusProgram.sync(user, bonusProgram);
            const userBonusProgram = await UserBonusProgram.findOne({ user: user.id, bonusProgram: bonusProgram.id });
            if (!userBonusProgram) {
                throw `UserBonusProgram not found: user: ${user.login} bonusProgram: ${bonusProgram}`;
            }
            let adapter = await BonusProgram.getAdapter(bonusProgram.adapter);
            if (!adapter)
                throw `No adapter ${bonusProgram.adapter}`;
            const externalBalance = new decimal_js_1.default((await adapter.getBalance(user, userBonusProgram)).toFixed(bonusProgram.decimals));
            const userBalance = new decimal_js_1.default(userBonusProgram.balance);
            /**
             * ok if all is ok
             */
            if (userBalance.equals(externalBalance) && userBalance.greaterThanOrEqualTo(externalBalance)) {
                return true;
                /**
                 * Stop bonus program when balance not matched
                 */
            }
            else if (!userBalance.equals(externalBalance) && (await Settings.get("DISABLE_USER_BONUS_PROGRAM_ON_FAIL")) === true) {
                sails.log.error(`User [${user.login}] balance [${userBalance}] not matched with external BonusSystem [${externalBalance}] `);
                await UserBonusProgram.update({ id: userBonusProgram.id }, { isActive: false }).fetch();
                return false;
                /**
                 * Only external system check balance
                 */
            }
            else if (externalBalance.greaterThanOrEqualTo(amount) && (await Settings.get("ONLY_EXTERNAL_BONUS_SPEND_CHECK")) === true) {
                return true;
            }
            else if (externalBalance.greaterThanOrEqualTo(amount) && userBalance.greaterThanOrEqualTo(amount)) {
                sails.log.error(`User [${user.login}] balance [${userBalance}] not matched with external BonusSystem [${externalBalance}] but greater than ${amount} politic: "ONLY_EXTERNAL_BONUS_SPEND_CHECK"`);
                return true;
            }
            return false;
        }
        catch (error) {
            sails.log.error(error);
            throw error;
        }
        // проверка тут и во вне
        // выдать варнинг если не совпадает и выключить бонусную программу
    },
    // Define the recalculateBalance method
    async sumCurrentBalance(user, bonusProgram) {
        if (typeof user === "string") {
            user = await User.findOne({ id: user });
        }
        if (typeof bonusProgram === "string") {
            bonusProgram = await BonusProgram.findOne({ id: bonusProgram });
        }
        if (!user || !bonusProgram) {
            throw `recalculateBalance > user or bonusprogram not found`;
        }
        // Retrieve the relevant transactions for the user and bonus program
        const transactions = await UserBonusTransaction.find({ user: user.id, bonusProgram: bonusProgram.id });
        // Initialize the balance with 0
        let balance = new decimal_js_1.default(0);
        // Iterate over each transaction and calculate the balance
        for (const transaction of transactions) {
            if (!transaction.isDeleted) {
                const transactionAmount = new decimal_js_1.default(transaction.amount);
                balance = transaction.isNegative ? balance.minus(transactionAmount) : balance.plus(transactionAmount);
            }
        }
        // Return the calculated balance
        return parseFloat(balance.toFixed(bonusProgram.decimals));
    }
};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
