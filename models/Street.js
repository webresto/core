/**
 * @api {API} Street Street
 * @apiGroup Models
 * @apiDescription Модель улицы
 *
 * @apiParam {String} id ID улицы
 * @apiParam {String} name Название улицы
 * @apiParam {String} classifierId Идентификатор улицы в классификаторе, например, КЛАДР.
 * @apiParam {Boolean} isDeleted Удалена ли улица
 *
 */

module.exports = {
  attributes: {
    id: {
      type: 'string',
      required: true,
      primaryKey: true
    },
    name: 'string',
    classifierId: 'string',
    isDeleted: 'boolean'
  }
};

