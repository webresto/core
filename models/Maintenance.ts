import ORMModel from "../modelsHelp/ORMModel";
import ORM from "../modelsHelp/ORM";
import { v4 as uuid } from 'uuid';
import  {between}  from "../lib/causes";
import getEmitter from "../lib/getEmitter";
const moment = require('moment');

module.exports = {
  attributes: {
    id: {
      type: 'string',
      primaryKey: true
    },
    title: 'string',
    description: 'string',
    enable: {
      type: 'boolean',
      defaultsTo: true
    },
    reason: 'string',
    section: {
      type: 'string',
      enum: ['dostavka', 'samovivoz', 'bron_stola'],
    },
    startDate: 'datetime',
    stopDate: 'datetime'
  },
  beforeCreate: function (paymentMethod, next) {
    paymentMethod.id = uuid();
    next();
  },
  afterUpdate: function (record, next) {
    getEmitter().emit('core-maintenance-changed', record);
    next();
  },
  afterCreate: function (record, next) {
    getEmitter().emit('core-maintenance-changed', record);
    next();
  },

  siteIsOff: async function(){
    let maints = await Maintenance.find({enable: true});
    if (!maints.length) {
      false
    }

    maints = maints.filter(s => {
      let start: number, stop: number;
      if (s.startDate){
        //@ts-ignore
        start = s.startDate.getTime();
      }

      if (s.stopDate){
        //@ts-ignore
        stop = s.stopDate.getTime();
      }

      const now = moment().valueOf();
      return between(start, stop, now);
    });

    return maints.length ? true : false;
  }
};

/**
 * Описывает модель "работы на сайте"
 */
export default interface Maintenance extends ORM {
  id: number;
  title: string;
  description: string;
  enable: boolean;
  startDate: string;
  stopDate: string;
}

/**
 * Описывает класс Maintenance, используется для ORM
 */
export interface MaintenanceModel extends ORMModel<Maintenance> {}

declare global {
  const Maintenance: MaintenanceModel;
}
