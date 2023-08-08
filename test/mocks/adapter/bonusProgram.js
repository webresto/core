"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryBonusProgramAdapter = void 0;
const BonusProgramAdapter_1 = require("../../../adapters/bonusprogram/BonusProgramAdapter");
class InMemoryBonusProgramAdapter extends BonusProgramAdapter_1.default {
    transactions = new Map();
    users = new Map();
    name = "test bonus adapter name";
    adapter = "test";
    exchangeRate = 10;
    coveragePercentage = 0.5;
    decimals = 1;
    description = "In-memory BonusProgramAdapter";
    constructor(config) {
        super(config);
    }
    async registration(user) {
        if (!this.users.has(user.id)) {
            this.users.set(user.id, user);
            this.transactions.set(user.id, []);
        }
    }
    async delete(user) {
        if (this.users.has(user.id)) {
            this.users.delete(user.id);
            this.transactions.delete(user.id);
        }
    }
    async isRegistred(user) {
        return this.users.has(user.id);
    }
    async getBalance(user) {
        const transactions = this.transactions.get(user.id) || [];
        return transactions.reduce((total, transaction) => total + (transaction.isNegative ? -transaction.amount : transaction.amount), 0);
    }
    async getTransactions(user, afterTime, limit = 0, skip = 0) {
        const transactions = this.transactions.get(user.id) || [];
        return transactions.filter((transaction) => new Date(transaction.time) > afterTime).slice(skip, limit || undefined);
    }
    async writeTransaction(bonusProgram, user, userBonusTransaction) {
        if (!this.users.has(user.id)) {
            throw new Error("User not found");
        }
        const transaction = {
            ...userBonusTransaction,
            id: `${Date.now()}-${Math.random()}`,
            time: new Date().toISOString(),
        };
        this.transactions.get(user.id).push(transaction);
        return transaction;
    }
    setORMId(id) {
        this.id = id;
    }
}
exports.InMemoryBonusProgramAdapter = InMemoryBonusProgramAdapter;
