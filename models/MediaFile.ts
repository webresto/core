import ORM from "../interfaces/ORM";
import ORMModel from "../interfaces/ORMModel";
import Dish from "./Dish";
import Group from "./Group";
import { v4 as uuid } from "uuid";

let attributes = {
  /** ID картинки */
  id: {
    type: "string",
    //required: true,
  } as unknown as string,

  /** Данные о картинках, что содержит данная модель */
  images: "json" as unknown as any,

  /** Блюдо, которому принадлежит картинка */
  dish: {
    collection: "dish",
    via: "images",
  } as unknown as Dish[],

  /** Порядок сортировки */
  order: "number" as unknown as number,

  /** */
  group: {
    collection: "group",
    via: "images",
  } as unknown as Group[],

  /** Группа, которой принажлежит картинка */
  uploadDate: "string",
};
type attributes = typeof attributes;
interface MediaFile extends attributes, ORM {}
export default MediaFile;

let Model = {
  beforeCreate(imageInit: any, next: any) {
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
  //@ts-ignore //TODO: need rename model of images maybe ProductCover
  const MediaFile: typeof Model & ORMModel<MediaFile>;
}
