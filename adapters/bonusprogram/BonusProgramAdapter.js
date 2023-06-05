"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
<<<<<<< HEAD
class BonusAdapter {
    InitBonusAdapter;
    constructor(InitBonusAdapter) {
        this.InitBonusAdapter = InitBonusAdapter;
        BonusProgram.alive(this);
    }
    /**
     * Метод для создания и получения уже существующего Payment adapterа
     * @param params - параметры для инициализации
     */
    static getInstance(...params) {
        return BonusAdapter.prototype;
    }
}
exports.default = BonusAdapter;
=======
class BonusProgramAdapter {
    constructor(config) {
        this.config = {};
        this.config = config;
    }
    /**
     * method for set ORMid
     * this.id = id;
     */
    setORMId(id) {
        this.id = id;
    }
    /**
     * A method for creating and obtaining an existing Payment Adapter
     * @param params - Parameters for initialization
     */
    static getInstance(...params) {
        return BonusProgramAdapter.prototype;
    }
}
exports.default = BonusProgramAdapter;
>>>>>>> origin/bonuses
