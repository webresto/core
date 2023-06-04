"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockBonusProgramAdapter = void 0;
const BonusProgramAdapter_1 = require("../../../adapters/bonusprogram/BonusProgramAdapter");
class MockBonusProgramAdapter extends BonusProgramAdapter_1.default {
    constructor(config) {
        super(config);
        this.name = "test bonus adapter name";
        this.adapter = "test";
        this.exchangeRate = 10;
        this.coveragePercentage = 0.5;
        this.decimals = 1;
        this.description = "Mock for BonusProgramAdapter";
    }
    async registration(user) {
        return;
    }
    delete(user) {
        throw new Error("Method not implemented.");
    }
    isRegistred(user) {
        throw new Error("Method not implemented.");
    }
    getBalance(user) {
        throw new Error("Method not implemented.");
    }
    getTransactions(user, afterTime, limit, skip) {
        throw new Error("Method not implemented.");
    }
    // Implement required methods here
    async writeTransaction(bonusProgram, user, transaction) {
        // Your logic here
    }
    async readTransaction(bonusProgram, user) {
        // Your logic here
    }
    async balance(user, bonusProgram) {
        // Your logic here
    }
    async applyBonus(bonusProgram, user, order) {
        // Your logic here
    }
}
exports.MockBonusProgramAdapter = MockBonusProgramAdapter;
