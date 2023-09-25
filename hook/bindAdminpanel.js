"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const settings_1 = __importDefault(require("../libs/adminpanel/model/settings"));
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
