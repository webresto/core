"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class BonusProgramAdapter {
    constructor(InitBonusProgramAdapter) {
        this.InitBonusProgramAdapter = InitBonusProgramAdapter;
        BonusProgram.alive(this);
    }
    /**
     * Метод для создания и получения уже существующего Payment adapterа
     * @param params - параметры для инициализации
     */
    static getInstance(...params) {
        return BonusProgramAdapter.prototype;
    }
}
exports.default = BonusProgramAdapter;
