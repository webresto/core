"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const causes_1 = require("../lib/causes");
const getEmitter_1 = require("../lib/getEmitter");
const moment = require('moment');
const CHECK_INTERVAL = 60000;
sails.on('lifted', function () {
    setInterval(async function () {
        const maintenance = await Maintenance.getActiveMaintenance();
        if (maintenance) {
            getEmitter_1.default().emit('core-maintenance-enabled', maintenance);
        }
        else {
            getEmitter_1.default().emit('core-maintenance-disabled');
        }
    }, CHECK_INTERVAL);
});
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
        startDate: 'string',
        stopDate: 'string'
    },
    beforeCreate: function (paymentMethod, next) {
        paymentMethod.id = uuid_1.v4();
        next();
    },
    siteIsOff: async function () {
        const maintenances = await Maintenance.getActiveMaintenance();
        return maintenances ? true : false;
    },
    getActiveMaintenance: async function () {
        let maintenances = await Maintenance.find({ enable: true });
        maintenances = maintenances.filter(s => {
            let start, stop;
            if (s.startDate) {
                start = s.startDate.getTime();
            }
            if (s.stopDate) {
                stop = s.stopDate.getTime();
            }
            const now = moment().valueOf();
            return causes_1.between(start, stop, now);
        });
        return maintenances[0];
    }
};
