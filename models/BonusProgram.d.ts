/**
 * The bonus program implements the spending of virtual bonuses through the adapter.
 */
import BonusProgramAdapter from "../adapters/bonusprogram/BonusProgramAdapter";
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
    /** How much can you spend from the amount of the order */
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
interface BonusProgram extends attributes, ORM {
}
export default BonusProgram;
declare let Model: {
    beforeCreate(init: BonusProgram, cb: (err?: string) => void): void;
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
     * Method for registration alive bonus program adapter
     * @returns
     * @param adapter
     */
    isAlive(adapter: string): Promise<boolean>;
    /**
     * Returns an array with currently possible bonus programs by order
     * @return BonusProgram[]
     */
    getAvailable(): Promise<BonusProgram[]>;
};
declare global {
    const BonusProgram: typeof Model & ORMModel<BonusProgram, null>;
}
