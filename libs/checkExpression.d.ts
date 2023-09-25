/**
 * // TODO: Abandoned because we gone to global chages from Dish to Item
 */
import { WorkTime } from "@webresto/worktime";
/**
 * Check additionalInfo. Return empty string if success or reject reason string
 * @param obj
 * @return string
 */
export default function (obj: AdditionalInfo): string;
export interface AdditionalInfo {
    visible?: boolean;
    worktime?: WorkTime[];
    promo?: boolean;
    modifier?: boolean;
}
