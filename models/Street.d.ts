import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import { RequiredField } from "../interfaces/toolsTS";
import { CustomData } from "../interfaces/CustomData";
import { CityRecord } from "./City";
declare let attributes: {
    /** ID */
    id: string;
    /** Id in external system */
    externalId: string;
    /** Name of street */
    name: string;
    /** dataHash */
    hash: string;
    /** Street has deleted */
    isDeleted: boolean;
    /** Street has deleted */
    enable: boolean;
    city: string | CityRecord;
    customData: CustomData;
};
type attributes = typeof attributes;
export interface StreetRecord extends RequiredField<Partial<attributes>, "name">, ORM {
}
/**
 * Please emit core:streets:updated after finish update streets
 */
declare let Model: {
    beforeUpdate(value: StreetRecord, cb: (err?: string) => void): Promise<void>;
    beforeCreate(streetInit: StreetRecord, cb: (err?: string) => void): void;
    /**
   * Checks whether the street exists, if it does not exist, then creates a new one and returns it.If exists, then checks
   * Hash of the existing street and new data, if they are identical, then immediately gives the streets, if not, it updates its data
   * for new ones
   * @param values
   * @return Updated or created street
   */
    createOrUpdate(values: StreetRecord): Promise<StreetRecord>;
};
declare global {
    const Street: typeof Model & ORMModel<StreetRecord, null>;
}
export {};
