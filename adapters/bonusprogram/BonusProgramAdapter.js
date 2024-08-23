"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
     * A method for creating and obtaining an existing Bonus Adapter
     *
     * @param config
     */
    static getInstance(config) {
        return BonusProgramAdapter.prototype;
    }
}
exports.default = BonusProgramAdapter;
