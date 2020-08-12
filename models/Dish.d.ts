import Modifier from "../modelsHelp/Modifier";
import Group from "./Group";
import { AdditionalInfo } from "../lib/checkExpression";
import Image from "./Image";
import ORMModel from "../modelsHelp/ORMModel";
import ORM from "../modelsHelp/ORM";
export default interface Dish extends ORM, AdditionalInfo {
    id: string;
    additionalInfo: string;
    balance: number;
    modifiers: Modifier[];
    parentGroup: Group;
    weight: number;
    price: number;
    order: number;
    images: Association<Image>;
    name: string;
    composition: string;
    hash: number;
    rmsId: string;
    code: string;
    tags: {
        name: string;
    }[];
    isDeleted: boolean;
}
export interface DishModel extends ORMModel<Dish> {
    getDishes(criteria: any): Promise<Dish[]>;
    getDishModifiers(dish: Dish): any;
    createOrUpdate(values: Dish): Promise<Dish>;
}
declare global {
    const Dish: DishModel;
}
