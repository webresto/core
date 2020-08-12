import { AdditionalInfo } from "../lib/checkExpression";
import ORMModel from "../modelsHelp/ORMModel";
import ORM from "../modelsHelp/ORM";
import Image from "../models/Image";
import Dish from "../models/Dish";
export interface GroupWithAdditionalFields extends Group {
    children: Group[];
    dishesList: Dish[];
}
export default interface Group extends ORM, AdditionalInfo {
    id: string;
    additionalInfo: string;
    childGroups: Group[];
    parentGroup: Group;
    name: string;
    tags: {
        name: string;
    }[];
    images: Association<Image>;
    isDeleted: boolean;
    code: number;
    description: string;
    seoDescription: string;
    seoKeywords: string;
    seoText: string;
    seoTitle: string;
    isIncludedInMenu: boolean;
    order: number;
    dishesTags: {
        name: string;
    }[];
    dishes: Dish[];
    slug: string;
}
export interface GroupModel extends ORMModel<Group> {
    getGroups(groupsId: string[]): Promise<{
        groups: {};
        errors: {};
    }>;
    getGroup(groupId: string): Promise<Group>;
    getGroupBySlug(groupSlug: string): Promise<Group>;
    createOrUpdate(values: Group): Promise<Group>;
}
declare global {
    const Group: GroupModel;
}
