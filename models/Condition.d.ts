import Cart from "../models/Cart";
import Cause from "../modelsHelp/Cause";
import ORMModel from "../modelsHelp/ORMModel";
import ORM from "../modelsHelp/ORM";
import { ActionParams } from "../modelsHelp/Actions";
import Zone from "@webresto/native-check/models/Zone";
export default interface Condition extends ORM {
    name: string;
    description: string;
    enable: boolean;
    weight: number;
    causes: Cause;
    actions: any;
    zones: Zone[];
    needy: boolean;
    check(cart: Cart): Promise<boolean>;
    exec(cart: Cart): Promise<Cart>;
    hasReturn(): boolean;
}
export interface ConditionModel extends ORMModel<Condition> {
    action(actionName: string, params: ActionParams): Promise<any>;
    checkConditionsExists(cart: Cart): Promise<boolean>;
    getConditions(street: string, home: number): Promise<Condition[]>;
}
declare global {
    const Condition: ConditionModel;
}
