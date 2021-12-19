"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
let attributes = {
    id: "string",
    title: 'string',
    address: 'string',
    order: 'integer',
    phone: 'string',
    enable: {
        type: 'boolean',
        defaultsTo: true,
        required: true
    },
    worktime: 'json',
    isPickupPoint: 'boolean',
    isCookingPoint: 'boolean',
    isSalePoint: 'boolean',
    customData: 'json'
};
let Model = {
    beforeCreate(placeInit, next) {
        if (!placeInit.id) {
            placeInit.id = uuid_1.v4();
        }
        next();
    },
};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
