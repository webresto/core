import ORM from "../interfaces/ORM";
import ORMModel from "../interfaces/ORMModel";
import Dish from "../models/Dish";
import Group from "../models/Group";
import { v4 as uuid } from "uuid";

let attributes = {
  /** ID картинки */
  id: {
    type: "string",
    required: true,
  } as unknown as string,

  /** Данные о картинках, что содержит данная модель */
  images: "json" as unknown as any,

  /** Блюдо, которому принадлежит картинка */
  dish: {
    collection: "dish",
    via: "images",
  } as unknown as Dish[],

  /** */
  group: {
    collection: "group",
    via: "images",
  } as unknown as Group[],

  /** Группа, которой принажлежит картинка */
  uploadDate: "string",
};
type attributes = typeof attributes;
interface Image extends attributes, ORM {}
export default Image;


let Model = {
  beforeCreate(imageInit, next) {
    if (!imageInit.id) {
      imageInit.id = uuid();
    }

    next();
  },
};

module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model,
};

declare global {
  const Image: typeof Model & ORMModel<Image>;
}
