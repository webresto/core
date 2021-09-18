import Group from "../models/Group";
import Dish from "../models/Dish";


interface BaseModifier {
  modifierId: string;
  amount?: number;
  dish?: Dish;
  maxAmount?: number;
  minAmount?: number;
  defaultAmount?: number;
  freeAmount?: number
}

export interface Modifier extends BaseModifier {
  id: string;
}


export interface GroupModifier extends BaseModifier {
  id?: string;   // id не обязательный для поддержки вирутальных групп
  childModifiers: Modifier[];
  group?: Group | any; 
  groupId?: string;
  isSingleModifierGroupWrapper?: boolean;
}