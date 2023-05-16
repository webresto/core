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
    BonusProgram: {
        model: 'bonusprogram'
    },
    /** UNIX era seconds */
    syncedToTime: "string",
    customData: "json",
};
let Model = {
    beforeCreate(UserBonusInit, next) {
        if (!UserBonusInit.id) {
            UserBonusInit.id = uuid_1.v4();
        }
        next();
    },
};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
