/**
 * The bonus program implements the spending of virtual bonuses through the adapter.
 */

import type { BonusProgramAdapter } from "../adapters";
import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";

import { v4 as uuid } from "uuid";
import { normalizePercent } from "../utils/normalize";

const aliveBonusPrograms: {
  [key: string]: BonusProgramAdapter
} = {};

/** the coverage as a share of 0..1 (50 - 50%), or null out of 0..100% */
function coverageShare(value: number | string): number | null {
  try {
    const share = normalizePercent(value);
    return share.isNaN() || share.lt(0) || share.gt(1) ? null : share.toNumber();
  } catch {
    // not a number at all
    return null;
  }
}

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
  /** How much of the amount of the order bonuses may pay: a share, 0.5 - half; 50 given is taken as 50% */
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
    type: "boolean"
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

    // the share is kept, once: 50 is 0.5; the order takes it as is
    if (init.coveragePercentage !== undefined) {
      const share = coverageShare(init.coveragePercentage);
      if (share === null) return cb(`coveragePercentage must be from 0 to 100%, not ${init.coveragePercentage}`);
      init.coveragePercentage = share;
    } else {
      init.coveragePercentage = 1;
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

  beforeUpdate(valuesToUpdate: Partial<BonusProgramRecord>, cb: (err?: string) => void) {
    if (valuesToUpdate.coveragePercentage !== undefined) {
      const share = coverageShare(valuesToUpdate.coveragePercentage);
      if (share === null) return cb(`coveragePercentage must be from 0 to 100%, not ${valuesToUpdate.coveragePercentage}`);
      valuesToUpdate.coveragePercentage = share;
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

      // a program is served only by the adapter its module made alive (`alive`)
      const alive = aliveBonusPrograms[bonusProgram.adapter];
      if (!alive) throw `BonusProgram ${adapterOrId} is not alive`;
      return alive;
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
