"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class BonusAdapter {
    InitBonusAdapter;
    constructor(InitBonusAdapter) {
        this.InitBonusAdapter = InitBonusAdapter;
        BonusProgram.alive(this);
    }
    /**
     * Метод для создания и получения уже существующего Payment адаптера
     * @param params - параметры для инициализации
     */
    static getInstance(...params) {
        return BonusAdapter.prototype;
    }
}
exports.default = BonusAdapter;
