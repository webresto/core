import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import { RequiredField } from "../interfaces/toolsTS";
import City from "./City";
import { CustomData } from "../interfaces/CustomData";
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
    /** Street has delited */
    enable: boolean;
    city: string | City;
    customData: CustomData;
};
type attributes = typeof attributes;
interface Street extends RequiredField<Partial<attributes>, "name">, ORM {
}
export default Street;
/**
 * Pelase emit core:streets:updated after finish update streets
 */
declare let Model: {
    beforeUpdate(value: Street, cb: (err?: string) => void): Promise<void>;
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
