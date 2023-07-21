import checkExpression, { AdditionalInfo } from "../libs/checkExpression";

import { ORMModel } from "../interfaces/ORMModel";

import ORM from "../interfaces/ORM";
import MediaFile from "../models/MediaFile";
import Dish from "../models/Dish";
import { WorkTime } from "@webresto/worktime";
import slugify from "slugify"
import { v4 as uuid } from "uuid";
import { OptionalAll } from "../interfaces/toolsTS";

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

  /** Addishinal info */
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
  } as unknown as Dish[],

  parentGroup: {
    model: "group",
  } as unknown as Group | any,

  childGroups: {
    collection: "group",
    via: "parentGroup",
  } as unknown as Group[] | string[],

  /** Icon */
  icon: {
    type: "string",
    allowNull: true
  },

  /** Images */
  images: {
    collection: "mediafile",
    via: "group",
  } as unknown as MediaFile[] | string[],

  /** PlaySholder for group dishes */
  dishesPlaceholder: {
    model: "mediafile",
  } as unknown as MediaFile[],

  /** The person readable isii*/
  slug: {
    type: "string",
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
};

type attributes = typeof attributes;
interface Group extends OptionalAll<attributes>, ORM {}
export default Group;

let Model = {
  beforeCreate(init: any, cb:  (err?: string) => void) {
    emitter.emit('core:group-before-create', init);
    if (!init.id) {
      init.id = uuid();
    }

    if (!init.concept) {
      init.concept = "origin"
    }

    init.slug = slugify(init.name, { remove: /[*+~.()'"!:@\\\/]/g, lower: true, strict: true, locale: 'en'});
    cb();
  },
  beforeUpdate: function (record, cb:  (err?: string) => void) {
    emitter.emit('core:group-before-update', record);
    return cb();
  },

  afterUpdate: function (record, cb:  (err?: string) => void) {
    emitter.emit('core:group-after-update', record);
    return cb();
  },

  afterCreate: function (record, cb:  (err?: string) => void) {
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
   * @fires group:core-group-get-groups - The result of execution in format {groups: {[groupId]:Group}, errors: {[groupId]: error}}
   */
  async getGroups(groupsId: string[]): Promise<{ groups: GroupWithAdditionalFields[]; errors: {} }> {

    let menu = {} as { [x: string]: GroupWithAdditionalFields };
    const groups = await Group.find({ where: {
      id: groupsId,
      isDeleted: false
    }})
      .populate("childGroups")
      .populate("dishes")
      .populate("images");

    const errors = {};
    for await(let group of groups) {
      const reason = checkExpression(group);
      if (!reason) {
        menu[group.id] = group as GroupWithAdditionalFields;

        if (group.childGroups) {
          let childGroups = [];
          const cgs = await Group.find({
            id: group.childGroups.map((cg) => cg.id),
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

    await emitter.emit("core-group-get-groups", menu, errors);

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
   * @fires group:core-group-get-groups - The result of execution in the format {Groups: {[Groupid]: Group}, Errors: {[Groupid]: error}}
   */
  async getGroup(groupId: string): Promise<Group> {
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
   * @fires group:core-group-get-groups - The result of execution in the format {Groups: {[Groupid]: Group}, Errors: {[Groupid]: error}}
   */
  async getGroupBySlug(groupSlug: string): Promise<Group> {

    if (!groupSlug) throw "groupSlug is required"

    const groupObj = await Group.findOne({ slug: groupSlug });

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

  /**
   * Menu for navbar
   * */
  async getMenuGroups(concept: string, topLevelGroupId?: string): Promise<Group[]> {
    let groups = [] as Group[]
    emitter.emit('core:group-get-menu', groups, concept);

    // Default logic
    if (!groups.length) {
      
      /**
       * Check all option from settings to detect TopLevelGroupId
       */
      if (!topLevelGroupId) {
        let menuTopLevelSlug = undefined as string;

        if(concept !== undefined) {
          menuTopLevelSlug = await Settings.get(`SLUG_MENU_TOP_LEVEL_CONCEPT_${concept.toUpperCase()}`) as string;
        }

        if( menuTopLevelSlug === undefined) {
          menuTopLevelSlug = await Settings.get(`SLUG_MENU_TOP_LEVEL`) as string;
        }

        if(menuTopLevelSlug) {
          let menuTopLevelGroup = await Group.findOne({ 
            slug: menuTopLevelSlug,
            ...concept &&  { concept: concept }
           })
          if(menuTopLevelGroup) {
            topLevelGroupId = menuTopLevelGroup.id
          }
        }
      }

      groups = await Group.find({
        parentGroup: topLevelGroupId ?? null,
        ...concept &&  { concept: concept }
      });

      // Check subgroups when one group in top menu
      if(groups.length === 1 && topLevelGroupId === undefined) {
        let childs = await Group.find({
          parentGroup: groups[0].id,
        });
        if(childs) groups = childs;
      }
    } 

    return groups
  },

  /**
   * Checks whether the group exists, if it does not exist, then creates a new one and returns it.
   * @param values
   * @return Updated or created group
   */
  async createOrUpdate(values: Group): Promise<Group> {
    sails.log.silly(`Core > Group > createOrUpdate: ${values.name}`)
    const group = await Group.findOne({ id: values.id });
    if (!group) {
      return Group.create(values).fetch();
    } else {
      return (await Group.update({ id: values.id }, values).fetch())[0];
    }
  },
};

/**
 * Describes a group of dishes at the time of obtaining its popularized version, additional fields are the error of the framework
 */
export interface GroupWithAdditionalFields extends Group {
  childGroups: Group[];
  dishesList: Dish[];
}

module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model,
};

declare global {
  const Group: typeof Model & ORMModel<Group, null>;
}