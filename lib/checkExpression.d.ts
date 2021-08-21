import { Time } from "../interfaces/Cause";
/**
 * Check additionalInfo. Return empty string if success or reject reason string
 * @param obj
 * @return string
 */
export default function (obj: AdditionalInfo): string;
export interface AdditionalInfo {
    visible: boolean;
    workTime: Time[];
    promo: boolean;
    modifier: boolean;
}
