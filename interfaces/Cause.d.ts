import { WorkTime } from "@webresto/worktime";

/**
 * Описывает возможные условия для Condition
 */
export default interface Cause {
  worktime: WorkTime[];
  cartAmount: {
    valueFrom: number;
    valueTo: number;
  };
  dishes: string[];
  groups: string[];
  directDistance: DirectDistance;
}

/**
 * Описывает условие расстояния в условии
 */
export interface DirectDistance {
  center: number[];
  from: number;
  to: number;
}
