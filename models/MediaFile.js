"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
let attributes = {
    /** ID */
    id: {
        type: "string",
        //required: true,
    },
    /** Type of media content */
    //type: {
    //  type: "string",
    //  isIn: ['video', 'image']
    //} as unknown as "video" | "image",
    /** Video/Photo items */
    //content: "json" as unknown as any,
    // DEPRECATED use content instead
    /** Image items */
    images: "json",
    original: "string",
    /** Dish relation */
    dish: {
        collection: "dish",
        via: "images",
    },
    /** Sort order */
    sortOrder: "number",
    /** Group relation */
    group: {
        collection: "group",
        via: "images",
    },
    /** upload date */
    uploadDate: "string",
};
let Model = {
    beforeCreate(imageInit, cb) {
        if (!imageInit.id) {
            imageInit.id = (0, uuid_1.v4)();
        }
        cb();
    },
};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
