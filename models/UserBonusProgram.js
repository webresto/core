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
    /** ID */
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
        model: 'user'
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
        // TODO: this new standart call for models methods (Object or string)
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
            // Skip if  
            const diffInMinutes = (Math.abs(new Date().getTime() - new Date(userBonusProgram.syncedToTime).getTime())) / (1000 * 60);
            const timeToSyncBonusesInMinutes = await Settings.get("TIME_TO_SYNC_BONUSES_IN_MINUTES") ?? "5";
            if (diffInMinutes < parseInt(timeToSyncBonusesInMinutes))
                continue;
            if (await BonusProgram.isAlived(userBonusProgram.bonusProgram)) {
                // Not await for paralel sync
                UserBonusProgram.sync(user.id, userBonusProgram.bonusProgram);
            }
        }
    },
    /** Full sync all transaction with external system */
    async sync(user, bonusProgram, force = false) {
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
            const adapter = await BonusProgram.getAdapter(bonusProgram.adapter);
            let balance = parseFloat(new decimal_js_1.default(await adapter.getBalance(user, userBonusProgram)).toFixed(bonusProgram.decimals));
            // Should sync when balance is not equals
            force = balance !== userBonusProgram.balance;
            if (!force) {
                // No sync if time not more 5 min
                const diffInMinutes = (Math.abs(new Date().getTime() - new Date(userBonusProgram.syncedToTime).getTime())) / (1000 * 60); // Разница в миллисекундах
                let timeToSyncBonusesInMinutes = await Settings.get("TIME_TO_SYNC_BONUSES_IN_MINUTES") ?? "5";
                if (diffInMinutes < parseInt(timeToSyncBonusesInMinutes)) {
                    sails.log.debug(`SYNC > time for sync ubp ${userBonusProgram.id} lest than ${timeToSyncBonusesInMinutes}`);
                    return;
                }
            }
            if (!user || !bonusProgram || !userBonusProgram) {
                throw `sync > user, bonusprogram, userBonusProgram not found`;
            }
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
                    const SYNC_BONUSTRANSACTION_AFTER_TIME = await Settings.get('SYNC_BONUSTRANSACTION_AFTER_TIME') ?? '0';
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
                        balanceAfter: transaction.balanceAfter,
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
            const _lastTransaction = await UserBonusTransaction.find({ sort: "createdAt DESC", limit: 1 });
            lastTransaction = _lastTransaction[0];
            const sumCurrentBalance = await UserBonusProgram.sumCurrentBalance(user, bonusProgram);
            if (sumCurrentBalance === balance && sumCurrentBalance === lastTransaction.balanceAfter) {
                // Emmiter
                await UserBonusProgram.update({ user: user.id }, { balance: balance }).fetch();
            }
            else {
                sails.log.error(`balances for user: [${user.login}, id:${user.id}] not matched with external system (sum:${sumCurrentBalance}, external:${balance}, lastAfter:${lastTransaction.balanceAfter})`);
            }
            await UserBonusProgram.update({ user: user.id }, { balance: balance }).fetch();
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
            const bonusProgramAdapterExist = await BonusProgram.isAlived(bonusProgram.adapter);
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
            else if (!userBalance.equals(externalBalance) && Boolean(await Settings.get("DISABLE_USER_BONUS_PROGRAM_ON_FAIL")) === true) {
                sails.log.error(`User [${user.login}] balance [${userBalance}] not matched with external BonusSystem [${externalBalance}] `);
                await UserBonusProgram.update({ id: userBonusProgram.id }, { isActive: false }).fetch();
                return false;
                /**
                 * Only external system check balance
                 */
            }
            else if (externalBalance.greaterThanOrEqualTo(amount) && Boolean(await Settings.get("ONLY_EXTERNAL_BONUS_SPEND_CHECK")) === true) {
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
