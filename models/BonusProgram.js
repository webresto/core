"use strict";
/**
 * The bonus program implements the spending of virtual bonuses through the adapter.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const adapters_1 = require("../adapters");
const uuid_1 = require("uuid");
const alivedBonusPrograms = {};
let attributes = {
    /** ID */
    id: {
        type: "string",
        //required: true,
    },
    name: {
        type: "string",
        required: true,
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
        // defaults
        if (!init.coveragePercentage) {
            init.coveragePercentage = 1;
        }
        else if (init.coveragePercentage > 1) {
            init.coveragePercentage = 1;
        }
        else if (init.coveragePercentage < 0) {
            init.coveragePercentage = 0;
        }
        if (!init.exchangeRate) {
            init.exchangeRate = 1;
        }
        // decimals
        if (!init.decimals) {
            init.decimals = 0;
        }
        next();
    },
    /**
     * Method for registration alived bonus program adapter
     * @param bonusProgramAdapter
     * @returns
     */
    async alive(bonusProgramAdapter) {
        if (!bonusProgramAdapter.adapter) {
            throw `name not defined`;
        }
        console.log(bonusProgramAdapter, 8888, bonusProgramAdapter.adapter);
        let knownBonusProgram = await BonusProgram.findOne({
            adapter: bonusProgramAdapter.adapter,
        });
        if (!knownBonusProgram) {
            knownBonusProgram = await BonusProgram.create({
                name: bonusProgramAdapter.name,
                adapter: bonusProgramAdapter.adapter,
                exchangeRate: bonusProgramAdapter.exchangeRate,
                coveragePercentage: bonusProgramAdapter.coveragePercentage,
                decimals: bonusProgramAdapter.decimals,
                description: bonusProgramAdapter.description,
                enable: false
            }).fetch();
        }
        alivedBonusPrograms[bonusProgramAdapter.adapter] = bonusProgramAdapter;
        sails.log.verbose("PaymentMethod > alive", knownBonusProgram, alivedBonusPrograms[bonusProgramAdapter.adapter]);
        return;
    },
    /**
     * Method for registration alived bonus program adapter
     * @param bonusProgramAdapterId string
     * @returns
     */
    async getAdapter(adapter) {
        let bonusProgram = await BonusProgram.findOne({
            adapter: adapter
        });
        if (bonusProgram.enable !== true)
            throw `bonusProgram ${adapter} is disabled`;
        if (bonusProgram && bonusProgram.enable && alivedBonusPrograms[bonusProgram.adapter] !== undefined) {
            return alivedBonusPrograms[bonusProgram.adapter];
        }
        else {
            // here should find the adapter by adapter/index.ts 
            try {
                return adapters_1.Adapter.getBonusProgramAdapter(adapter);
            }
            catch (error) {
                throw `BonusProgram ${adapter} no alived or disabled`;
            }
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
