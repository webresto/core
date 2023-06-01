/**
 * The bonus program implements the spending of virtual bonuses through the adapter.
 */
import BonusAdapter from "../adapters/bonusprogram/BonusProgramAdapter";
import ORM from "../interfaces/ORM";
import ORMModel from "../interfaces/ORMModel";
declare let attributes: {
    /** ID */
    id: string;
    adapter: string;
    /** Exchange price for website currency */
    exchangeRate: number;
    /** How much can you spend from the amount of the order */
    coveragePercentage: number;
    decimals: number;
    sortOrder: number;
    description: string;
    /** user option */
    enabled: boolean;
    customData: string | {
        [key: string]: string | number | boolean;
    };
};
type attributes = typeof attributes;
interface BonusProgram extends attributes, ORM {
}
export default BonusProgram;
declare let Model: {
    beforeCreate(init: BonusProgram, next: Function): void;
    /**
     * Method for registration alived bonus program adapter
     * @param bonusProgramAdapter
     * @returns
     */
    alive(bonusProgramAdapter: BonusAdapter): Promise<void>;
    /**
     * Method for registration alived bonus program adapter
     * @param bonusProgramAdapterId string
     * @returns
     */
    getAdapter(bonusProgramId: string): Promise<BonusAdapter>;
    /**
     * Method for registration alived bonus program adapter
     * @param bonusProgramAdapterId string
     * @returns
     */
    isAlived(bonusProgramId: string): Promise<boolean>;
    /**
     * Returns an array with currently possible bonus programs by order
     * @return BonusProgram[]
     */
    getAvailable(): Promise<BonusProgram[]>;
};
declare global {
    const BonusProgram: typeof Model & ORMModel<BonusProgram, null>;
}
