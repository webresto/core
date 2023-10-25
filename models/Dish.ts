import Group from "./Group";
import checkExpression, { AdditionalInfo } from "../libs/checkExpression";
import MediaFile from "./MediaFile";
import hashCode from "../libs/hashCode";

import { CriteriaQuery, ORMModel } from "../interfaces/ORMModel";

import ORM from "../interfaces/ORM";
import * as _ from "lodash";
import { WorkTime } from "@webresto/worktime";
import { v4 as uuid } from "uuid";
import { RequiredField, OptionalAll } from "../interfaces/toolsTS";
import { GroupModifier, Modifier } from "../interfaces/Modifier";
import { Adapter } from "../adapters";
import { CustomData, isCustomData } from "../interfaces/CustomData";
import slugify from "slugify";

let attributes = {
  /** */
  id: {
    type: "string",
    //required: true,
  } as unknown as string,

  /** */
  rmsId: {
    type: "string",
    //required: true,
  } as unknown as string,

  /** */
  additionalInfo: {
    type: "string",
    allowNull: true,
  } as unknown as string,

  /** Article */
  code: {
    type: "string",
    allowNull: true,
  } as unknown as string,

  /** Description of the dish */
  description: {
    type: "string",
    allowNull: true,
  } as unknown as string,

  /** Ingredients of dish */
  ingredients: {
    type: "string",
    allowNull: true,
  } as unknown as string,

  /** Name */
  name: {
    type: "string",
    required: true,
  } as unknown as string,

  /** SEO description */
  seoDescription: {
    type: "string",
    allowNull: true,
  } as unknown as string,

  /** SEO keywords */
  seoKeywords: {
    type: "string",
    allowNull: true,
  } as unknown as string,

  /** SEO text */
  seoText: {
    type: "string",
    allowNull: true,
  } as unknown as string,

  /** SEO title */
  seoTitle: {
    type: "string",
    allowNull: true,
  } as unknown as string,

  /** The amount of carbohydrates per (100g)*/
  carbohydrateAmount: "number" as unknown as number,

  /** The amount of carbohydrates in the dish */
  carbohydrateFullAmount: {
    type: "number",
    allowNull: true
  } as unknown as number,

  /** Energy value (100 g) */
  energyAmount: {
    type: "number",
    allowNull: true
  } as unknown as number,

  /** Energy value */
  energyFullAmount: {
    type: "number",
    allowNull: true
  } as unknown as number,

  /**  The amount of fat (100 g) */
  fatAmount: {
    type: "number",
    allowNull: true
  } as unknown as number,

  /** The amount of fat in the dish */
  fatFullAmount: {
    type: "number",
    allowNull: true
  } as unknown as number,

  /** The number of proteins (100g)  */
  fiberAmount: {
    type: "number",
    allowNull: true
  } as unknown as number,

  /** The amount of proteins in the dish */
  fiberFullAmount: {
    type: "number",
    allowNull: true
  } as unknown as number,


  /** The group identifier in which the dish is located 
   * @deprecated will  be deleted in v2
  */
  groupId: {
    type: "string",
    allowNull: true,
  } as unknown as string,

  /** Unit of measurement of goods (kg, l, pcs, port.)*/
  measureUnit: {
    type: "string",
    allowNull: true,
  } as unknown as string,

  /** The price of the dish */
  price: "number" as unknown as number,

  /**  */
  productCategoryId: {
    type: "string",
    allowNull: true,
  } as unknown as string,

  /** Type */
  type: "string", //TODO: product, dish, service

  /** Weight  */
  weight: {
    type: "number",
    allowNull: true
  } as unknown as number,

  /** Sorting order */
  sortOrder: "number" as unknown as number,

  /** The dish is removed */
  isDeleted: "boolean" as unknown as boolean,

  /** The dish can be modified*/
  isModificable: "boolean" as unknown as boolean,

  /** Модифакторы блюда */
  modifiers: {
    // collection: 'dish'
    type: "json",
  } as unknown as GroupModifier[],

  /** Parental group */
  parentGroup: {
    model: "group",
  } as unknown as Group | any,

  /** Tags for filtering (vegetarian, sharp ...) */
  tags: {
    type: "json",
  } as unknown as any,

  /** Balance for sale, if -1, then as much as you like */
  balance: {
    type: "number",
    defaultsTo: -1,
  } as unknown as number,

  /**List of images of the dish*/
  images: {
    collection: "mediafile",
    via: "dish",
  } as unknown as MediaFile[] | string[],

  /** Слаг */
  slug: {
    type: "string",
    unique: true
  } as unknown as string,

  /** The concept to which the dish belongs */
  concept: "string",

  /** Wesh */
  hash: "string",

  /** Can be seen on the site on the menu */
  visible: "boolean" as unknown as boolean,

  /** A sign that this is a modifier */
  modifier: "boolean" as unknown as boolean,

  /**A sign that a promotional dish */
  promo: "boolean" as unknown as boolean,

  /** Working hours */
  worktime: "json" as unknown as WorkTime[],

  /* 
  helper.addCustomField("Dish", "discountAmount: Float");
  helper.addCustomField("Dish", "discountType: String");
  helper.addCustomField("Dish", "oldPrice: Float");
  */


  customData: "json" as unknown as CustomData,

};

interface IVirtualFields {
  discountAmount?: number;
  discountType?: "flat" | "percentage"
  oldPrice?: number;
}

type attributes = typeof attributes;
interface Dish extends RequiredField<OptionalAll<attributes>, "name" | "price">, IVirtualFields, ORM {}
export default Dish;

let Model = {
  beforeCreate(init: Dish, cb:  (err?: string) => void) {
    emitter.emit('core:dish-before-create', init);
    if (!init.id) {
      init.id = uuid();
    }

    if (!init.concept) {
      init.concept = "origin"
    }

    if (!init.slug) {
      const postfix = init.concept === "origin" ? "" : "-"+init.concept;
      init.slug = slugify(`${init.name}${postfix}`, { remove: /[*+~.()'"!:@\\\/]/g, lower: true, strict: true, locale: 'en'});
      init.slug = init.slug+"-"+init.id.substr(init.id.length - 4).toLowerCase();
    }


    if(!isCustomData(init.customData)){
      init.customData = {}
    }

    cb();
  },

  beforeUpdate: async function (value: Dish, cb:  (err?: string) => void) {
    emitter.emit('core:dish-before-update', value);
    if(value.customData) {
      if (value.id !== undefined) {
        let current = await Dish.findOne({id: value.id});
        if(!isCustomData(current.customData)) current.customData = {}
        let customData = {...current.customData, ...value.customData} 
        value.customData = customData;
      }
    }

    if (!value.slug) {
      const postfix = value.concept === "origin" ? "" : "-"+value.concept;
      value.slug = slugify(`${value.name}${postfix}`, { remove: /[*+~.()'"!:@\\\/]/g, lower: true, strict: true, locale: 'en'});
    }
    return cb();
  },

  afterUpdate: function (record, cb:  (err?: string) => void) {
    emitter.emit('core:dish-after-update', record);
    return cb();
  },

  afterCreate: function (record, cb:  (err?: string) => void) {
    emitter.emit('core:dish-after-create', record);
    return cb();
  },

  /**
   * Accepts Waterline Criteria and prepares it there isdeleted = false, balance! = 0. Thus, this function allows
   * Find in the base of the dishes according to the criterion and at the same time such that you can work with them to the user.
   * @param criteria - criteria asked
   * @return Found dishes
   */
  async getDishes(criteria: any = {}): Promise<Dish[]> {
    criteria.isDeleted = false;

    if (!(await Settings.get("ShowUnavailableDishes"))) {
      criteria.balance = { "!=": 0 };
    }

    let dishes = await Dish.find(criteria).populate("images");

    for await (let dish of dishes) {
      const reason = checkExpression(dish as Pick<typeof dish, "worktime" | "visible" | "promo" | "modifier">);
      if (!reason) {
        await Dish.getDishModifiers(dish);
        if (dish.images.length >= 2) dish.images.sort((a, b) => b.uploadDate.localeCompare(a.uploadDate));
      } else {
        dishes.splice(dishes.indexOf(dish), 1);
      }
    }

    dishes.sort((a, b) => a.sortOrder - b.sortOrder);

    await emitter.emit("core-dish-get-dishes", dishes);
    return dishes;
  },

  /**
   * Popularizes the modifiers of the dish, that is, all the Group modifiers are preparing a group and dishes that correspond to them,
   * And ordinary modifiers are preparing their dish.
   * @param dish
   */
   async getDishModifiers(dish: Dish): Promise<Dish> {

    if(dish.modifiers){
      let index = 0;
      
      // group modofiers
      for await(let  modifier of dish.modifiers){
        
        let childIndex=0
        let childModifiers = []
        
        
        
        // assign group
        console.log("GETMMM",        
            {
              id: modifier.modifierId,
              rmsId: modifier.id}
              )

        if (dish.modifiers[index].modifierId !== undefined || dish.modifiers[index].id !== undefined){
            let criteria = {}

            if( modifier.modifierId){
              criteria["id"] = modifier.modifierId
            } else if(modifier.id) {
              criteria["rmsId"] = modifier.id
            } else {
              throw `Group modifierId or rmsId not found`
            }

            dish.modifiers[index].group = await Group.findOne(criteria);
          }
          
          if (!modifier.childModifiers) modifier.childModifiers = [];
          
          for await(let childModifier of modifier.childModifiers){
            let criteria = {}

            if( childModifier.modifierId){
              criteria["id"] = childModifier.modifierId
            } else if(childModifier.id) {
              criteria["rmsId"] = childModifier.id
            } else {
              throw `Dish modifierId or rmsId not found`
            }

            let childModifierDish = await Dish.findOne(criteria).populate('images')
            if (!childModifierDish || (childModifierDish && childModifierDish.balance === 0)){
              // delete if dish not found
              sails.log.warn("DISH > getDishModifiers: Modifier "+ childModifier.modifierId +" from dish:"+dish.name+" not found")
            } else {
              try {
                childModifier.dish = childModifierDish
                childModifiers.push(childModifier);
              } catch (error) {
                  sails.log.error("DISH > getDishModifiers: problem with: "+ childModifier.modifierId+ " in dish:"+ dish.name );
              }
            }
            childIndex++;
          }
          // 
          
          dish.modifiers[index].childModifiers = childModifiers;
          
          // If groupMod not have options delete it
          if (modifier.childModifiers && !modifier.childModifiers.length) {  
            sails.log.warn("DISH > getDishModifiers: GroupModifier "+ modifier.id +" from dish:"+ dish.name+" not have modifiers")
            dish.modifiers.splice(index, 1);
          }
          index++;
        }
    }
    return dish
  },

  async display(criteria: CriteriaQuery<Dish>): Promise<Dish[]> {
    const dishes = await Dish.find(criteria);
    const discountAdapter = Adapter.getPromotionAdapter()
    let updatedDishes = [] as Dish[]

    for(let i:number= 0; i < dishes.length; i++) {
        try {
          updatedDishes.push(discountAdapter.displayDish(dishes[i]))
        } catch (error) {
          sails.log(error)
          continue
        }
    }
    return updatedDishes;
  },

  /**
   * Checks whether the dish exists, if it does not exist, then creates a new one and returns it.If exists, then checks
   * Hesh of the existing dish and new data, if they are identical, then immediately gives the dishes, if not, it updates its data
   * for new ones
   * @param values
   * @return Updated or created dish
   */
  async createOrUpdate(values: Dish): Promise<Dish> {
    sails.log.silly(`Core > Dish > createOrUpdate: ${values.name}`)
    let hash = hashCode(JSON.stringify(values));

    let criteria = {}
    if( values.id) {
      criteria['id'] =  values.id;
    } else {
      criteria['rmsId'] =  values.rmsId;
    }
    const dish = await Dish.findOne(criteria);
    
    if (!dish) {
      return await Dish.create({ hash, ...values }).fetch();
    } else {
      if (hash === dish.hash) {
        return dish;
      }
      return (await Dish.update({ id: values.id }, { hash, ...values }).fetch())[0];
    }
  },
};

module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model,
};

declare global {
  const Dish: typeof Model & ORMModel<Dish, "name" | "price">;
}
