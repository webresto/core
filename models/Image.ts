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

/// <reference no-default-lib="true"/>

import Dish from "../models/Dish";
import Group from "../models/Group";
import ORMModel from "../interfaces/ORMModel";
import ORM from "../interfaces/ORM";
import { v4 as uuid } from 'uuid';

module.exports = {
  primaryKey: 'id',
  attributes: {
    id: {
      type: 'string'
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



/**
 * Описывает картинки блюд и групп
 */
export default interface Image extends ORM {
  id: string;
  images: any,
  dish?: Association<Dish>;
  group?: Association<Group>;
  uploadDate: string;
}

/**
 * Описывает класс Image, используется для ORM
 */
export interface ImageModel extends ORMModel<Image> {}

declare global {
  const Image: ImageModel;
}
