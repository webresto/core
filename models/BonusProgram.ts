import ORM from "../interfaces/ORM";
import ORMModel from "../interfaces/ORMModel";
import { v4 as uuid } from "uuid";

let attributes = {
  /** ID */
  id: {
    type: "string",
    //required: true,
  } as unknown as string,
  adapter: {
    type: "string",
    required: true,
  } as unknown as string,
  order: "number" as unknown as number,
  description: "string",
  // hasExternalLogic: {
  //   type: "boolean",
  // } as unknown as boolean,
  enable: {
    type: "boolean",
    required: true,
  } as unknown as boolean,
  customData: "json" as unknown as {
    [key: string]: string | boolean | number;
  } | string,
};

type attributes = typeof attributes;
interface BonusProgram extends attributes, ORM {}
export default BonusProgram;

let Model = {
  beforeCreate(BonusProgramInit: any, next: any) {
    if (!BonusProgramInit.id) {
      BonusProgramInit.id = uuid();
    }
    
    next();
  },

    /**
   */
     async alive(ba) {
      return
    },
  
};

module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model,
};

declare global {
  const BonusProgram: typeof Model & ORMModel<BonusProgram>;
}
