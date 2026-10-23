"use strict";
/**
 * The bonus program implements the spending of virtual bonuses through the adapter.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const normalize_1 = require("../utils/normalize");
const aliveBonusPrograms = {};
/** the coverage as a share of 0..1 (50 - 50%), or null out of 0..100% */
function coverageShare(value) {
    try {
        const share = (0, normalize_1.normalizePercent)(value);
        return share.isNaN() || share.lt(0) || share.gt(1) ? null : share.toNumber();
    }
    catch {
        // not a number at all
        return null;
    }
}
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
    /** How much of the amount of the order bonuses may pay: a share, 0.5 - half; 50 given is taken as 50% */
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
        type: "boolean"
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
        // the share is kept, once: 50 is 0.5; the order takes it as is
        if (init.coveragePercentage !== undefined) {
            const share = coverageShare(init.coveragePercentage);
            if (share === null)
                return cb(`coveragePercentage must be from 0 to 100%, not ${init.coveragePercentage}`);
            init.coveragePercentage = share;
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
            const share = coverageShare(valuesToUpdate.coveragePercentage);
            if (share === null)
                return cb(`coveragePercentage must be from 0 to 100%, not ${valuesToUpdate.coveragePercentage}`);
            valuesToUpdate.coveragePercentage = share;
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
            // a program is served only by the adapter its module made alive (`alive`)
            const alive = aliveBonusPrograms[bonusProgram.adapter];
            if (!alive)
                throw `BonusProgram ${adapterOrId} is not alive`;
            return alive;
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
