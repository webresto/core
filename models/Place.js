"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const place_1 = require("../lib/place");
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
    title: "string",
    address: "string",
    order: "number",
    phone: "string",
    enable: {
        type: "boolean",
    },
    worktime: "json",
    isPickupPoint: "boolean",
    /**
     * TODO: Idea for cooking poin ballancing + wortime
     */
    // cookingPointFallback: {
    //   model: "place",
    // },
    isCookingPoint: "boolean",
    /** The point has a room to eat in: what `dine-in` orders are taken at. */
    hasDiningArea: {
        type: "boolean",
        defaultsTo: false,
    },
    /** Which city's list of points this one is in. */
    city: {
        model: "city",
    },
    /** Geographic position of the point. Required only by geo/route kitchen modes. */
    coordinate: {
        type: "json",
    },
    customData: "json",
};
let Model = {
    beforeCreate(placeInit, cb) {
        if (!placeInit.id) {
            placeInit.id = (0, uuid_1.v4)();
        }
        try {
            if (placeInit.coordinate !== undefined && placeInit.coordinate !== null) {
                (0, place_1.assertCoordinate)(placeInit.coordinate);
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
                (0, place_1.assertCoordinate)(placeUpdate.coordinate);
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
