import ORM from "../interfaces/ORM";
import ORMModel from "../interfaces/ORMModel";
declare let attributes: {
    /** ID */
    id: string;
    adapter: string;
    sortOrder: number;
    description: string;
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
    beforeCreate(BonusProgramInit: any, next: any): void;
    /**
   */
    alive(ba: any): Promise<void>;
};
declare global {
    const BonusProgram: typeof Model & ORMModel<BonusProgram, null>;
}