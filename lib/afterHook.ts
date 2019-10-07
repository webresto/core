import {RMS} from "@webresto/core/adapter/index";

const moment = require('moment-timezone');

declare const sails;

const conf = sails.config.restocore;
const rmsAdapter = RMS.getAdapter(conf.rmsAdapter);

export default function (sails) {
  return async function afterHooksLoaded() {
    try {
      /**
       * rmsAdapter
       */
      rmsAdapter.getInstance(conf[conf.rmsAdapter], conf.images, conf.timeSyncMenu, conf.timeSyncBalance, conf.timeSyncStreets);

      if (conf.timezone)
        moment.tz.setDefault(conf.timezone);

      /**
       * GET ALL DISCOUNTS FOR SERVER FROM IIKO
       */
      /*const request = require('iiko-request');
      request.call({
        type: 'GET',
        path: '/api/0/deliverySettings/deliveryDiscounts',
        params: {
          organization: 'string',
          requestTimeout: 'time'
        }
      }, {
        organization: sails.config.restocore.iiko.organization,
        requestTimeout: '00:01:00'
      }).then(result => {
        console.dir(result, {depth: null, colors: true, maxArrayLength: null});
      }, error => {
        sails.log.error('discounts-for-gf sync error');
        sails.log.error(error);
      });*/
    } catch (e) {
      sails.log.error('core > afterHook > error1', e);
    }
  }
};
