import { WorkTime } from "@webresto/worktime";

/**
 * Check additionalInfo. Return empty string if success or reject reason string
 * @param obj
 * @return string
 */
export default function (obj: AdditionalInfo): string {
  if (!obj) {
    return "";
  }

  try {
    if (obj.visible !== undefined && obj.visible === false) return "visible";

    if (obj.worktime) {
      if (!checkTime(obj.worktime)) {
        return "time";
      }
    }

    if (obj.promo && obj.promo === true) return "promo";

    if (obj.modifier && obj.modifier === true) return "modifier";

    return "";
  } catch (e) {
    return "";
  }
}

export interface AdditionalInfo {
  visible?: boolean;
  worktime?: WorkTime[];
  promo?: boolean;
  modifier?: boolean;
}

function checkTime(timeArray: WorkTime[]): boolean {
  return true;
}
