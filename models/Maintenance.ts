import ORMModel from "../interfaces/ORMModel";
import ORM from "../interfaces/ORM";
import { v4 as uuid } from 'uuid';
import  {between}  from "../lib/causes";
import getEmitter from "../lib/getEmitter";

const CHECK_INTERVAL = 60000;

sails.on('lifted', function () {
  setInterval(async function () {
    const maintenance = await Maintenance.getActiveMaintenance();
    if (maintenance) {
      getEmitter().emit('core-maintenance-enabled', maintenance)
    } else {
      getEmitter().emit('core-maintenance-disabled')
    }
  }, CHECK_INTERVAL)
});

module.exports = {
  primaryKey: 'id',
  attributes: {
    id: {
      type: 'string',
      
    },
    title: 'string',
    description: 'string',
    enable: {
      type: 'boolean',
      //defaultsTo: true
    },
    startDate: 'string',
    stopDate: 'string'
  },
  beforeCreate: function (paymentMethod, next) {
    paymentMethod.id = uuid();
    next();
  },

  siteIsOff: async function(){
    const maintenances = await Maintenance.getActiveMaintenance();
    return maintenances ? true : false;
  },

  getActiveMaintenance: async function() {
    let maintenances = await Maintenance.find({enable: true});

    maintenances = maintenances.filter(s => {
      let start: number, stop: number;
      if (s.startDate){
        start = s.startDate.getTime();
      }
      if (s.stopDate){
        stop = s.stopDate.getTime();
      }
      const now = moment().valueOf();
      return between(start, stop, now);
    });

    return maintenances[0];
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
