import { CriteriaQuery, ORMModel } from "../interfaces/ORMModel";
import ORM from "../interfaces/ORM";
import { MediaFileRecord } from "./MediaFile";
import { WorkTime } from "@webresto/worktime";
import { OptionalAll } from "../interfaces/toolsTS";
import { DishRecord } from "./Dish";
export type GetGroupType = {
    [x: string]: GroupWithAdditionalFields;
};
declare let attributes: {
    /**Id */
    id: string;
    /** ID in external system */
    rmsId: string;
    /** Additional info */
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
    dishes: DishRecord[];
    parentGroup: GroupRecord | string;
    childGroups: GroupRecord[] | string[];
    recommendations: GroupRecord[] | string[];
    recommendedBy: GroupRecord[] | string[];
    recommendedDishes: DishRecord[];
    /** Icon */
    icon: {
        type: string;
        allowNull: boolean;
    };
    /** Images */
    images: MediaFileRecord[] | string[];
    /** Placeholder for group dishes */
    dishesPlaceholder: MediaFileRecord;
    /** The human easy readable*/
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
    customData: {
        [key: string]: string | boolean | number;
    } | string;
};
interface IVirtualFields {
    discountAmount?: number;
    discountType?: "flat" | "percentage";
}
type attributes = typeof attributes;
export interface GroupRecord extends OptionalAll<attributes>, IVirtualFields, ORM {
}
declare let Model: {
    beforeCreate: (init: GroupRecord, cb: (err?: string) => void) => any;
    beforeUpdate: (record: GroupRecord, cb: (err?: string) => void) => void;
    afterUpdate: (record: GroupRecord, cb: (err?: string) => void) => void;
    afterCreate: (record: GroupRecord, cb: (err?: string) => void) => void;
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
    getGroups(groupsId: string[]): Promise<{
        groups: GroupWithAdditionalFields[];
        errors: Record<string, string>;
    }>;
    /**
     * Returns a group with a given ID
     * @deprecated not used
     * @param groupId - ID groups
     * @return The requested group
     * @throws The error of obtaining a group
     * @fires group:core:group-get-groups - The result of execution in the format {Groups: {[Groupid]: GroupRecord}, Errors: {[Groupid]: error}}
     */
    getGroup(groupId: string): Promise<GroupRecord>;
    /**
     * Returns a group with a given Slug
     * @deprecated not used
     * @param groupSlug - Slug groups
     * @return The requested group
     * @throws The error of obtaining a group
     * @fires group:core:group-get-groups - The result of execution in the format {Groups: {[Groupid]: GroupRecord}, Errors: {[Groupid]: error}}
     */
    getGroupBySlug(groupSlug: string): Promise<GroupRecord>;
    display(criteria: CriteriaQuery<GroupRecord>): Promise<GroupRecord[]>;
    getMenuTree(menu?: GroupRecord[], option?: "only_ids" | "tree" | "flat_tree"): Promise<string[]>;
    /**
     * Menu for navbar
     * */
    getMenuGroups(concept?: string, topLevelGroupId?: string): Promise<GroupRecord[]>;
    /**
     * Static method for obtaining recommended dishes by group.
     * @param {string[]} ids - An array of group IDs.
     * @param {number} [limit=15] - Optional number of dishes to be returned.
     * @param {boolean} [includeReverse=false] - Include reverse recommendations.
     * @returns {Promise<object[]>} - An array of recommended dishes.
     */
    getRecommendedDishes(ids: string[], limit?: number, includeReverse?: boolean): Promise<DishRecord[]>;
    /**
     * Checks whether the group exists, if it does not exist, then creates a new one and returns it.
     * @param values
     * @return Updated or created group
     */
    createOrUpdate(values: GroupRecord): Promise<GroupRecord>;
};
/**
 * Describes a group of dishes at the time of obtaining its popularized version, additional fields are the error of the framework
 */
export interface GroupWithAdditionalFields extends GroupRecord {
    childGroups: GroupRecord[];
    dishesList: DishRecord[];
}
declare global {
    const Group: typeof Model & ORMModel<GroupRecord, null>;
}
export {};
