"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const getEmitter_1 = require("../libs/getEmitter");
const CHECK_INTERVAL = 60000;
sails.on("lifted", function () {
    setInterval(async function () {
        const maintenance = await Maintenance.getActiveMaintenance();
        if (maintenance) {
            getEmitter_1.default().emit("core-maintenance-enabled", maintenance);
        }
        else {
            getEmitter_1.default().emit("core-maintenance-disabled");
        }
    }, CHECK_INTERVAL);
});
let attributes = {
    /** id */
    id: {
        type: "string",
        required: true,
    },
    /** title of maintenance */
    title: "string",
    /** description of maintenance (maybe HTML) */
    description: "string",
    /** is active flag */
    enable: {
        type: "boolean",
        defaultsTo: true,
    },
    worktime: "json",
    startDate: "string",
    stopDate: "string",
};
let Model = {
    beforeCreate: function (paymentMethod, next) {
        paymentMethod.id = uuid_1.v4();
        next();
    },
    siteIsOff: async function () {
        const maintenances = await Maintenance.getActiveMaintenance();
        return maintenances ? true : false;
    },
    // TODO: add turnSiteOff method
    getActiveMaintenance: async function () {
        // TODO: here need add worktime support
        let maintenances = await Maintenance.find({ enable: true });
        maintenances = maintenances.filter((maintenance) => {
            let start, stop;
            if (maintenance.startDate) {
                start = new Date(maintenance.startDate).getTime();
            }
            if (maintenance.stopDate) {
                stop = new Date(maintenance.stopDate).getTime();
            }
            const now = new Date().getTime();
            return between(start, stop, now);
        });
        return maintenances[0];
    },
};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
function between(from, to, a) {
    return (!from && !to) || (!from && to >= a) || (!to && from < a) || (from < a && to >= a);
}
