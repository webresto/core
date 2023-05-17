"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
let attributes = {
    /** ID */
    id: {
        type: "string",
        //required: true,
    },
    name: {
        type: "string",
        allowNull: true,
    },
    city: {
        type: "string",
        allowNull: true,
    },
    home: {
        type: "string",
        allowNull: true,
    },
    housing: {
        type: "string",
        allowNull: true,
    },
    index: {
        type: "string",
        allowNull: true,
    },
    entrance: {
        type: "string",
        allowNull: true,
    },
    floor: {
        type: "string",
        allowNull: true,
    },
    apartment: {
        type: "string",
        allowNull: true,
    },
    doorphone: {
        type: "string",
        allowNull: true,
    },
    street: {
        model: 'street',
    },
    user: {
        model: 'user',
    },
    comment: "string",
    customData: "json",
};
let Model = {
    beforeCreate(UserLocationInit, next) {
        if (!UserLocationInit.id) {
            UserLocationInit.id = (0, uuid_1.v4)();
        }
        next();
    },
};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
