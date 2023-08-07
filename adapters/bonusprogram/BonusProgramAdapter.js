"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class BonusProgramAdapter {
    id;
    config = {};
    constructor(config) {
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
     * A method for creating and obtaining an existing Bonus Adapter
     * @param params - Parameters for initialization
     *
     */
    static getInstance(config) {
        return BonusProgramAdapter.prototype;
    }
}
exports.default = BonusProgramAdapter;
