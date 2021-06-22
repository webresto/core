"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const causes_1 = require("../lib/causes");
// import getEmitter from "../lib/getEmitter";
const moment = require('moment');
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
        startDate: 'datetime',
        stopDate: 'datetime'
    },
    beforeCreate: function (paymentMethod, next) {
        paymentMethod.id = uuid_1.v4();
        next();
    },
    siteIsOff: async function () {
        let maints = await Maintenance.find({ enable: true });
        if (!maints.length) {
            false;
        }
        maints = maints.filter(s => {
            let start, stop;
            if (s.startDate) {
                //@ts-ignore
                start = s.startDate.getTime();
            }
            if (s.stopDate) {
                //@ts-ignore
                stop = s.stopDate.getTime();
            }
            const now = moment().valueOf();
            return causes_1.between(start, stop, now);
        });
        return maints.length ? true : false;
    }
};
