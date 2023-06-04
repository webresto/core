/**
 * The bonus program implements the spending of virtual bonuses through the adapter.
 */
import BonusProgramAdapter from "../adapters/bonusprogram/BonusProgramAdapter";
import ORM from "../interfaces/ORM";
import ORMModel from "../interfaces/ORMModel";
declare let attributes: {
    /** ID */
    id: string;
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
    customData: string | {
        [key: string]: string | number | boolean;
    };
};
type attributes = typeof attributes;
interface BonusProgram extends attributes, ORM {
}
export default BonusProgram;
declare let Model: {
    beforeCreate(init: BonusProgram, cb: (err?: string) => void): void;
    /**
     * Method for registration alived bonus program adapter
     * @param bonusProgramAdapter
     * @returns
     */
    alive(bonusProgramAdapter: BonusProgramAdapter): Promise<void>;
    /**
     * Method for registration alived bonus program adapter
     * @param bonusProgramAdapterId string
     * @returns
     */
    getAdapter(adapterOrId: string): Promise<BonusProgramAdapter>;
    /**
     * Method for registration alived bonus program adapter
     * @param bonusProgramAdapterId string
     * @returns
     */
    isAlived(adapter: string): Promise<boolean>;
    /**
     * Returns an array with currently possible bonus programs by order
     * @return BonusProgram[]
     */
    getAvailable(): Promise<BonusProgram[]>;
};
declare global {
    const BonusProgram: typeof Model & ORMModel<BonusProgram, null>;
}
