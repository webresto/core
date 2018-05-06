'use strict';

module.exports = function (sails) {
    return {
        initialize: require('./lib/initialize')(sails)
    };
};
