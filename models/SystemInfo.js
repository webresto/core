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
    key: {
      type: 'string',
      unique: true
    },
    value: 'string',
    section: 'string'
  },

  async use(key) {
    let obj = await SystemInfo.findOneByKey(key);
    if (!obj) {
      if (sails.config.restocore[key]) {
        obj = await SystemInfo.create({
          key: key,
          value: sails.config.restocore[key]
        });
      }
    }
    return obj.value;
  }
};

