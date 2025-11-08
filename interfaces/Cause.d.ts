import { WorkTime } from "@webresto/worktime";

/**
 * Describes possible conditions for Condition
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
 * Describes the distance condition in the condition
 */
export interface DirectDistance {
  center: number[];
  from: number;
  to: number;
}
