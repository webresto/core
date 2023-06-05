/**
 * The bonus program implements the spending of virtual bonuses through the adapter.
 */
<<<<<<< HEAD
import BonusAdapter from "../adapters/bonusprogram/BonusProgramAdapter";
=======
import BonusProgramAdapter from "../adapters/bonusprogram/BonusProgramAdapter";
>>>>>>> origin/bonuses
import ORM from "../interfaces/ORM";
import ORMModel from "../interfaces/ORMModel";
declare let attributes: {
    /** ID */
    id: string;
<<<<<<< HEAD
=======
    name: string;
>>>>>>> origin/bonuses
    adapter: string;
    /** Exchange price for website currency */
    exchangeRate: number;
    /** How much can you spend from the amount of the order */
    coveragePercentage: number;
<<<<<<< HEAD
    sortOrder: number;
    description: string;
    decimals: number;
    /** user option */
    enabled: boolean;
=======
    decimals: number;
    sortOrder: number;
    description: string;
    /** Icon link */
    iconLink: string;
    /** Link for read detail info about bonus program */
    detailInfoLink: string;
    /** user option */
    enable: boolean;
>>>>>>> origin/bonuses
    customData: string | {
        [key: string]: string | number | boolean;
    };
};
type attributes = typeof attributes;
interface BonusProgram extends attributes, ORM {
}
export default BonusProgram;
declare let Model: {
<<<<<<< HEAD
    beforeCreate(BonusProgramInit: BonusProgram, next: Function): void;
=======
    beforeCreate(init: BonusProgram, cb: (err?: string) => void): void;
>>>>>>> origin/bonuses
    /**
     * Method for registration alived bonus program adapter
     * @param bonusProgramAdapter
     * @returns
     */
<<<<<<< HEAD
    alive(bonusProgramAdapter: BonusAdapter): Promise<void>;
=======
    alive(bonusProgramAdapter: BonusProgramAdapter): Promise<void | Error>;
>>>>>>> origin/bonuses
    /**
     * Method for registration alived bonus program adapter
     * @param bonusProgramAdapterId string
     * @returns
     */
<<<<<<< HEAD
    getAdapter(bonusProgramId: string): Promise<BonusAdapter>;
=======
    getAdapter(adapterOrId: string): Promise<BonusProgramAdapter>;
>>>>>>> origin/bonuses
    /**
     * Method for registration alived bonus program adapter
     * @param bonusProgramAdapterId string
     * @returns
     */
<<<<<<< HEAD
    isAlived(bonusProgramId: string): Promise<boolean>;
=======
    isAlived(adapter: string): Promise<boolean>;
>>>>>>> origin/bonuses
    /**
     * Returns an array with currently possible bonus programs by order
     * @return BonusProgram[]
     */
    getAvailable(): Promise<BonusProgram[]>;
};
declare global {
    const BonusProgram: typeof Model & ORMModel<BonusProgram, null>;
}
