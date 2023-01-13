"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
let attributes = {
    /** ID */
    id: {
        type: "string",
        //required: true,
    },
    /** Image items */
    images: "json",
    /** Video items */
    videos: "json",
    /** Dish relation */
    dish: {
        collection: "dish",
        via: "images",
    },
    /** Sort order */
    order: "number",
    /** Group relation */
    group: {
        collection: "group",
        via: "images",
    },
    /** upload date */
    uploadDate: "string",
};
let Model = {
    beforeCreate(imageInit, next) {
        if (!imageInit.id) {
            imageInit.id = (0, uuid_1.v4)();
        }
        next();
    },
};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
