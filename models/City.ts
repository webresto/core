import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";

import { v4 as uuid } from "uuid";

let attributes = {
  /** ID */
  id: {
    type: "string",
    //required: true,
  } as unknown as string,

  /** Id in external system */
  externalId: {
    type: "string"
  } as unknown as string,
  
  /** Name of street */
  name: "string",

  /** City has delited */
  isDeleted: { 
    type:'boolean'
  } as unknown as boolean,
  
  customData: "json" as unknown as {
    [key: string]: string | boolean | number;
  } | string,
};

type attributes = typeof attributes;
interface City extends attributes, ORM {}
export default City;

let Model = {
  beforeCreate(streetInit: any, cb:  (err?: string) => void) {
    if (!streetInit.id) {
      streetInit.id = uuid();
    }
    
    cb();
  },
};

module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model,
};

declare global {
  const City: typeof Model & ORMModel<City, null>;
}
