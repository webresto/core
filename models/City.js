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
    slug: "string",
    boundingBox: "json",
    /**
     * Base URL of the backend serving this city, e.g. `https://api.tyumen.example`.
     * The storefront switches to it when the customer picks the city. Rows are
     * mirrored across servers, so the value is always absolute; null only on a
     * single-server installation where there is nothing to switch to.
     */
    url: "string",
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
