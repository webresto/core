/**
 * @api {API} Street Street
 * @apiGroup Models
 * @apiDescription Модель улицы
 *
 * @apiParam {String} id ID улицы
 * @apiParam {String} name Название улицы
 * @apiParam {String} classifierId Идентификатор улицы в классификаторе, например, КЛАДР.
 *
 */

module.exports = {
  attributes: {
    id: {
      type: 'string',
      required: true,
      primaryKey: true
    },
    name: {
      type: 'string'
    },
    classifierId: {
      type: 'string'
    }
  }
};

