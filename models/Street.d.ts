import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
declare let attributes: {
    /** ID */
    id: string;
    /** Id in external system */
    externalId: string;
    /** Name of street */
    name: string;
    /** Street has delited */
    isDeleted: boolean;
    customData: string | {
        [key: string]: string | number | boolean;
    };
};
type attributes = typeof attributes;
interface Street extends attributes, ORM {
}
export default Street;
declare let Model: {
    beforeCreate(streetInit: any, cb: (err?: string) => void): void;
};
declare global {
    const Street: typeof Model & ORMModel<Street, null>;
}
