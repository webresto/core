"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let attributes = {
    id: {
        type: "number",
        autoIncrement: true,
    },
    /**
     * Sort order
     * */
    sortOrder: "number",
    /** MediaFile reference */
    mediafile_dish: {
        model: 'mediafile'
    },
    mediafile_group: {
        model: 'mediafile'
    },
    /** Group relation */
    group: {
        model: "group"
    },
    /** Dish relation */
    dish: {
        model: "dish"
    },
};
let Model = {
    beforeCreate(imageInit, cb) {
        if (imageInit.sortOrder === null || imageInit.sortOrder === undefined)
            imageInit.sortOrder = 0;
        cb();
    }
};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
