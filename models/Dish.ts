import checkExpression, { AdditionalInfo } from "../libs/checkExpression";
import { MediaFileRecord } from "./MediaFile";
import hashCode from "../libs/hashCode";
import { CriteriaQuery, ORMModel } from "../interfaces/ORMModel";
import ORM from "../interfaces/ORM";
import { WorkTime } from "@webresto/worktime";
import { v4 as uuid } from "uuid";
import { RequiredField, OptionalAll } from "../interfaces/toolsTS";
import { GroupModifier, Modifier } from "../interfaces/Modifier";
import { Adapter } from "../adapters";
import { CustomData, isCustomData } from "../interfaces/CustomData";
import { slugIt } from "../libs/slugIt";
import { UserRecord } from "./User";
import { GroupRecord } from "./Group";

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

  /** Ingredients of a dish */
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

  /** The number of carbohydrates per (100g)*/
  carbohydrateAmount: "number" as unknown as number,

  /**
   * @deprecated  
   * The number of carbohydrates in the dish */
  carbohydrateFullAmount: {
    type: "number",
    allowNull: true
  } as unknown as number,

  /** Energy value (100 g) */
  energyAmount: {
    type: "number",
    allowNull: true
  } as unknown as number,

  /** 
   * @deprecated 
   * Energy value */
  energyFullAmount: {
    type: "number",
    allowNull: true
  } as unknown as number,

  /**  The amount of fat (100 g) */
  fatAmount: {
    type: "number",
    allowNull: true
  } as unknown as number,

  /** 
   * @deprecated
   * The amount of fat in the dish */
  fatFullAmount: {
    type: "number",
    allowNull: true
  } as unknown as number,

  /** 
   * The number of fiber (100g)  */
  fiberAmount: {
    type: "number",
    allowNull: true
  } as unknown as number,

  /**
   * @deprecated 
   * The number of proteins in the dish */
  fiberFullAmount: {
    type: "number",
    allowNull: true
  } as unknown as number,


  /** The number of proteins (100g)  */
  proteinAmount: {
    type: "number",
    allowNull: true
  } as unknown as number,

  /**
   * @deprecated 
   * The number of proteins in the dish */
  proteinFullAmount: {
    type: "number",
    allowNull: true
  } as unknown as number,


  /** The group identifier in which the dish is located
   * @deprecated will be deleted in v2
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

  /** Parental group */
  parentGroup: {
    model: "group",
  } as unknown as GroupRecord | any,

  /** Tags for filtering (vegetarian, sharp ...) */
  tags: {
    type: "json",
  } as unknown as any,

  /** Balance for sale, if -1, then as much as you like */
  balance: {
    type: "number",
    defaultsTo: -1,
  } as unknown as number,

  /** The human easy readable */
  slug: {
    type: "string",
    unique: process.env.UNIQUE_SLUG === "1"
  } as unknown as string,

  /** The concept to which the dish belongs */
  concept: "string",

  /** Hash */
  hash: "string",

  /** Can be seen on the site on the menu */
  visible: "boolean" as unknown as boolean,

  /** A sign that this is a modifier */
  modifier: "boolean" as unknown as boolean,

  /**A sign that a promotional dish */
  promo: "boolean" as unknown as boolean,

  /** Working hours */
  worktime: "json" as unknown as WorkTime[],

  /** Dish modifiers */
  modifiers: {
    // collection: 'dish'
    type: "json",
  } as unknown as GroupModifier[],

  /**List of images of the dish*/
  images: {
    collection: "mediafile",
    via: "dish",
    through: 'selectedmediafile'
  } as unknown as MediaFileRecord[],

  favorites: {
    collection: 'user',
    via: 'favorites'
  } as unknown as UserRecord[],

  recommendations: {
    collection: "dish",
    via: 'recommendedBy',
  } as unknown as DishRecord[],

  recommendedBy: {
    collection: "dish",
    via: 'recommendations',
  } as unknown as DishRecord[],

  recommendedForGroup: {
    collection: "group",
    via: 'recommendedDishes',
  } as unknown as GroupRecord[],

  /*
  helper.addCustomField("Dish", "discountAmount: Float");
  helper.addCustomField("Dish", "discountType: String");
  helper.addCustomField("Dish", "salePrice: Float");
  */

  customData: "json" as unknown as CustomData,

};

interface IVirtualFields {
  discountAmount?: number;
  discountType?: "flat" | "percentage"
  /**
   * @deprecated change to oldPrice
   */
  oldPrice?: number;
  salePrice?: number;
}

type attributes = typeof attributes;

/**
 * @deprecated use `DishRecord` instead
 */
interface Dish extends RequiredField<OptionalAll<attributes>, "name" | "price">, IVirtualFields, ORM { }
export interface DishRecord extends RequiredField<OptionalAll<attributes>, "name" | "price">, IVirtualFields, ORM { }

let Model = {
  beforeCreate: async function (init: DishRecord, cb: (err?: string) => void) {
    emitter.emit('core:product-before-create', init);
    if (!init.id) {
      init.id = uuid();
    }

    if (!init.modifiers) init.modifiers = []
    if (init.visible === undefined) init.visible = true;

    if (!init.concept) {
      init.concept = "origin"
    }

    const slugOpts = [];
    if (init.concept !== "origin" && process.env.UNIQUE_SLUG === "1") {
      slugOpts.push(init.concept)
    }

    init.slug = await slugIt("dish", init.name, "slug", slugOpts)

    if (!isCustomData(init.customData)) {
      init.customData = {}
    }

    init.visible = init.visible ?? true

    cb();
  },

  beforeUpdate: async function (value: DishRecord, cb: (err?: string) => void) {
    emitter.emit('core:product-before-update', value);
    if (value.customData) {
      if (value.id !== undefined) {
        let current = await Dish.findOne({ id: value.id });
        if (!isCustomData(current.customData)) current.customData = {}
        let customData = { ...current.customData, ...value.customData }
        value.customData = customData;
      }
    }
    return cb();
  },

  afterUpdate: function (record: DishRecord, cb: (err?: string) => void) {
    emitter.emit('core:product-after-update', record);
    return cb();
  },

  afterCreate: function (record: DishRecord, cb: (err?: string) => void) {
    emitter.emit('core:product-after-create', record);
    return cb();
  },

  /**
   * Accepts Waterline Criteria and prepares it there isDeleted = false, balance! = 0. Thus, this function allows
   *  finding in the base of the dishes according to the criterion and at the same time such that you can work with them to the user.
   * @param criteria - criteria asked
   * @return Found dishes
   */
  async getDishes(criteria: any = {}): Promise<DishRecord[]> {
    criteria.isDeleted = false;

    if (!(await Settings.get("SHOW_UNAVAILABLE_DISHES"))) {
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

    await emitter.emit("core:product-get-dishes", dishes);
    return dishes;
  },

  /**
   * Popularizes the modifiers of the dish, that is, all the Group modifiers are preparing a group and dishes that correspond to them,
   * And ordinary modifiers are preparing their dish.
   * @param dish
   */
  async getDishModifiers(dish: DishRecord): Promise<DishRecord> {

    if (dish.modifiers) {
      let index = 0;

      // group modofiers
      for await (let modifier of dish.modifiers) {

        let childIndex = 0
        let childModifiers = []

        if (dish.modifiers[index].modifierId !== undefined || dish.modifiers[index].id !== undefined) {

          let criteria: {
            id?: string;
            rmsId?: string;
            concept?: string;
          } = {};
          
          criteria.concept = dish.concept ?? undefined;
          
          if (modifier.modifierId) {
            criteria["id"] = modifier.modifierId;
          } else if (modifier.id) {
            criteria["rmsId"] = modifier.id;
          } else {
            throw `Group modifierId or rmsId not found`;
          }

          dish.modifiers[index].group = (await Group.find(criteria).limit(1))[0];
        }

        if (!modifier.childModifiers) modifier.childModifiers = [];

        for await (let childModifier of modifier.childModifiers) {
          let criteria: {
            id?: string;
            rmsId?: string;
            concept?: string;
          } = {
            concept: dish.concept ?? undefined
          }

          if (childModifier.modifierId) {
            criteria["id"] = childModifier.modifierId
          } else if (childModifier.id) {
            criteria["rmsId"] = childModifier.id
          } else {
            throw `Dish modifierId or rmsId not found`
          }

          let childModifierDish = (await Dish.find({ where: criteria, limit: 1 }).populate('images'))[0]
          if (!childModifierDish || (childModifierDish && childModifierDish.balance === 0)) {
            // delete if dish not found
            sails.log.warn("DISH > getDishModifiers: Modifier " + childModifier.modifierId + " from dish:" + dish.name + " not found")
          } else {
            try {
              childModifier.dish = childModifierDish
              childModifiers.push(childModifier);
            } catch (error) {
              sails.log.error("DISH > getDishModifiers: problem with: " + childModifier.modifierId + " in dish:" + dish.name);
            }
          }
          childIndex++;
        }
        //

        dish.modifiers[index].childModifiers = childModifiers;

        // If groupMod not have options delete it
        if (modifier.childModifiers && !modifier.childModifiers.length) {
          sails.log.warn("DISH > getDishModifiers: GroupModifier " + modifier.id + " from dish:" + dish.name + " not have modifiers")
          dish.modifiers.splice(index, 1);
        }
        index++;
      }
    }
    return dish
  },

  async display(criteria: CriteriaQuery<DishRecord>): Promise<DishRecord[]> {
    const dishes = await Dish.find(criteria);

    // Set virtual default
    dishes.forEach((dish) => {
      dish.discountAmount = 0;
      dish.discountType = null;
      dish.oldPrice = null;
      dish.salePrice = null;
    });

    const promotionAdapter = Adapter.getPromotionAdapter()
    let updatedDishes = [] as DishRecord[]

    for (let i: number = 0; i < dishes.length; i++) {
      try {
        updatedDishes.push(promotionAdapter.displayDish(dishes[i]))
      } catch (error) {
        sails.log.error(error)
        continue
      }
    }
    return updatedDishes;
  },


  getRecommended: async function (ids: string[], limit = 12, includeReverse = false): Promise<DishRecord[]> {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error('You must provide an array of IDs.');
    }

    const baseCriteriaDish = {
      balance: { "!=": 0 },
      modifier: false,
      isDeleted: false,
      visible: true
    };

    const groupLimit = Math.max(Math.round(limit / ids.length), 1);

    let dishes = await sails.models.dish.find({
      where: {
        id: ids,
        ...baseCriteriaDish
      }
    }).populate('recommendations', {
      where: {
        'and': [
          { 'balance': { "!=": 0 } },
          { 'modifier': false },
          { 'isDeleted': false },
          { 'visible': true }
        ]
      },
      limit: groupLimit
    }).populate('recommendedBy', {
      where: {
        'and': [
          { 'balance': { "!=": 0 } },
          { 'modifier': false },
          { 'isDeleted': false },
          { 'visible': true }
        ]
      },
      limit: includeReverse ? groupLimit : 0
    });


    let recommendedDishes: DishRecord[] = dishes.reduce((acc: DishRecord[], dish: DishRecord) => {
      return acc.concat(dish.recommendations);
    }, []);


    if (includeReverse) {
      dishes.forEach((group: DishRecord) => {
        recommendedDishes = recommendedDishes.concat(group.recommendedBy);
      });
    }

    recommendedDishes = [...new Set(recommendedDishes.map((dish: DishRecord) => dish.id))].map(id =>
      recommendedDishes.find((dish: DishRecord) => dish.id === id)
    );

    recommendedDishes = recommendedDishes.filter((dish: DishRecord) => !ids.includes(dish.id));

    // Fisher-Yates shifle
    recommendedDishes = recommendedDishes.sort(() => Math.random() - 0.5);

    if (limit && Number.isInteger(limit) && limit > 0) {
      recommendedDishes = recommendedDishes.slice(0, limit);
    }

    return recommendedDishes;
  },

  /**
   * Checks whether the dish exists, if it does not exist, then creates a new one and returns it.If exists, then checks
   * Hash of the existing dish and new data, if they are identical, then immediately gives the dishes, if not, it updates its data
   * for new ones
   * @param values
   * @return Updated or created dish
   */
  async createOrUpdate(values: DishRecord): Promise<DishRecord> {
    sails.log.silly(`Core > Dish > createOrUpdate: ${values.name}`)
    let hash = hashCode(JSON.stringify(values));

    let criteria:{
      id?: string;
      rmsId?: string;
    } = {}
    if (values.id) {
      criteria['id'] = values.id;
    } else if (values.rmsId) {
      criteria['rmsId'] = values.rmsId;
    } else {
      throw `no id/rmsId provided`
    }

    const dish = await Dish.findOne(criteria);
    if (!dish) {
      return await Dish.create({ hash, ...values }).fetch();
    } else {
      if (hash === dish.hash) {
        return dish;
      }
      return (await Dish.update(criteria, { hash, ...values }).fetch())[0];
    }
  },
};

module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model,
};

declare global {
  const Dish: typeof Model & ORMModel<DishRecord, "name" | "price">;
}
