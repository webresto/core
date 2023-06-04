"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
// type Optional<T> = {
//   [P in keyof T]?: T[P];
// }
let attributes = {
    /** ID */
    id: {
        type: "string",
        //required: true,
    },
    active: {
        type: 'boolean'
    },
    balance: {
        type: 'number'
    },
    isDeleted: {
        type: 'boolean',
    },
    user: {
        model: 'user'
    },
    bonusProgram: {
        model: 'bonusprogram'
    },
    /** UNIX era seconds */
    syncedToTime: "string",
    customData: "json",
};
let Model = {
    beforeCreate(UserBonusInit, next) {
        if (!UserBonusInit.id) {
            UserBonusInit.id = (0, uuid_1.v4)();
        }
        next();
    },
    async registration(user, adapterOrId) {
        const bp = await BonusProgram.getAdapter(adapterOrId);
        await bp.registration(user);
        return await UserBonusProgram.create({
            user: user.id,
            active: true,
            balance: 0,
            isDeleted: false,
            bonusProgram: bp.id,
            syncedToTime: "0"
        }).fetch();
    }
};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
