"use strict";
/**
 * The bonus program implements the spending of virtual bonuses through the adapter.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const alivedBonusPrograms = {};
let attributes = {
    /** ID */
    id: {
        type: "string",
        //required: true,
    },
    adapter: {
        type: "string",
        required: true,
    },
    /** Exchange price for website currency */
    exchangeRate: "number",
    /** How much can you spend from the amount of the order */
    coveragePercentage: "number",
    decimals: "number",
    sortOrder: "number",
    description: "string",
    /** user option */
    enable: {
        type: "boolean",
        required: true,
    },
    customData: "json",
};
let Model = {
    beforeCreate(init, next) {
        if (!init.id) {
            init.id = (0, uuid_1.v4)();
        }
        if (init.coveragePercentage > 1) {
            init.coveragePercentage = 1;
        }
        else if (init.coveragePercentage < 0) {
            init.coveragePercentage = 0;
        }
        next();
    },
    /**
     * Method for registration alived bonus program adapter
     * @param bonusProgramAdapter
     * @returns
     */
    async alive(bonusProgramAdapter) {
        let knownBonusProgram = await BonusProgram.findOne({
            adapter: bonusProgramAdapter.InitBonusProgramAdapter.adapter,
        });
        if (!knownBonusProgram) {
            knownBonusProgram = await BonusProgram.create({ ...bonusProgramAdapter.InitBonusProgramAdapter, enable: false }).fetch();
        }
        alivedBonusPrograms[bonusProgramAdapter.InitBonusProgramAdapter.adapter] = bonusProgramAdapter;
        sails.log.verbose("PaymentMethod > alive", knownBonusProgram, alivedBonusPrograms[bonusProgramAdapter.InitBonusProgramAdapter.adapter]);
        return;
    },
    /**
     * Method for registration alived bonus program adapter
     * @param bonusProgramAdapterId string
     * @returns
     */
    async getAdapter(bonusProgramId) {
        let bonusProgram = await BonusProgram.findOne({
            id: bonusProgramId,
        });
        if (bonusProgram && bonusProgram.enabled && alivedBonusPrograms[bonusProgram.adapter] !== undefined) {
            return alivedBonusPrograms[bonusProgram.adapter];
        }
        else {
            // here should find the adapter by adapter/index.ts 
            throw `BonusProgram ${bonusProgramId} no alived`;
        }
    },
    /**
     * Method for registration alived bonus program adapter
     * @param bonusProgramAdapterId string
     * @returns
     */
    async isAlived(bonusProgramId) {
        let bonusProgram = await BonusProgram.getAdapter(bonusProgramId);
        return bonusProgram !== undefined;
    },
    /**
     * Returns an array with currently possible bonus programs by order
     * @return BonusProgram[]
     */
    async getAvailable() {
        return await BonusProgram.find({
            where: {
                or: [
                    {
                        adapter: Object.keys(alivedBonusPrograms),
                        enable: true,
                    }
                ],
            },
            sort: "sortOrder ASC",
        });
    },
};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
