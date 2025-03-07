/**
 * The bonus program implements the spending of virtual bonuses through the adapter.
 */

import { Adapter } from "../adapters";
import BonusProgramAdapter from "../adapters/bonusprogram/BonusProgramAdapter";
import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";

import { v4 as uuid } from "uuid";

const aliveBonusPrograms: {
  [key: string]: BonusProgramAdapter
} = {};

let attributes = {
  /** ID */
  id: {
    type: "string",
    //required: true,
  } as unknown as string,

  externalId: {
    type: "string"
  } as unknown as string,

  name: {
    type: "string",
    required: true,
  } as unknown as string,

  adapter: {
    type: "string",
    required: true,
    unique: true
  } as unknown as string,

  /** Exchange price for website currency */
  exchangeRate: "number" as unknown as number,
  /** How much can you spend from the amount of the order */
  coveragePercentage: "number" as unknown as number,

  decimals: "number" as unknown as number,

  sortOrder: "number" as unknown as number,
  description: "string",

  /** Icon link */
  iconLink: "string",

  /** Link for read detail info about bonus program */
  detailInfoLink: "string",

  /** user option */
  enable: {
    type: "boolean",
    required: true,
  } as unknown as boolean,

  automaticUserRegistration: {
    type: "boolean",
  } as unknown as boolean,

  customData: "json" as unknown as {
    [key: string]: string | boolean | number;
  } | string,
};

type attributes = typeof attributes;
export interface BonusProgramRecord extends attributes, ORM {}

let Model = {
  beforeCreate(init: BonusProgramRecord, cb:  (err?: string) => void) {
    if (!init.id) {
      init.id = uuid();
    }

    // defaults
    if (!init.coveragePercentage) {
      init.coveragePercentage = 1;
    }else if(init.coveragePercentage > 1) {
      init.coveragePercentage = 1;
    } else if (init.coveragePercentage < 0) {
      init.coveragePercentage = 0;
    }

    if (!init.exchangeRate) {
      init.exchangeRate = 1;
    }

    if(!init.automaticUserRegistration) {
      init.automaticUserRegistration = process.env.NODE_ENV !== "production";
    }

    // decimals
    if (!init.decimals) {
      init.decimals = 0;
    }

    cb();
  },

  /**
   * Method for registration alive bonus program adapter
   * @param bonusProgramAdapter
   * @returns
   */
  async alive(bonusProgramAdapter: BonusProgramAdapter): Promise<void | Error> {

    if (!bonusProgramAdapter.adapter) {
      sails.log.error(`Bonusprogram > alive : Adapter not defined`)

      // safe stop alive, throw crash sails
      return new Error
    }

    let knownBonusProgram = await BonusProgram.findOne({
      adapter: bonusProgramAdapter.adapter,
    });

    if (!knownBonusProgram) {
      knownBonusProgram = await BonusProgram.create({
        name: bonusProgramAdapter.name,
        externalId: bonusProgramAdapter.id,
        adapter: bonusProgramAdapter.adapter,
        exchangeRate: bonusProgramAdapter.exchangeRate,
        coveragePercentage: bonusProgramAdapter.coveragePercentage,
        decimals: bonusProgramAdapter.decimals,
        description: bonusProgramAdapter.description,
        enable: process.env.NODE_ENV !== "production" //For production adapter should be off on start
      }).fetch();
    }
    bonusProgramAdapter.setORMId(knownBonusProgram.id);
    aliveBonusPrograms[bonusProgramAdapter.adapter] = bonusProgramAdapter;
    sails.log.silly("PaymentMethod > alive", knownBonusProgram, aliveBonusPrograms[bonusProgramAdapter.adapter]);
    return;
  },

  /**
   * Method for registration alive bonus program adapter
   * @returns BonusProgramAdapter
   * @param adapterOrId
   */
  async getAdapter(adapterOrId: string): Promise<BonusProgramAdapter> {
    let bonusProgram = await BonusProgram.findOne({ where: { or: [{
          adapter: adapterOrId
        }, {
          id: adapterOrId
        }
      ]}
    });

    if (bonusProgram) {
      if (bonusProgram.enable !== true) throw `getAdapter > bonusProgram ${adapterOrId} is disabled`;

      if(aliveBonusPrograms[bonusProgram.adapter] !== undefined) {
        return aliveBonusPrograms[bonusProgram.adapter]
      } else {
        // here should find the adapter by adapter/index.ts
        try {
          return Adapter.getBonusProgramAdapter(adapterOrId);
        } catch (error) {
          throw `BonusProgram ${adapterOrId} no alive or disabled`
        }
      }
    } else {
      throw `bonusProgram ${adapterOrId} not found`
    }

  },

  /**
   * Method for registration alive bonus program adapter
   * @returns
   * @param adapter
   */
  async isAlive(adapter: string): Promise<boolean> {
    let bonusProgram = await BonusProgram.getAdapter(adapter);
    return bonusProgram !== undefined;
  },

  /**
   * Returns an array with currently possible bonus programs by order
   * @return BonusProgram[]
   */
  async getAvailable(): Promise<BonusProgramRecord[]> {
    return await BonusProgram.find({
        where: {
          // @ts-ignore TODO: First fix types
            and: [
                {adapter: {in: Object.keys(aliveBonusPrograms)}},
                {enable: true}
            ]
        },
        sort: "sortOrder ASC"
    });
  }
};

module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model,
};

declare global {
  const BonusProgram: typeof Model & ORMModel<BonusProgramRecord, null>;
}
