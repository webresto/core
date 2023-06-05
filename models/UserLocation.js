"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
let attributes = {
    /** ID */
    id: {
        type: "string",
        //required: true,
    },
    name: {
        type: "string",
        allowNull: true,
    },
    city: {
        type: "string",
        allowNull: true,
    },
    home: {
        type: "string",
        allowNull: true,
    },
    housing: {
        type: "string",
        allowNull: true,
    },
    index: {
        type: "string",
        allowNull: true,
    },
    entrance: {
        type: "string",
        allowNull: true,
    },
    floor: {
        type: "string",
        allowNull: true,
    },
    apartment: {
        type: "string",
        allowNull: true,
    },
    doorphone: {
        type: "string",
        allowNull: true,
    },
    street: {
        model: 'street',
        required: true
    },
    /**
     * Set as default for specific user
     * */
    isDefault: {
        type: 'boolean',
    },
    user: {
        model: 'user',
        required: true
    },
    comment: {
        type: "string",
        allowNull: true,
    },
    customData: "json",
};
let Model = {
    async beforeUpdate(record, cb) {
        if (record.isDefault === true) {
            await UserLocation.update({ user: record.user }, { isDefault: false });
        }
        cb();
    },
    async beforeCreate(init, cb) {
        if (!init.id) {
            init.id = (0, uuid_1.v4)();
        }
        if (!init.name) {
            const street = await Street.findOne({ id: init.street });
            init.name = `${street.name} ${init.home}`;
        }
        if (init.isDefault === true) {
            await UserLocation.update({ user: init.user }, { isDefault: false });
        }
        cb();
    }
};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
