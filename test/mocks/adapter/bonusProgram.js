"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryBonusProgramAdapter = void 0;
const BonusProgramAdapter_1 = __importDefault(require("../../../adapters/bonusprogram/BonusProgramAdapter"));
const fakerStatic = require("faker");
class InMemoryBonusProgramAdapter extends BonusProgramAdapter_1.default {
    getUserInfo(user) {
        console.log("Method not implemented.");
        return;
    }
    constructor(config) {
        super(config);
        this.transactions = new Map();
        this.users = new Map();
        this.name = "test bonus adapter name";
        this.adapter = "test";
        this.exchangeRate = 10;
        this.coveragePercentage = 0.5;
        this.decimals = 1;
        this.description = "In-memory BonusProgramAdapter (with transactions support)";
        this.balance = {};
        if (config) {
            config.name !== undefined ? this.name = config.name : "";
            config.adapter !== undefined ? this.adapter = config.adapter : "";
            config.exchangeRate !== undefined ? this.exchangeRate = config.exchangeRate : "";
            config.coveragePercentage !== undefined ? this.coveragePercentage = config.coveragePercentage : "";
            config.decimals !== undefined ? this.decimals = config.decimals : "";
            config.description !== undefined ? this.description = config.description : "";
        }
    }
    async registration(user) {
        if (!this.users.has(user.id)) {
            this.users.set(user.id, user);
            this.transactions.set(user.id, []);
        }
        return fakerStatic.random.uuid();
    }
    async delete(user) {
        if (this.users.has(user.id)) {
            this.users.delete(user.id);
            this.transactions.delete(user.id);
        }
    }
    async isRegistered(user) {
        return this.users.has(user.id);
    }
    async getBalance(user, _ubp) {
        if (this.balance[user.id]) {
            return this.balance[user.id];
        }
        else {
            return 0;
        }
    }
    async getTransactions(user, afterTime, limit = 0, skip = 0) {
        const transactions = this.transactions.get(user.id) || [];
        return transactions.filter((transaction) => new Date(transaction.time) > afterTime).slice(skip, limit || undefined);
    }
    async writeTransaction(user, _ubp, userBonusTransaction) {
        if (!this.users.has(user.id)) {
            throw new Error("User not found");
        }
        const balanceAfter = _ubp.balance + (userBonusTransaction.isNegative ? -userBonusTransaction.amount : userBonusTransaction.amount);
        const extId = `${Date.now()}-${Math.random()}`;
        const transaction = {
            ...userBonusTransaction,
            id: extId, // generating a random id
            time: new Date().toISOString(),
            balanceAfter: balanceAfter,
            externalId: extId
        };
        this.transactions.get(user.id).push(transaction);
        this.balance[user.id] = balanceAfter;
        return transaction;
    }
    setORMId(id) {
        this.id = id;
    }
}
exports.InMemoryBonusProgramAdapter = InMemoryBonusProgramAdapter;
