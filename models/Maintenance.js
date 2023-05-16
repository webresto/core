"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const CHECK_INTERVAL = 60000;
sails.on("lifted", function () {
    setInterval(async function () {
        checkMaintenance();
    }, CHECK_INTERVAL);
});
let attributes = {
    /** id */
    id: {
        type: "string",
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
    afterCreate: function (maintenance, next) {
        checkMaintenance();
        next();
    },
    afterUpdate: function (maintenance, next) {
        checkMaintenance();
        next();
    },
    afterDestroy: function (maintenance, next) {
        checkMaintenance();
        next();
    },
    beforeCreate: function (maintenance, next) {
        maintenance.id = uuid_1.v4();
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
            // When dates interval not set is active maintenance
            if (!maintenance.startDate && !maintenance.stopDate)
                return true;
            // When start or stop date not set, is infinity
            if (!maintenance.startDate)
                maintenance.startDate = "0000";
            if (!maintenance.stopDate)
                maintenance.stopDate = "9999";
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
async function checkMaintenance() {
    const maintenance = await Maintenance.getActiveMaintenance();
    if (maintenance) {
        emitter.emit("core-maintenance-enabled", maintenance);
    }
    else {
        emitter.emit("core-maintenance-disabled");
    }
}
