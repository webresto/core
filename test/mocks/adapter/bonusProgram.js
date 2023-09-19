"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryBonusProgramAdapter = void 0;
const BonusProgramAdapter_1 = __importDefault(require("../../../adapters/bonusprogram/BonusProgramAdapter"));
class InMemoryBonusProgramAdapter extends BonusProgramAdapter_1.default {
    constructor(config) {
        super(config);
        this.transactions = new Map();
        this.users = new Map();
        this.name = "test bonus adapter name";
        this.adapter = "test";
        this.exchangeRate = 10;
        this.coveragePercentage = 0.5;
        this.decimals = 1;
        this.description = "In-memory BonusProgramAdapter";
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
