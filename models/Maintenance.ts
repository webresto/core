import ORMModel from "../modelsHelp/ORMModel";
import ORM from "../modelsHelp/ORM";
import uuid = require('uuid/v4');


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
    startDate: 'date',
    stopDate: 'date'
  },
  beforeCreate: function (paymentMethod, next) {
    paymentMethod.id = uuid();
    next();
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
