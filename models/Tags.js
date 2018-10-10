/**
 * @api {API} Tags Tags
 * @apiGroup Models
 * @apiDescription Тэги
 *
 * @apiParam {Integer} id ID
 * @apiParam {String} name Название тэга
 * @apiParam {Dish[]} dishes Блюда, которые содержат этот тэг
 *
 */

module.exports = {
  attributes: {
    id: {
      type: 'integer',
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: 'string'
    },
    dishes: {
      collection: 'dish',
      via: 'tags'
    }
  }
};

