import ORMModel from "../interfaces/ORMModel";
import ORM from "../interfaces/ORM";

module.exports = {
  primaryKey: "id",
  attributes: {
    id: {
      type: "string",
      required: true

    },
    isKitchen: 'boolean',
    isPointOfSale: 'boolean',
    isPickupPoint: 'boolean',
    options: 'json'
  },
};

/**
 * Описывает картинки блюд и групп
 */
export default interface Place extends ORM {
  id: string;
}

/**
 * Описывает класс Image, используется для ORM
 */
export interface PlaceModel extends ORMModel<Image> {}

declare global {
  const Image: PlaceModel;
}
