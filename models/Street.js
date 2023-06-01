"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
let attributes = {
    /** ID */
    id: {
        type: "string",
        //required: true,
    },
    /** Id in external system */
    exId: {
        type: "string"
    },
    /** Name of street */
    name: "string",
    /** Street has delited */
    isDeleted: {
        type: 'boolean'
    },
    customData: "json",
};
let Model = {
    beforeCreate(streetInit, next) {
        if (!streetInit.id) {
            streetInit.id = (0, uuid_1.v4)();
        }
        next();
    },
};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
