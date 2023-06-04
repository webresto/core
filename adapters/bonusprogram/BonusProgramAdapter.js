"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class BonusProgramAdapter {
    constructor(config) {
        this.config = {};
        this.config = config;
        BonusProgram.alive(this);
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
