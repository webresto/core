/**
 * @api {API} Group Group
 * @apiGroup Models
 * @apiDescription Группы. Содержат в себе блюда и другие группы
 *
 * @apiParam {String} id Уникальный идентификатор
 * @apiParam {String} additionalInfo Дополнительная информация
 * @apiParam {Float} code Артикул
 * @apiParam {String} description Описание
 * @apiParam {Boolean} isDeleted Удалён ли продукт в меню, отдаваемого клиенту
 * @apiParam {String} name Название
 * @apiParam {String} seoDescription SEO-описание для клиента
 * @apiParam {String} seoKeywords SEO-ключевые слова
 * @apiParam {String} seoText SEO-текст для роботов
 * @apiParam {String} seoTitle SEO-заголовок
 * @apiParam {Tags} tags Тэги
 * @apiParam {Boolean} isIncludedInMenu Нужно ли продукт отображать в дереве номенклатуры
 * @apiParam {Float} order Порядок отображения
 * @apiParam {Tags[]} dishesTags Тэги всех блюд, что есть в этой группе
 * @apiParam {Dish[]} dishes Блюда, содержашиеся в этой группе
 * @apiParam {Group} parentGroup Родительская группа
 * @apiParam {Group[]} childGroups Дочерние группы
 * @apiParam {Image[]} images Картинки группы
 *
 */

module.exports = {
  attributes: {
    id: {
      type: 'string',
      required: true,
      primaryKey: true
    },
    additionalInfo: 'string',
    code: 'float',
    description: 'string',
    isDeleted: 'boolean',
    name: 'string',
    seoDescription: 'string',
    seoKeywords: 'string',
    seoText: 'string',
    seoTitle: 'string',
    tags: {
      // collection: 'tags'
      type: 'json'
    },
    isIncludedInMenu: 'boolean',
    order: 'float',
    dishesTags: {
      // collection: 'tags'
      type: 'json'
    },
    dishes: {
      collection: 'dish',
      via: 'productCategoryId'
    },
    parentGroup: {
      model: 'group'
    },
    childGroups: {
      collection: 'group',
      via: 'parentGroup'
    },
    images: {
      collection: 'image',
      via: 'group'
    },
    isDeleted: 'boolean'
  },

  /**
   * create group or update exists
   * @param values
   * @return {{exec: exec}}
   */
  createOrUpdate: function (values) {
    return {
      exec: function (cb) {
        Group.findOne({id: values.id}).exec((err, group) => {
          if (err) return cb(err);
          if (!group) {
            Group.create(values).exec((err, group) => {
              if (err) return cb(err);
              return cb(null, group);
            });
          } else {
            Group.update({id: values.id}, values).exec((err, group) => {
              if (err) return cb(err);
              return cb(null, group[0]);
            });
          }
        });
      }
    }
  }
};

