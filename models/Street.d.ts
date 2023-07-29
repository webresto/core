import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import { RequiredField } from "../interfaces/toolsTS";
import City from "./City";
declare let attributes: {
    /** ID */
    id: string;
    /** Id in external system */
    externalId: string;
    /** Name of street */
    name: string;
    /** dataHash */
    hash: string;
    /** Street has delited */
    isDeleted: boolean;
    city: string | City;
    customData: string | {
        [key: string]: string | number | boolean;
    };
};
type attributes = typeof attributes;
interface Street extends RequiredField<Partial<attributes>, "name">, ORM {
}
export default Street;
declare let Model: {
    beforeCreate(streetInit: any, cb: (err?: string) => void): void;
    /**
   * Checks whether the street exists, if it does not exist, then creates a new one and returns it.If exists, then checks
   * Hesh of the existing street and new data, if they are identical, then immediately gives the streetes, if not, it updates its data
   * for new ones
   * @param values
   * @return Updated or created street
   */
    createOrUpdate(values: Street): Promise<Street>;
};
declare global {
    const Street: typeof Model & ORMModel<Street, null>;
}
