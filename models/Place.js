"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
module.exports = {
    primaryKey: "id",
    attributes: {
        id: {
            type: "string",
            required: true
        },
        isKitchen: 'boolean',
        isPointOfSale: 'boolean',
        isPickupPoint: 'boolean',
        options: 'json'
    },
};
