import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";

import { v4 as uuid } from "uuid";
import hashCode from "../libs/hashCode";
import { RequiredField } from "../interfaces/toolsTS";
import City from "./City";
import { CustomData, isCustomData } from "../interfaces/CustomData";

let attributes = {
  /** ID */
  id: {
    type: "string",
    //required: true,
  } as unknown as string,

  /** Id in external system */
  externalId: {
    type: "string"
  } as unknown as string,
  
  /** Name of street */
  name: "string",

  /** dataHash */
  hash: "string",

  /** Street has delited */
  isDeleted: { 
    type:'boolean'
  } as unknown as boolean,
  
  /** Street has delited */
  enable: { 
    type:'boolean',
    allowNull: true
  } as unknown as boolean,
  
  
  city: {
    model: 'city'
  } as unknown as City | string,

  customData: "json" as unknown as CustomData,
};

type attributes = typeof attributes;
interface Street extends RequiredField<Partial<attributes>, "name">, ORM {}
export default Street;


/**
 * Pelase emit core:streets:updated after finish update streets
 */
let Model = {
  async beforeUpdate(value: Street, cb:  (err?: string) => void) {
    if(value.customData) {
      if (value.id !== undefined) {
        let current = await Street.findOne({id: value.id});
        if(!isCustomData(current.customData)) current.customData = {}
        let customData = {...current.customData, ...value.customData} 
        value.customData = customData;
      }
    }
    cb();
  },

  beforeCreate(streetInit: any, cb:  (err?: string) => void) {
    if (!streetInit.id) {
      streetInit.id = uuid();
    }

    if(streetInit.isDeleted === undefined || streetInit.isDeleted === null) {
      streetInit.isDeleted = false
    }

    if(streetInit.enable === undefined || streetInit.enable === null) {
      streetInit.enable = true
    }
    
    if(!isCustomData(streetInit.customData)){
      streetInit.customData = {}
    }

    cb();
  },

    /**
   * Checks whether the street exists, if it does not exist, then creates a new one and returns it.If exists, then checks
   * Hesh of the existing street and new data, if they are identical, then immediately gives the streetes, if not, it updates its data
   * for new ones
   * @param values
   * @return Updated or created street
   */
    async createOrUpdate(values: Street): Promise<Street> {
      sails.log.silly(`Core > Street > createOrUpdate: ${values.name}`)
      let hash = hashCode(JSON.stringify(values));
  
      let criteria = {}
      if( values.id) {
        criteria['id'] =  values.id;
      } else if (values.externalId) {
        criteria['externalId'] =  values.externalId;
      } else {
        throw `street ID not found`
      }
      const street = await Street.findOne(criteria);
      
      if (!street) {
        return Street.create({ hash, ...values }).fetch();
      } else {
        if (hash === street.hash) {
          return street;
        }
        return (await Street.update({ id: values.id }, { hash, ...values }).fetch())[0];
      }
    }
};

module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model,
};

declare global {
  const Street: typeof Model & ORMModel<Street, null>;
}
