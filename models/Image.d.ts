import ORM from "../interfaces/ORM";
import ORMModel from "../interfaces/ORMModel";
import Dish from "../models/Dish";
import Group from "../models/Group";
declare let attributes: {
  /** ID картинки */
  id: string;
  /** Данные о картинках, что содержит данная модель */
  images: any;
  /** Блюдо, которому принадлежит картинка */
  dish: Dish[];
  /** */
  group: Group[];
  /** Группа, которой принажлежит картинка */
  uploadDate: string;
};
declare type attributes = typeof attributes;
interface Image extends attributes, ORM {}
export default Image;
declare let Model: {
  beforeCreate(imageInit: any, next: any): void;
};
declare global {
  const Image: typeof Model & ORMModel<Image>;
}
