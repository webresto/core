"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
function assertCoordinate(value) {
    if (!value || typeof value !== "object") {
        throw new Error("Place coordinate must be an object with lat and lng");
    }
    const coordinate = value;
    if (typeof coordinate.lat !== "number" ||
        !Number.isFinite(coordinate.lat) ||
        coordinate.lat < -90 ||
        coordinate.lat > 90 ||
        typeof coordinate.lng !== "number" ||
        !Number.isFinite(coordinate.lng) ||
        coordinate.lng < -180 ||
        coordinate.lng > 180) {
        throw new Error("Place coordinate must contain a valid latitude and longitude");
    }
}
let attributes = {
    id: {
        type: "string",
        //required: true,
    },
    /** Terminal or department identifier in the RMS. Empty until an RMS maps this point. */
    rmsId: {
        type: "string",
        allowNull: true,
    },
    title: 'string',
    address: 'string',
    order: 'number',
    phone: 'string',
    enable: {
        type: 'boolean'
    },
    worktime: 'json',
    isPickupPoint: 'boolean',
    isCookingPoint: 'boolean',
    isSalePoint: 'boolean',
    /** Geographic position of the point. Required only by geo/route kitchen modes. */
    coordinate: {
        type: 'json',
    },
    customData: 'json'
};
let Model = {
    beforeCreate(placeInit, cb) {
        if (!placeInit.id) {
            placeInit.id = (0, uuid_1.v4)();
        }
        try {
            if (placeInit.coordinate !== undefined && placeInit.coordinate !== null) {
                assertCoordinate(placeInit.coordinate);
            }
            cb();
        }
        catch (error) {
            cb(error instanceof Error ? error.message : String(error));
        }
    },
    beforeUpdate(placeUpdate, cb) {
        try {
            if (placeUpdate.coordinate !== undefined && placeUpdate.coordinate !== null) {
                assertCoordinate(placeUpdate.coordinate);
            }
            cb();
        }
        catch (error) {
            cb(error instanceof Error ? error.message : String(error));
        }
    },
};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
