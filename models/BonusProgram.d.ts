/**
 * The bonus program implements the spending of virtual bonuses through the adapter.
 */
import type { BonusProgramAdapter } from "../adapters";
import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
declare let attributes: {
    /** ID */
    id: string;
    externalId: string;
    name: string;
    adapter: string;
    /** Exchange price for website currency */
    exchangeRate: number;
    /** How much of the amount of the order bonuses may pay: a share, 0.5 - half; 50 given is taken as 50% */
    coveragePercentage: number;
    decimals: number;
    sortOrder: number;
    description: string;
    /** Icon link */
    iconLink: string;
    /** Link for read detail info about bonus program */
    detailInfoLink: string;
    /** user option */
    enable: boolean;
    automaticUserRegistration: boolean;
    customData: {
        [key: string]: string | boolean | number;
    } | string;
};
type attributes = typeof attributes;
export interface BonusProgramRecord extends attributes, ORM {
}
declare let Model: {
    beforeCreate(init: BonusProgramRecord, cb: (err?: string) => void): void;
    beforeUpdate(valuesToUpdate: Partial<BonusProgramRecord>, cb: (err?: string) => void): void;
    afterCreate(record: BonusProgramRecord, cb: (err?: string) => void): void;
    afterUpdate(record: BonusProgramRecord, cb: (err?: string) => void): void;
    afterDestroy(record: BonusProgramRecord, cb: (err?: string) => void): void;
    /**
     * Method for registration alive bonus program adapter
     * @param bonusProgramAdapter
     * @returns
     */
    alive(bonusProgramAdapter: BonusProgramAdapter): Promise<void | Error>;
    /**
     * Method for registration alive bonus program adapter
     * @returns BonusProgramAdapter
     * @param adapterOrId
     */
    getAdapter(adapterOrId: string): Promise<BonusProgramAdapter>;
    /**
     * Whether the program serves: enabled, with its adapter alive (`getAdapter` throws otherwise)
     * @param adapterOrId
     */
    isAlive(adapterOrId: string): Promise<boolean>;
    /**
     * Returns an array with currently possible bonus programs by order
     * @return BonusProgram[]
     */
    getAvailable(): Promise<BonusProgramRecord[]>;
};
declare global {
    const BonusProgram: typeof Model & ORMModel<BonusProgramRecord, null>;
}
export {};
