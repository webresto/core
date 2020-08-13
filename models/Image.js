"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
module.exports = {
    attributes: {
        id: {
            type: 'string',
            required: true,
            primaryKey: true
        },
        images: 'json',
        dish: {
            collection: 'dish',
            via: 'images'
        },
        group: {
            model: 'group',
            via: 'images'
        },
        uploadDate: 'string'
    }
};
