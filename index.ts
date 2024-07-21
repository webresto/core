'use strict';

process.env.UNIQUE_SLUG === undefined ? "1" : process.env.UNIQUE_SLUG

export * from './models/BonusProgram';
export * from './models/Dish';
export * from './models/Group';
export * from './models/Maintenance';
export * from './models/MediaFile';
export * from './models/OneTimePassword';
export * from './models/Order';
export * from './models/OrderDish';
export * from './models/PaymentDocument';
export * from './models/PaymentMethod';
export * from './models/Place';
export * from './models/Settings';
export * from './models/City';
export * from './models/Street';
export * from './models/User';
export * from './models/UserBonusProgram';
export * from './models/UserBonusTransaction';
export * from './models/UserDevice';
export * from './models/UserLocation';
export * from './models/UserOrderHistory';
export * from './models/Promotion';

// Helpers
export * from './libs/helpers/OrderHelper'

module.exports = function (sails) {
  return {
    defaults: require('./hook/defaults'),
    initialize: require('./hook/initialize').default(sails)
  };
};

module.exports.HookTools = require("./libs/hookTools");

