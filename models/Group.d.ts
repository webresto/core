import { ORMModel } from "../interfaces/ORMModel";
import ORM from "../interfaces/ORM";
import MediaFile from "../models/MediaFile";
import Dish from "../models/Dish";
import { WorkTime } from "@webresto/worktime";
import { OptionalAll } from "../interfaces/toolsTS";
declare let attributes: {
    /**Id */
    id: string;
    /** ID in external system */
    rmsId: string;
    /** Addishinal info */
    additionalInfo: string;
    /** */
    code: string;
    description: string;
    /** Soft deletion */
    isDeleted: boolean;
    /** Dishes group name*/
    name: string;
    seoDescription: string;
    seoKeywords: string;
    seoText: string;
    seoTitle: string;
    /** Sorting weight */
    sortOrder: number;
    dishes: Dish[];
    parentGroup: any;
    childGroups: string[] | Group[];
    /** Icon */
    icon: {
        type: string;
        allowNull: boolean;
    };
    /** Images */
    images: MediaFile[];
    /** PlaySholder for group dishes */
    dishesPlaceholder: MediaFile[];
    /** The person readable isii*/
    slug: string;
    /** The concept to which the group belongs */
    concept: string;
    /** The group is displayed*/
    visible: boolean;
    /**A group of modifiers */
    modifier: boolean;
    /**  A sign that this is a promo group
     *  The promo group cannot be added from the user.
     */
    promo: boolean;
    /** Working hours */
    worktime: WorkTime[];
};
type attributes = typeof attributes;
interface Group extends OptionalAll<attributes>, ORM {
}
export default Group;
declare let Model: {
    beforeCreate(init: any, cb: (err?: string) => void): void;
    beforeUpdate: (record: any, cb: (err?: string) => void) => void;
    afterUpdate: (record: any, cb: (err?: string) => void) => void;
    afterCreate: (record: any, cb: (err?: string) => void) => void;
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
    getGroups(groupsId: string[]): Promise<{
        groups: GroupWithAdditionalFields[];
        errors: {};
    }>;
    /**
     * Returns a group with a given ID
     * @deprecated not used
     * @param groupId - ID groups
     * @return The requested group
     * @throws The error of obtaining a group
     * @fires group:core-group-get-groups - The result of execution in the format {Groups: {[Groupid]: Group}, Errors: {[Groupid]: error}}
     */
    getGroup(groupId: string): Promise<Group>;
    /**
     * Returns a group with a given Slug
     * @deprecated not used
     * @param groupSlug - Slug groups
     * @return The requested group
     * @throws The error of obtaining a group
     * @fires group:core-group-get-groups - The result of execution in the format {Groups: {[Groupid]: Group}, Errors: {[Groupid]: error}}
     */
    getGroupBySlug(groupSlug: string): Promise<Group>;
    /**
     * Menu for navbar
     * */
    getMenuGroups(concept: string, topLevelGroupId?: string): Promise<Group[]>;
    /**
     * Checks whether the group exists, if it does not exist, then creates a new one and returns it.
     * @param values
     * @return Updated or created group
     */
    createOrUpdate(values: Group): Promise<Group>;
};
/**
 * Describes a group of dishes at the time of obtaining its popularized version, additional fields are the error of the framework
 */
export interface GroupWithAdditionalFields extends Group {
    childGroups: Group[];
    dishesList: Dish[];
}
declare global {
    const Group: typeof Model & ORMModel<Group, null>;
}
