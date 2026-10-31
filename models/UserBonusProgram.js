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
    /** When the balance was synced last, ISO time; "0" - never */
    syncedToTime: "string",
    customData: "json",
};
/**
 * The user of a membership goes out again to the subscription `user`, a storefront takes the bonuses with the user.
 * `publish` is what graphql gives to the models it serves; without graphql there is no one to tell.
 */
async function publishUser(membership) {
    const users = User;
    if (!users.publish)
        return;
    try {
        await users.publish(membership.user);
    }
    catch (error) {
        sails.log.error(`UserBonusProgram > publish user ${membership.user}`, error);
    }
}
let Model = {
    beforeCreate(init, cb) {
        if (!init.id) {
            init.id = (0, uuid_1.v4)();
        }
        cb();
    },
    // a membership written - the balance, joining, leaving - publishes its user; a sync that finds the balance unchanged
    // writes only its time and skips these
    async afterCreate(record, cb) {
        await publishUser(record);
        cb();
    },
    async afterUpdate(record, cb) {
        await publishUser(record);
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
    /**
     * Syncs every active membership of the user synced longer than TIME_TO_SYNC_BONUSES_IN_MINUTES ago. Called on every
     * request of a logged-in device and not awaited there: it never throws, a failure is only logged.
     */
    async syncAll(user) {
        // a device bound to no one
        if (!user)
            return;
        try {
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
                    // Not await for parallel sync; sync never throws
                    UserBonusProgram.sync(user.id, userBonusProgram.bonusProgram);
                }
            }
        }
        catch (error) {
            sails.log.error(`UserBonusProgram > syncAll`, error);
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
            // the time throttles syncAll. Alone it is written past the callbacks: a written membership publishes its user,
            // and an unchanged balance has nothing to tell
            const syncedToTime = new Date().toISOString();
            if (extBalance !== userBonusProgram.balance) {
                await UserBonusProgram.update({ id: userBonusProgram.id }, { balance: extBalance, syncedToTime }).fetch();
            }
            else {
                await UserBonusProgram.update({ id: userBonusProgram.id }, { syncedToTime }).meta({ skipAllLifecycleCallbacks: true }).fetch();
            }
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
