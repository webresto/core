"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const serveStatic = require("serve-static");
const path = require("path");
function default_1() {
    sails.hooks.http.app.use('/restocore/assets', serveStatic(path.join(__dirname, '../assets')));
}
exports.default = default_1;
;
