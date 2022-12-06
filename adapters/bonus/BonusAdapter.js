"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class BonusAdapter {
    constructor(InitBonusAdapter) {
        this.InitBonusAdapter = InitBonusAdapter;
        BonusProgram.alive(this);
    }
}
exports.default = BonusAdapter;
