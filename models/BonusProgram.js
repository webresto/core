"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
let attributes = {
    /** ID */
    id: {
        type: "string",
        //required: true,
    },
    adapter: {
        type: "string",
        required: true,
    },
    sortOrder: "number",
    description: "string",
    // hasExternalLogic: {
    //   type: "boolean",
    // } as unknown as boolean,
    enable: {
        type: "boolean",
        required: true,
    },
    customData: "json",
};
let Model = {
    beforeCreate(BonusProgramInit, next) {
        if (!BonusProgramInit.id) {
            BonusProgramInit.id = (0, uuid_1.v4)();
        }
        next();
    },
    /**
   */
    async alive(ba) {
        return;
    },
};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
