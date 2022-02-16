"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
let attributes = {
    /** ID */
    id: {
        type: "string",
        required: true,
    },
    /** Название улицы */
    name: "string",
    /** Признак того что улица удалена */
    isDeleted: {
        type: 'boolean'
    },
    customData: "json",
};
let Model = {
    beforeCreate(streetInit, next) {
        if (!streetInit.id) {
            streetInit.id = uuid_1.v4();
        }
        next();
    },
};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
