import ORM from "../interfaces/ORM";
import ORMModel from "../interfaces/ORMModel";
import { v4 as uuid } from "uuid";
import Dish from "./Dish";
import Order from "./Order";
import User from "../models/User"
import BonusProgram from "./BonusProgram";
// type Optional<T> = {
//   [P in keyof T]?: T[P];
// }


let attributes = {
  
  /** ID */
  id: {
    type: "string",
    //required: true,
  } as unknown as Readonly<string>,

  balance: {
    type: 'number'
  } as unknown as number,
  
  isDeleted: {
    type: 'boolean',
  } as unknown as boolean,

  user: {
    model: 'user'
  } as unknown as User | string,

  bonusProgram: {
    model: 'bonusprogram'
  } as unknown as BonusProgram | string,

  /** UNIX era seconds */
  syncedToTime: "string",

  customData: "json" as unknown as {
    [key: string]: string | boolean | number;
  } | string,
};




type attributes = typeof attributes;
interface UserBonusProgram extends attributes, ORM {}
export default UserBonusProgram;

let Model = {
  beforeCreate(init: UserBonusProgram, cb:  (err?: string) => void) {
    if (!init.id) {
      init.id = uuid();
    }
    
    cb();
  },

  async registration(user: User | string, adapterOrId: string): Promise<UserBonusProgram> {
    const bp = await BonusProgram.getAdapter(adapterOrId);
    
    // TODO: this new standart call for models methods (Object or string)
    if(typeof user === "string") {
      user = await User.findOne({id: user})
    }
    
    await bp.registration(user);

    return await UserBonusProgram.create({
      user: user.id, 
      balance: 0,
      isDeleted: false,
      bonusProgram: bp.id,
      syncedToTime: "0"
    }).fetch();
  },

  async delete(user: User | string, adapterOrId: string): Promise<void> {
    const bp = await BonusProgram.getAdapter(adapterOrId);
    
    if(typeof user === "string") {
      user = await User.findOne({id: user})
    }
    
    await bp.delete(user);
    await UserBonusProgram.update({user: user.id}, {
      isDeleted: true,
    }).fetch();

    return;
  }
};

module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model,
};

declare global {
  const UserBonusProgram: typeof Model & ORMModel<UserBonusProgram, null>;
}
