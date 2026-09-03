'use strict';

process.env.UNIQUE_SLUG === undefined ? "1" : process.env.UNIQUE_SLUG

export * from './models/BonusProgram';
export * from './models/DeliveryZone';

export * from './models/Dish';
export * from './models/Group';
export * from './models/Maintenance';
export * from './models/MediaFile';
export * from './models/Notification';
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
export * from './libs/NotificationDispatcher'
export * from './libs/NotificationEventRegistry'
export * from './libs/NotificationTypeRegistry'
export * from './libs/NotificationTemplateRenderer'
export * from './libs/NotificationService'
export * from './libs/SetupChecklistRegistry'
export * from './libs/SetupChecklistService'

module.exports = function (sails: any) {
  return {
    defaults: require('./hook/defaults'),
    initialize: require('./hook/initialize').default(sails)
  };
};

module.exports.HookTools = require("./libs/hookTools");

