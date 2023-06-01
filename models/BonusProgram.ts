/**
 * The bonus program implements the spending of virtual bonuses through the adapter.
 */

import BonusAdapter from "../adapters/bonusprogram/BonusProgramAdapter";
import ORM from "../interfaces/ORM";
import ORMModel from "../interfaces/ORMModel";
import { v4 as uuid } from "uuid";

const alivedBonusPrograms: { 
  [key: string]: BonusAdapter
} = {};

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

  /** Exchange price for website currency */
  exchangeRate: "number" as unknown as number,
  /** How much can you spend from the amount of the order */
  coveragePercentage: "number" as unknown as number,
  decimals: "number" as unknown as number,
  
  sortOrder: "number" as unknown as number,
  description: "string",
  
  /** user option */
  enabled: {
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
  beforeCreate(init: BonusProgram, next: Function) {
    if (!init.id) {
      init.id = uuid();
    }
    
    if (init.coveragePercentage > 1) {
      init.coveragePercentage = 1;
    } else if (init.coveragePercentage < 0) {
      init.coveragePercentage = 0;
    }

    next();
  },

  /**
   * Method for registration alived bonus program adapter
   * @param bonusProgramAdapter 
   * @returns 
   */
  async alive(bonusProgramAdapter: BonusAdapter) {
    let knownBonusProgram = await BonusProgram.findOne({
      adapter: bonusProgramAdapter.InitBonusAdapter.adapter,
    });

    if (!knownBonusProgram) {
      knownBonusProgram = await BonusProgram.create({ ...bonusProgramAdapter.InitBonusAdapter, enabled: false }).fetch();
    }
    alivedBonusPrograms[bonusProgramAdapter.InitBonusAdapter.adapter] = bonusProgramAdapter;
    sails.log.verbose("PaymentMethod > alive", knownBonusProgram, alivedBonusPrograms[bonusProgramAdapter.InitBonusAdapter.adapter]);
    return;
  },

  /**
   * Method for registration alived bonus program adapter
   * @param bonusProgramAdapterId string 
   * @returns 
   */
  async getAdapter(bonusProgramId: string): Promise<BonusAdapter> {
    let bonusProgram = await BonusProgram.findOne({
      id: bonusProgramId,
    });

    if(bonusProgram && bonusProgram.enabled && alivedBonusPrograms[bonusProgram.adapter] !== undefined) {
      return alivedBonusPrograms[bonusProgram.adapter]
    } else {
      // here should find the adapter by adapter/index.ts 
      throw `BonusProgram ${bonusProgramId} no alived`
    }
  },

  /**
   * Method for registration alived bonus program adapter
   * @param bonusProgramAdapterId string 
   * @returns 
   */
  async isAlived(bonusProgramId: string): Promise<boolean> {
    let bonusProgram = await BonusProgram.getAdapter(bonusProgramId);
    return bonusProgram !== undefined;
  },


  /**
   * Returns an array with currently possible bonus programs by order
   * @return BonusProgram[]
   */
    async getAvailable(): Promise<BonusProgram[]> {
      return await BonusProgram.find({
        where: {
          or: [
            {
              adapter: Object.keys(alivedBonusPrograms),
              enable: true,
            }
          ],
        },
        sort: "sortOrder ASC",
      });
    },
};

module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model,
};

declare global {
  const BonusProgram: typeof Model & ORMModel<BonusProgram, null>;
}
