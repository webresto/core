"use strict";
/**
 * The bonus program implements the spending of virtual bonuses through the adapter.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const adapters_1 = require("../adapters");
const uuid_1 = require("uuid");
const normalize_1 = require("../utils/normalize");
const aliveBonusPrograms = {};
let attributes = {
    /** ID */
    id: {
        type: "string",
        //required: true,
    },
    externalId: {
        type: "string"
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
        if (init.coveragePercentage !== undefined) {
            init.coveragePercentage = (0, normalize_1.normalizePercent)(init.coveragePercentage).toNumber();
        }
        else {
            init.coveragePercentage = 1;
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
    beforeUpdate(valuesToUpdate, cb) {
        if (valuesToUpdate.coveragePercentage !== undefined) {
            valuesToUpdate.coveragePercentage = (0, normalize_1.normalizePercent)(valuesToUpdate.coveragePercentage).toNumber();
        }
        cb();
    },
    /**
     * Method for registration alive bonus program adapter
     * @param bonusProgramAdapter
     * @returns
     */
    async alive(bonusProgramAdapter) {
        if (!bonusProgramAdapter.adapter) {
            sails.log.error(`Bonusprogram > alive : Adapter not defined`);
            // safe stop alive, throw crash sails
            return new Error;
        }
        let knownBonusProgram = await BonusProgram.findOne({
            adapter: bonusProgramAdapter.adapter,
        });
        if (!knownBonusProgram) {
            knownBonusProgram = await BonusProgram.create({
                name: bonusProgramAdapter.name,
                externalId: bonusProgramAdapter.id,
                adapter: bonusProgramAdapter.adapter,
                exchangeRate: bonusProgramAdapter.exchangeRate,
                coveragePercentage: bonusProgramAdapter.coveragePercentage,
                decimals: bonusProgramAdapter.decimals,
                description: bonusProgramAdapter.description,
                enable: process.env.NODE_ENV !== "production" //For production adapter should be off on start
            }).fetch();
        }
        bonusProgramAdapter.setORMId(knownBonusProgram.id);
        aliveBonusPrograms[bonusProgramAdapter.adapter] = bonusProgramAdapter;
        sails.log.silly("PaymentMethod > alive", knownBonusProgram, aliveBonusPrograms[bonusProgramAdapter.adapter]);
        return;
    },
    /**
     * Method for registration alive bonus program adapter
     * @returns BonusProgramAdapter
     * @param adapterOrId
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
            if (aliveBonusPrograms[bonusProgram.adapter] !== undefined) {
                return aliveBonusPrograms[bonusProgram.adapter];
            }
            else {
                // here should find the adapter by adapter/index.ts
                try {
                    return adapters_1.Adapter.getBonusProgramAdapter(adapterOrId);
                }
                catch (error) {
                    throw `BonusProgram ${adapterOrId} no alive or disabled`;
                }
            }
        }
        else {
            throw `bonusProgram ${adapterOrId} not found`;
        }
    },
    /**
     * Method for registration alive bonus program adapter
     * @returns
     * @param adapter
     */
    async isAlive(adapter) {
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
                // @ts-ignore TODO: First fix types
                and: [
                    { adapter: { in: Object.keys(aliveBonusPrograms) } },
                    { enable: true }
                ]
            },
            sort: "sortOrder ASC"
        });
    }
};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
