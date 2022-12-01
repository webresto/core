"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
let attributes = {
    /** ID */
    id: {
        type: "string",
        //required: true,
    },
    firstName: 'string',
    lastName: 'string',
    email: {
        type: 'string'
    },
    phone: {
        type: 'string',
        unique: true,
        required: true
    },
    birthday: {
        type: 'string'
    },
    passwordHash: {
        type: 'string'
    },
    favorites: {
        collection: 'dish'
    },
    history: {
        collection: 'order',
    },
    avatar: "string",
    // location: {
    //   collection: 'UserLocation',
    //   via: 'user'
    // },
    verified: {
        type: 'boolean'
    },
    lastActive: 'string',
    isDeleted: {
        type: 'boolean'
    },
    customData: "json",
};
let Model = {
    beforeCreate(userInit, next) {
        if (!userInit.id) {
            userInit.id = (0, uuid_1.v4)();
        }
        next();
    },
};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
