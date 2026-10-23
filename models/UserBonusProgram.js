"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const decimal_js_1 = __importDefault(require("decimal.js"));
// type Optional<T> = {
//   [P in keyof T]?: T[P];
// }
let attributes = {
    /** UserBonusProgram ID */
    id: {
        type: "string",
        //required: true,
    },
    /** External id for bonus program */
    externalId: {
        type: "string"
    },
    /** id for customer in external program */
    externalCustomerId: {
        type: "string"
    },
    balance: {
        type: 'number'
    },
    isDeleted: {
        type: 'boolean',
    },
    isActive: {
        type: 'boolean',
    },
    user: {
        model: 'user',
        required: true
    },
    bonusProgram: {
        model: 'bonusprogram'
    },
    /** UNIX era seconds */
    syncedToTime: "string",
    customData: "json",
};
let Model = {
    beforeCreate(init, cb) {
        if (!init.id) {
            init.id = (0, uuid_1.v4)();
        }
        cb();
    },
    async registration(user, adapterOrId) {
        const bp = await BonusProgram.getAdapter(adapterOrId);
        // TODO: this new standard call for models methods (Object or string)
        if (typeof user === "string") {
            user = await User.findOne({ id: user });
        }
        let extId = await bp.registration(user);
        const values = { balance: 0, externalId: extId, isActive: true, isDeleted: false, syncedToTime: "0" };
        // one membership per user and program: joining again after leaving takes the same row
        const kept = await UserBonusProgram.findOne({ user: user.id, bonusProgram: bp.id });
        if (kept)
            return await UserBonusProgram.updateOne({ id: kept.id }).set(values);
        return await UserBonusProgram.create({ user: user.id, bonusProgram: bp.id, ...values }).fetch();
    },
    /** the user leaves this program: the membership stays as left, so a login does not put them back */
    async delete(user, adapterOrId) {
        const bp = await BonusProgram.getAdapter(adapterOrId);
        if (typeof user === "string") {
            user = await User.findOne({ id: user });
        }
        await bp.delete(user);
        await UserBonusProgram.update({ user: user.id, bonusProgram: bp.id }, {
            isDeleted: true,
            isActive: false,
        }).fetch();
        return;
    },
    // Sync all active user bonusprogram
    async syncAll(user) {
        if (typeof user === "string") {
            user = await User.findOne({ id: user });
            if (!user)
                throw `syncAll > user not found`;
        }
        const userBonusPrograms = await UserBonusProgram.find({ user: user.id });
        for (const userBonusProgram of userBonusPrograms) {
            if (!userBonusProgram.isActive)
                continue;
            // Skip if less TIME_TO_SYNC_BONUSES_IN_MINUTES
            const diffInMinutes = (Math.abs(new Date().getTime() - new Date(userBonusProgram.syncedToTime).getTime())) / (1000 * 60);
            const timeToSyncBonusesInMinutes = await Settings.get("TIME_TO_SYNC_BONUSES_IN_MINUTES") ?? 15;
            if (diffInMinutes < timeToSyncBonusesInMinutes)
                continue;
            if (await BonusProgram.isAlive(userBonusProgram.bonusProgram)) {
                // Not await for parallel sync
                UserBonusProgram.sync(user.id, userBonusProgram.bonusProgram);
            }
        }
    },
    async sync(user, bonusProgram) {
        try {
            if (typeof user === "string") {
                user = await User.findOne({ id: user });
            }
            if (typeof bonusProgram === "string") {
                bonusProgram = await BonusProgram.findOne({ id: bonusProgram });
            }
            if (!user || !bonusProgram) {
                throw `User or BonusProgram not found: user: [${user.id}] bonusProgram: [${bonusProgram}]`;
            }
            const userBonusProgram = await UserBonusProgram.findOne({ user: user.id, bonusProgram: bonusProgram.id });
            if (!userBonusProgram) {
                throw `UserBonusProgram not found: user: [${user.id}] bonusProgram: [${bonusProgram}]`;
            }
            if (!user || !bonusProgram || !userBonusProgram) {
                throw `sync > user, bonusprogram, userBonusProgram not found`;
            }
            const adapter = await BonusProgram.getAdapter(bonusProgram.adapter);
            let extBalance = parseFloat(new decimal_js_1.default(await adapter.getBalance(user, userBonusProgram)).toFixed(bonusProgram.decimals));
            sails.log.debug(`Start full sync UserBonusProgram for user ${user.id}`);
            await UserBonusProgram.update({ id: userBonusProgram.id }, { balance: extBalance }).fetch();
            // point for call update SyncTransactions
        }
        catch (error) {
            sails.log.error(error);
        }
    },
};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
