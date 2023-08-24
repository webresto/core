"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const settings_1 = require("../libs/adminpanel/model/settings");
function bindAdminpanel() {
    sails.on('Adminpanel:afterHook:loaded', async () => {
        processBindAdminpanel();
    });
}
exports.default = bindAdminpanel;
function processBindAdminpanel() {
    if (sails.hooks?.adminpanel?.addModelConfig !== undefined) {
        const addModelConfig = sails.hooks.adminpanel.addModelConfig;
        addModelConfig(settings_1.default);
    }
}
