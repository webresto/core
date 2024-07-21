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
    externalId: {
        type: "string"
    },
    /** Name of street */
    name: "string",
    /** City was deleted */
    isDeleted: {
        type: 'boolean'
    },
    customData: "json",
};
let Model = {
    beforeCreate(streetInit, cb) {
        if (!streetInit.id) {
            streetInit.id = (0, uuid_1.v4)();
        }
        cb();
    },
};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
