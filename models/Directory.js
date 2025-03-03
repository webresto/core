"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
let attributes = {
    /** ID */
    id: {
        type: "string",
    },
    /** Name of directory */
    name: "string",
    /** Slug of directory */
    slug: "string",
};
let Model = {
    beforeCreate(directoryInit, cb) {
        if (!directoryInit.id) {
            directoryInit.id = (0, uuid_1.v4)();
        }
        cb();
    },
};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
