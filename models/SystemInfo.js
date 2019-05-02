/**
 * @api {API} SystemInfo SystemInfo
 * @apiGroup Models
 * @apiDescription Системная информация (в данный момент ревизия)
 *
 * @apiParam {Integer} id ID
 * @apiParam {String} key Ключ доступа к свойству
 * @apiParam {String} value Значение свойства
 * @apiParam {String} section Секция, к которой относится свойство
 *
 */

module.exports = {
  attributes: {
    id: {
      type: 'integer',
      autoIncrement: true,
      primaryKey: true
    },
    key: 'string',
    value: 'string',
    section: 'string'
    /*revision: 'string',
    revisionStopList: 'string',
    revisionOrders: 'string',
    data: 'json',
    email: 'string',
    checkProblem: 'string',
    orderProblem: 'string'*/
  }
};

