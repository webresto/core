import checkExpression, { AdditionalInfo } from "../libs/checkExpression";

import { CriteriaQuery, ORMModel } from "../interfaces/ORMModel";

import ORM from "../interfaces/ORM";
import { MediaFileRecord } from "./MediaFile";
// todo: fix types model instance to {%ModelName%}Record for Dish";
import { WorkTime } from "@webresto/worktime";
import { v4 as uuid } from "uuid";
import { OptionalAll } from "../interfaces/toolsTS";
import { Adapter } from "../adapters";
import { slugIt } from "../libs/slugIt";
import { DishRecord } from "./Dish";
export type GetGroupType = { [x: string]: GroupWithAdditionalFields }

let attributes = {
  /**Id */
  id: {
    type: "string",
    //required: true,
  } as unknown as string,


  /** ID in external system */
  rmsId: {
    type: "string",
    //required: true,
  } as unknown as string,

  /** Additional info */
  additionalInfo: {
    type: "string",
    allowNull: true,
  } as unknown as string,

  /** */
  code: {
    type: "string",
    allowNull: true,
  } as unknown as string,

  description: {
    type: "string",
    allowNull: true,
  } as unknown as string,

  /** Soft deletion */
  isDeleted: "boolean" as unknown as boolean,

  /** Dishes group name*/
  name: {
    type: "string",
    //required: true,
  } as unknown as string,

  seoDescription: {
    type: "string",
    allowNull: true,
  } as unknown as string,

  seoKeywords: {
    type: "string",
    allowNull: true,
  } as unknown as string,

  seoText: {
    type: "string",
    allowNull: true,
  } as unknown as string,

  seoTitle: {
    type: "string",
    allowNull: true,
  } as unknown as string,

  /** Sorting weight */
  sortOrder: "number" as unknown as number,

  dishes: {
    collection: "dish",
    via: "parentGroup",
  } as unknown as DishRecord[],

  parentGroup: {
    model: "group",
  } as unknown as GroupRecord | string,

  childGroups: {
    collection: "group",
    via: "parentGroup",
  } as unknown as GroupRecord[] | string[],

  recommendations: {
    collection: "group",
    via: 'recommendedBy',
  } as unknown as GroupRecord[] | string[],
  
  recommendedBy: {
    collection: "group",
    via: 'recommendations',
  } as unknown as GroupRecord[] | string[],

  recommendedDishes: {
    collection: "dish",
    via: 'recommendedForGroup',
  } as unknown as DishRecord[],


  /** Icon */
  icon: {
    type: "string",
    allowNull: true
  },

  /** Images */
  images: {
    collection: "mediafile",
    via: "group",
    through: 'selectedmediafile'
  } as unknown as MediaFileRecord[] | string[],

  /** Placeholder for group dishes */
  dishesPlaceholder: {
    model: "mediafile",
  } as unknown as MediaFileRecord,

  /** The human easy readable*/
  slug: {
    type: "string",
    unique: process.env.UNIQUE_SLUG === "1"
  } as unknown as string,

  /** The concept to which the group belongs */
  concept: "string",

  /** The group is displayed*/
  visible: "boolean" as unknown as boolean,

  /**A group of modifiers */
  modifier: "boolean" as unknown as boolean,

  /**  A sign that this is a promo group
   *  The promo group cannot be added from the user.
   */
  promo: "boolean" as unknown as boolean,

  /** Working hours */
  worktime: "json" as unknown as WorkTime[],

  customData: "json" as unknown as {
    [key: string]: string | boolean | number;
  } | string,
};

interface IVirtualFields {
  discountAmount?: number;
  discountType?: "flat" | "percentage"
}

type attributes = typeof attributes;

export interface GroupRecord extends OptionalAll<attributes>, IVirtualFields, ORM {}

let Model = {
  beforeCreate: async function(init: GroupRecord, cb:  (err?: string) => void) {
    emitter.emit('core:group-before-create', init);
    if (!init.id) {
      init.id = uuid();
    }

    if (!init.concept) {
      init.concept = "origin"
    }

    init.visible = init.visible ?? true

    const slugOpts = [];
    if(init.concept !== "origin" && process.env.UNIQUE_SLUG === "1") {
      slugOpts.push(init.concept)
    }

    init.slug = await slugIt("group", init.name, "slug", slugOpts)
    cb();
  },

  beforeUpdate: function (record: GroupRecord, cb:  (err?: string) => void) {
    emitter.emit('core:group-before-update', record);
    return cb();
  },

  afterUpdate: function (record: GroupRecord, cb:  (err?: string) => void) {
    emitter.emit('core:group-after-update', record);
    return cb();
  },

  afterCreate: function (record: GroupRecord, cb:  (err?: string) => void) {
    emitter.emit('core:group-after-create', record);
    return cb();
  },

  /**
   * Returns an object with groups and errors of obtaining these very groups.
   * @deprecated not used
   * @param groupsId - array of ID groups that should be obtained
   * @return Object {
   *   groups: [],
   *   errors: {}
   * }
   * where Groups is an array, requested groups with a complete display of investment, that is, with their dishes, the dishes are their modifiers
   * and pictures, there are pictures of the group, etc., and errors is an object in which the keys are groups that cannot be obtained
   * According to some dinich, the values of this object are the reasons why the group was not obtained.
   * @fires group:core:group-get-groups - The result of execution in format {groups: {[groupId]:GroupRecord}, errors: {[groupId]: error}}
   */
  async getGroups(groupsId: string[]): Promise<{ groups: GroupWithAdditionalFields[]; errors: Record<string, string> }> {

    let menu = {} as GetGroupType;
    const groups = await Group.find({ where: {
      id: groupsId,
      isDeleted: false
    }})
      .populate("childGroups")
      .populate("dishes")
      .populate("images");

    const errors: Record<string, string> = {};
    for await(let group of groups) {
      const reason = checkExpression(group);
      if (!reason) {
        menu[group.id] = group as GroupWithAdditionalFields;

        if (group.childGroups) {
          let childGroups = [];
          const cgs = await Group.find({
            id: group.childGroups.map((cg) => {
              if(typeof cg !== "string") {
                return cg.id
              } else {
                throw `Type error childGroups`
              }
            }), 
            isDeleted: false
          })
            .populate("childGroups")
            .populate("dishes")
            .populate("images");

          for await(let cg of cgs) {
            try {
              const data = await Group.getGroup(cg.id);
              if (data) childGroups.push(data);
            } catch (e) {}
          }

          delete menu[group.id].childGroups;
          menu[group.id].childGroups = childGroups;
          if (menu[group.id].childGroups.length > 1) menu[group.id].childGroups.sort((a, b) => a.sortOrder- b.sortOrder);

        }

        menu[group.id].dishesList = await Dish.getDishes({
          parentGroup: group.id
        });
      } else {
        errors[group.id] = reason;
      }
    }

    await emitter.emit("core:group-get-groups", menu, errors);

    const res = Object.values(menu);

    //TODO: rewrite with throw
    return { groups: res, errors: errors };
  },

  /**
   * Returns a group with a given ID
   * @deprecated not used
   * @param groupId - ID groups
   * @return The requested group
   * @throws The error of obtaining a group
   * @fires group:core:group-get-groups - The result of execution in the format {Groups: {[Groupid]: GroupRecord}, Errors: {[Groupid]: error}}
   */
  async getGroup(groupId: string): Promise<GroupRecord> {
    const result = await Group.getGroups([groupId]);
    if (result.errors[0]) {
      throw result.errors[0];
    }
    const group = result.groups;
    return group[0] ? group[0] : null;
  },

  /**
   * Returns a group with a given Slug
   * @deprecated not used
   * @param groupSlug - Slug groups
   * @return The requested group
   * @throws The error of obtaining a group
   * @fires group:core:group-get-groups - The result of execution in the format {Groups: {[Groupid]: GroupRecord}, Errors: {[Groupid]: error}}
   */
  async getGroupBySlug(groupSlug: string): Promise<GroupRecord> {

    if (!groupSlug) throw "groupSlug is required"

    let groupObj;
    if(process.env.UNIQUE_SLUG === "1") {
      groupObj = await Group.findOne({ slug: groupSlug });
    } else {
      groupObj = (await Group.find({ slug: groupSlug, isDeleted: false }).limit(1))[0];
    }

    if (!groupObj) {
      throw "group with slug " + groupSlug + " not found";
    }
    const result = await this.getGroups([groupObj.id]);
    if (result.errors[0]) {
      throw result.errors[0];
    }

    const group = result.groups;
    return group[0] ? group[0] : null;
  },

  // use this method to get a group modified by adapters
  // https://github.com/balderdashy/waterline/pull/902
  async display(criteria: CriteriaQuery<GroupRecord>): Promise<GroupRecord[]> {
    const promotionAdapter = Adapter.getPromotionAdapter()
    const groups = await Group.find(criteria);
    // Set virtual default
    groups.forEach((group)=>{
      group.discountAmount = 0;
      group.discountType = null;
    });

    let updatedDishes = [] as GroupRecord[]
    for(let i:number=0; i < groups.length; i++) {
      try {
        updatedDishes.push(promotionAdapter.displayGroup(groups[i]))
      } catch (error) {
        sails.log.error(error)
        continue
      }
    }
    return updatedDishes;
  },

  // Recursive function to get all child groups
  async getMenuTree(menu?: GroupRecord[], option: "only_ids" | "tree" | "flat_tree" = "only_ids"): Promise<string[]> {

    if(option === "tree") {
      throw `not implemented yet`
    }

    if(!menu) {
      menu = await Group.getMenuGroups();
    }

    let allGroups: any[] | PromiseLike<string[]> = [];
    for (let group of menu) {
      const groupId = group.id
      const initialGroup = (await Group.find({ id: groupId, isDeleted: false }).sort('createdAt DESC')).shift();
      if (initialGroup) {
        allGroups.push(initialGroup);
        const childGroups = await getAllChildGroups(groupId);
        allGroups = allGroups.concat(childGroups);
        allGroups.sort((a, b) => a.sortOrder - b.sortOrder);
      }
    }

    async function getAllChildGroups(groupId: string) {
      let childGroups = await Group.find({ parentGroup: groupId, isDeleted: false });
      let allChildGroups: any[] = [];

      for (let group of childGroups) {
        allChildGroups.push(group);
        const subChildGroups = await getAllChildGroups(group.id);
        allChildGroups = allChildGroups.concat(subChildGroups);
      }

      allChildGroups.sort((a, b) => a.sortOrder - b.sortOrder);

      return allChildGroups;
    }


    if(option === "flat_tree") {
      return allGroups;
    }

    if(option === "only_ids") {
      return allGroups.map(group => group.id);
    }
  },
  /**
   * Menu for navbar
   * */
  async getMenuGroups(concept?: string, topLevelGroupId?: string): Promise<GroupRecord[]> {
    let groups = [] as GroupRecord[]
    emitter.emit('core:group-get-menu', groups, concept);

    // Default logic
    if (!groups.length) {

      /**
       * Check all option from settings to detect TopLevelGroupId
       */
      if (!topLevelGroupId) {
        let menuTopLevelSlug = undefined as string;

        if(concept !== undefined) {
          menuTopLevelSlug = await Settings.get(`SLUG_MENU_TOP_LEVEL_CONCEPT_${concept.toUpperCase()}`);
        }

        if( menuTopLevelSlug === undefined) {
          menuTopLevelSlug = await Settings.get(`SLUG_MENU_TOP_LEVEL`);
        }

        if(menuTopLevelSlug) {
          let menuTopLevelGroup = (await Group.find({
            slug: menuTopLevelSlug,
            ...concept &&  { concept: concept },
            isDeleted: false
           }).limit(1))[0]
          if(menuTopLevelGroup) {
            topLevelGroupId = menuTopLevelGroup.id
          }
        }
      }

      groups = await Group.find({
        parentGroup: topLevelGroupId ?? null,
        ...concept &&  { concept: concept },
        isDeleted: false,
        modifier: false,
        visible: true
      });

      // Check subgroups when one group in the top menu
      if(groups.length === 1 && topLevelGroupId === undefined) {
        let children = await Group.find({
          parentGroup: groups[0].id,
          isDeleted: false,
          modifier: false,
          visible: true
        });
        if(children) groups = children;
      }
    }

    return groups.sort((a, b) => a.sortOrder - b.sortOrder);
  },

  
  /**
   * Static method for obtaining recommended dishes by group.
   * @param {string[]} ids - An array of group IDs.
   * @param {number} [limit=15] - Optional number of dishes to be returned.
   * @param {boolean} [includeReverse=false] - Include reverse recommendations.
   * @returns {Promise<object[]>} - An array of recommended dishes.
   */
  async getRecommendedDishes(ids: string[], limit: number = 12, includeReverse: boolean = true): Promise<DishRecord[]> {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error('You must provide an array of IDs.');
    }

    const baseCriteriaGroup = {
      isDeleted: false
    };

    const groupLimit = Math.max(Math.round(limit/ids.length), 1);

    const groups = await sails.models.group.find({
      where: {
        id: ids,
        ...baseCriteriaGroup
      }
    }).populate('recommendations', {
      where: {
        'and': [
          { 'modifier': false },
          { 'isDeleted': false },
          { 'visible': true }
        ]
      },
      limit: groupLimit
    }).populate('recommendedBy', {
      where: {
        'and': [
          { 'modifier': false },
          { 'isDeleted': false },
          { 'visible': true }
        ]
      },
      limit: includeReverse ? groupLimit : 0
    }).populate('recommendedDishes', {
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

    let groupRecommendedDishes: DishRecord[] = groups.flatMap((group: GroupRecord) => group.recommendedDishes);

    let recommendedGroupIds = groups.reduce((acc: string[], group: GroupRecord) => {
      return acc.concat(group.recommendations.map((rec:GroupRecord) => rec.id));
    }, []);


    if (includeReverse) {
      groups.forEach((group: GroupRecord) => {
        recommendedGroupIds = recommendedGroupIds.concat(group.recommendedBy.map((rec: GroupRecord) => rec.id));
      });
    }

    const baseCriteriaDish = {
      balance: { "!=": 0 },
      modifier: false,
      isDeleted: false,
      visible: true
    };

    let recommendedDishes = await sails.models.dish.find({
      where: {
        parentGroup: recommendedGroupIds,
        ...baseCriteriaDish
      }
    });

    recommendedDishes = [...new Set(recommendedDishes.map((dish: DishRecord) => dish.id))].map(id =>
      recommendedDishes.find((dish: DishRecord) => dish.id === id)
    );

    // Fisher-Yates algrythm
    recommendedDishes = recommendedDishes.sort(() => Math.random() - 0.5);

    let dishForRecommend = [...groupRecommendedDishes, ...recommendedDishes]

    if (limit && Number.isInteger(limit) && limit > 0) {
      dishForRecommend = dishForRecommend.slice(0, limit);
    }

    return dishForRecommend;
  },

  /**
   * Checks whether the group exists, if it does not exist, then creates a new one and returns it.
   * @param values
   * @return Updated or created group
   */
  async createOrUpdate(values: GroupRecord): Promise<GroupRecord> {
    sails.log.silly(`Core > Group > createOrUpdate: ${values.name}`)
    let criteria:{
      id?: string;
      rmsId?: string;
    } = {}
    if(values.id) {
      criteria['id'] =  values.id;
    } else if(values.rmsId) {
      criteria['rmsId'] =  values.rmsId;
    } else {
      throw `no id/rmsId provided`
    }

    // TODO: possible to error find many by rmsId
    const group = await Group.findOne(criteria);

    if (!group) {
      return Group.create(values).fetch();
    } else {
      return (await Group.update(criteria, values).fetch())[0];
    }
  },
};

/**
 * Describes a group of dishes at the time of obtaining its popularized version, additional fields are the error of the framework
 */
export interface GroupWithAdditionalFields extends GroupRecord {
  childGroups: GroupRecord[];
  dishesList: DishRecord[];
}

module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model,
};

declare global {
  const Group: typeof Model & ORMModel<GroupRecord, null>;
}
