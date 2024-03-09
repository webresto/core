import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
declare let attributes: {
    /** ID */
    id: string;
    /** Id in external system */
    externalId: string;
    /** Name of street */
    name: string;
    /** City was deleted */
    isDeleted: boolean;
    customData: string | {
        [key: string]: string | number | boolean;
    };
};
type attributes = typeof attributes;
interface City extends attributes, ORM {
}
export default City;
declare let Model: {
    beforeCreate(streetInit: any, cb: (err?: string) => void): void;
};
declare global {
    const City: typeof Model & ORMModel<City, null>;
}
