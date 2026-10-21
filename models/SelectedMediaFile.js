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
    },
    // a storefront asks the product or the group again: its photos changed. Every writer of the photos (the media
    // manager, the RMS, MCP) relinks them - a new order is new rows - so the rows are never updated
    afterCreate(record, cb) {
        emitter.emit("core:selected-media-file-changed", record);
        cb();
    },
    afterDestroy(record, cb) {
        emitter.emit("core:selected-media-file-changed", record);
        cb();
    },
};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
