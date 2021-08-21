"use strict";
/**
 * @api {API} Image Image
 * @apiGroup Models
 * @apiDescription Картинки для блюд или групп
 *
 * @apiParam {String} id ID картинки
 * @apiParam {JSON} images Данные о картинках, что содержит данная модель
 * @apiParam {[Dish](#api-Models-ApiDish)} dish Блюдо, которому принадлежит картинка (не показывается во избежание рекурсии)
 * @apiParam {[Group](#api-Models-ApiGroup)} group Группа, которой принажлежит картинка (не показывается во избежание рекурсии)
 *
 * @apiParamExample {JSON} images:
 "images": {
        "origin": "/images/a0f39d7d-75ac-4af1-8e91-d94b442874eb/2039649a-50f9-4785-a7a9-c5f86d637f27/origin.jpg",
        "small": "/images/a0f39d7d-75ac-4af1-8e91-d94b442874eb/2039649a-50f9-4785-a7a9-c5f86d637f27/small.jpg",
        "large": "/images/a0f39d7d-75ac-4af1-8e91-d94b442874eb/2039649a-50f9-4785-a7a9-c5f86d637f27/large.jpg"
    }
 */
Object.defineProperty(exports, "__esModule", { value: true });
module.exports = {
    primaryKey: 'id',
    attributes: {
        id: {
            type: 'string',
            required: true
            //defaultsTo: function (){ return uuid(); }
        },
        images: 'json',
        dish: {
            collection: 'dish',
            via: 'images'
        },
        group: {
            collection: 'group',
            via: 'images'
        },
        uploadDate: 'string'
    }
};
