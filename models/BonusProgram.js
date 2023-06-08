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
        unique: true
    },
    /** Exchange price for website currency */
    exchangeRate: "number",
    /** How much can you spend from the amount of the order */
    coveragePercentage: "number",
    decimals: "number",
    sortOrder: "number",
    description: "string",
    /** Icon link */
    iconLink: "string",
    /** Link for read detail info about bonus program */
    detailInfoLink: "string",
    /** user option */
    enable: {
        type: "boolean",
        required: true,
    },
    automaticUserRegistration: {
        type: "boolean",
    },
    customData: "json",
};
let Model = {
    beforeCreate(init, cb) {
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
        if (!init.automaticUserRegistration) {
            init.automaticUserRegistration = process.env.NODE_ENV !== "production";
        }
        // decimals
        if (!init.decimals) {
            init.decimals = 0;
        }
        cb();
    },
    /**
     * Method for registration alived bonus program adapter
     * @param bonusProgramAdapter
     * @returns
     */
    async alive(bonusProgramAdapter) {
        if (!bonusProgramAdapter.adapter) {
            sails.log.error(`Bonusprogram > alive : Adapter not defined`);
            // safe stop alive, throw  crash sails
            return new Error;
        }
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
                enable: process.env.NODE_ENV !== "production" //For production adapter should be off on strart
            }).fetch();
        }
        bonusProgramAdapter.setORMId(knownBonusProgram.id);
        alivedBonusPrograms[bonusProgramAdapter.adapter] = bonusProgramAdapter;
        sails.log.verbose("PaymentMethod > alive", knownBonusProgram, alivedBonusPrograms[bonusProgramAdapter.adapter]);
        return;
    },
    /**
     * Method for registration alived bonus program adapter
     * @param bonusProgramAdapterId string
     * @returns
     */
    async getAdapter(adapterOrId) {
        let bonusProgram = await BonusProgram.findOne({ where: { or: [{
                        adapter: adapterOrId
                    }, {
                        id: adapterOrId
                    }
                ] }
        });
        if (bonusProgram) {
            if (bonusProgram.enable !== true)
                throw `getAdapter > bonusProgram ${adapterOrId} is disabled`;
            if (alivedBonusPrograms[bonusProgram.adapter] !== undefined) {
                return alivedBonusPrograms[bonusProgram.adapter];
            }
            else {
                // here should find the adapter by adapter/index.ts 
                try {
                    return adapters_1.Adapter.getBonusProgramAdapter(adapterOrId);
                }
                catch (error) {
                    throw `BonusProgram ${adapterOrId} no alived or disabled`;
                }
            }
        }
        else {
            throw `bonusProgram ${adapterOrId} not found`;
        }
    },
    /**
     * Method for registration alived bonus program adapter
     * @param bonusProgramAdapterId string
     * @returns
     */
    async isAlived(adapter) {
        let bonusProgram = await BonusProgram.getAdapter(adapter);
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
