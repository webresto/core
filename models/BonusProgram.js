"use strict";
/**
 * The bonus program implements the spending of virtual bonuses through the adapter.
 */
Object.defineProperty(exports, "__esModule", { value: true });
<<<<<<< HEAD
=======
const adapters_1 = require("../adapters");
>>>>>>> origin/bonuses
const uuid_1 = require("uuid");
const alivedBonusPrograms = {};
let attributes = {
    /** ID */
    id: {
        type: "string",
        //required: true,
    },
<<<<<<< HEAD
    adapter: {
        type: "string",
        required: true,
=======
    name: {
        type: "string",
        required: true,
    },
    adapter: {
        type: "string",
        required: true,
        unique: true
>>>>>>> origin/bonuses
    },
    /** Exchange price for website currency */
    exchangeRate: "number",
    /** How much can you spend from the amount of the order */
    coveragePercentage: "number",
<<<<<<< HEAD
    sortOrder: "number",
    description: "string",
    decimals: "number",
    /** user option */
    enabled: {
=======
    decimals: "number",
    sortOrder: "number",
    description: "string",
    /** Icon link */
    iconLink: "string",
    /** Link for read detail info about bonus program */
    detailInfoLink: "string",
    /** user option */
    enable: {
>>>>>>> origin/bonuses
        type: "boolean",
        required: true,
    },
    customData: "json",
};
let Model = {
<<<<<<< HEAD
    beforeCreate(BonusProgramInit, next) {
        if (!BonusProgramInit.id) {
            BonusProgramInit.id = (0, uuid_1.v4)();
        }
        next();
=======
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
        // decimals
        if (!init.decimals) {
            init.decimals = 0;
        }
        cb();
>>>>>>> origin/bonuses
    },
    /**
     * Method for registration alived bonus program adapter
     * @param bonusProgramAdapter
     * @returns
     */
    async alive(bonusProgramAdapter) {
<<<<<<< HEAD
        let knownBonusProgram = await BonusProgram.findOne({
            adapter: bonusProgramAdapter.InitBonusAdapter.adapter,
        });
        if (!knownBonusProgram) {
            knownBonusProgram = await BonusProgram.create({ ...bonusProgramAdapter.InitBonusAdapter, enabled: false }).fetch();
        }
        alivedBonusPrograms[bonusProgramAdapter.InitBonusAdapter.adapter] = bonusProgramAdapter;
        sails.log.verbose("PaymentMethod > alive", knownBonusProgram, alivedBonusPrograms[bonusProgramAdapter.InitBonusAdapter.adapter]);
=======
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
>>>>>>> origin/bonuses
        return;
    },
    /**
     * Method for registration alived bonus program adapter
     * @param bonusProgramAdapterId string
     * @returns
     */
<<<<<<< HEAD
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
=======
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
                throw `bonusProgram ${adapterOrId} is disabled`;
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
>>>>>>> origin/bonuses
        }
    },
    /**
     * Method for registration alived bonus program adapter
     * @param bonusProgramAdapterId string
     * @returns
     */
<<<<<<< HEAD
    async isAlived(bonusProgramId) {
        let bonusProgram = await BonusProgram.getAdapter(bonusProgramId);
=======
    async isAlived(adapter) {
        let bonusProgram = await BonusProgram.getAdapter(adapter);
>>>>>>> origin/bonuses
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
