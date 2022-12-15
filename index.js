'use strict';
module.exports = function (sails) {
    return {
        defaults: require('./hook/defaults'),
        initialize: require('./hook/initialize').default(sails)
    };
};
module.exports.HookTools = require("./libs/hookTools");
