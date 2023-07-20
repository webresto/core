import Group from "../models/Group";
import Dish from "../models/Dish";

interface BaseModifier {
  modifierId: string;
  amount?: number;
  dish?: Dish | string;
  maxAmount?: number;
  minAmount?: number;
  defaultAmount?: number;
  freeAmount?: number;
  required: boolean | null;
  freeOfChargeAmount?: number | null;
}

export interface OrderModifier {
  id: string
  amount?: number
  dish?: Dish  // TODO:  refactor to delete it from OrderModifier
  modifierId?: string // TODO:  refactor to delete it from OrderModifier
}

export interface Modifier extends BaseModifier {
  id: string;
}

export interface GroupModifier extends BaseModifier {
  id?: string; // id не обязательный для поддержки вирутальных групп
  childModifiers: Modifier[];
  group?: Group | string;
  groupId?: string;
  isSingleModifierGroupWrapper?: boolean;
}



