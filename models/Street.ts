import ORM from "../interfaces/ORM";
import ORMModel from "../interfaces/ORMModel";
import { v4 as uuid } from "uuid";

let attributes = {
  /** ID */
  id: {
    type: "string",
    //required: true,
  } as unknown as string,

  /** Название улицы */
  name: "string",

  /** Признак того что улица удалена */
  isDeleted: { 
    type:'boolean'
  } as unknown as boolean,
  
  customData: "json" as unknown as {
    [k: string]: string | boolean | number;
  } | string,
};

type attributes = typeof attributes;
interface Street extends attributes, ORM {}
export default Street;

let Model = {
  beforeCreate(streetInit: any, next: any) {
    if (!streetInit.id) {
      streetInit.id = uuid();
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
  const Street: typeof Model & ORMModel<Street>;
}
