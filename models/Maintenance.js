"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid = require("uuid/v4");
module.exports = {
    attributes: {
        id: {
            type: 'string',
            primaryKey: true
        },
        title: 'string',
        description: 'string',
        enable: {
            type: 'boolean',
            defaultsTo: true
        },
        startDate: 'date',
        stopDate: 'date'
    },
    beforeCreate: function (paymentMethod, next) {
        paymentMethod.id = uuid();
        next();
    }
};
