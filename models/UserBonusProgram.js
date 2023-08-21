"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const decimal_js_1 = require("decimal.js");
// type Optional<T> = {
//   [P in keyof T]?: T[P];
// }
let attributes = {
    /** ID */
    id: {
        type: "string",
        //required: true,
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
        await bp.registration(user);
        return await UserBonusProgram.create({
            user: user.id,
            balance: 0,
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
            if (await BonusProgram.isAlived(userBonusProgram.bonusProgram)) {
                // Not await for paralel sync
                UserBonusProgram.sync(user.id, userBonusProgram.id);
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
                throw `User or BonusProgram not found: user: [${user}] bonusProgram: [${bonusProgram}]`;
            }
            const userBonusProgram = await UserBonusProgram.findOne({ user: user.id, bonusProgram: bonusProgram.id });
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
            const adapter = await BonusProgram.getAdapter(bonusProgram.adapter);
            let afterTime = new Date(0);
            if (userBonusProgram.syncedToTime && userBonusProgram.syncedToTime !== "0") {
                try {
                    new Date(userBonusProgram.syncedToTime);
                }
                catch { }
            }
            else {
                try {
                    // Sync transaction after time from Settings SYNC_BONUSTRANSACTION_AFTER_TIME
                    const SYNC_BONUSTRANSACTION_AFTER_TIME = await Settings.get('SYNC_BONUSTRANSACTION_AFTER_TIME');
                    afterTime = new Date(SYNC_BONUSTRANSACTION_AFTER_TIME);
                }
                catch { }
            }
            let skip = 0;
            const limit = 100;
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
                        balanceAfter: transaction.balanceAfter ?? await getBalanceAfter(transaction, bonusProgram.decimals),
                        isDeleted: false,
                        isStable: true,
                        bonusProgram: bonusProgram.id,
                        user: user.id,
                        customData: transaction.customData
                    };
                    lastTransaction = await UserBonusTransaction.findOrCreate({ externalId: transaction.externalId }, userBonusTransaction);
                }
                // Если возвращается меньше транзакций, чем лимит, значит, мы получили все транзакции
                if (transactions.length < limit) {
                    await UserBonusProgram.update({ id: userBonusProgram.id }, { syncedToTime: new Date().toISOString() });
                    break;
                }
                skip += limit;
            }
            async function getBalanceAfter(transaction, fix) {
                let balanceAfter = new decimal_js_1.default(await UserBonusProgram.sumCurrentBalance(user, bonusProgram));
                balanceAfter = transaction.isNegative ? balanceAfter.minus(transaction.amount) : balanceAfter.plus(transaction.amount);
                return parseFloat(balanceAfter.toFixed(fix));
            }
            let balance = parseFloat(new decimal_js_1.default(await adapter.getBalance(user)).toFixed(bonusProgram.decimals));
            if (balance !== lastTransaction.balanceAfter) {
                sails.log.warn(`balances for User: ${user.login}: ${user.id} not matched with external system ( ${balance} !== ${lastTransaction.balanceAfter})`);
                // Emmiter
            }
            await UserBonusProgram.update({ user: user.id }, { balance: balance }).fetch();
        }
        catch (error) {
            sails.log.error(error);
        }
    },
    async checkEnoughToSpend(user, bonusProgram, amount) {
        // If Bonus program not active, should stop
        if (typeof user === "string") {
            user = await User.findOne({ id: user });
        }
        if (typeof bonusProgram === "string") {
            bonusProgram = await BonusProgram.findOne({ id: bonusProgram });
        }
        if (!user || !bonusProgram) {
            throw `User or BonusProgram not found: user: ${user} bonusProgram: ${bonusProgram}`;
        }
        // Sync force before spend
        await UserBonusProgram.sync(user, bonusProgram, true);
        const userBonusProgram = await UserBonusProgram.findOne({ user: user.id, bonusProgram: bonusProgram.id });
        const bonusProgramAdapterExist = await BonusProgram.isAlived(bonusProgram.adapter);
        if (!bonusProgramAdapterExist)
            throw `No BonusProgram ${bonusProgram.adapter} exist`;
        let adapter = await BonusProgram.getAdapter(bonusProgram.adapter);
        if (!adapter)
            throw `No adapter ${bonusProgram.adapter}`;
        const externalBalance = new decimal_js_1.default((await adapter.getBalance(user)).toFixed(bonusProgram.decimals));
        const userBalance = new decimal_js_1.default(userBonusProgram.balance);
        /**
         * ok if all is ok
         */
        if (userBalance.equals(externalBalance) && externalBalance.equals(amount)) {
            return true;
            /**
             * Stop bonus program when balance not matched
             */
        }
        else if (!userBalance.equals(externalBalance) && Boolean(await Settings.get("DISABLE_BONUS_PROGRAM_ON_FAIL")) === true) {
            sails.log.error(`User ${user.login} balance not matched with external BonusSystem [${externalBalance}] expected: [${userBalance}]`);
            await BonusProgram.update({ id: bonusProgram.id }, { enable: false }).fetch();
            return false;
            /**
             * Only external system check balance
             */
        }
        else if (externalBalance.greaterThan(amount) && Boolean(await Settings.get("ONLY_EXTERNAL_BONUS_SPEND_CHECK")) === true) {
            return true;
        }
        else if (externalBalance.greaterThan(amount) && userBalance.greaterThan(amount)) {
            sails.log.error(`User ${user.login} balance not matched with external BonusSystem [${externalBalance}] expected: [${userBalance}] but greater than ${amount}`);
            return true;
        }
        return false;
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
        const transactions = await UserBonusTransaction.find({ id: user.id, bonusProgram: bonusProgram.id });
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
