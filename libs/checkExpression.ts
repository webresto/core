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
    if (obj.visible === false) return "visible";

    if (obj.workTime) {
      if (!checkTime(obj.workTime)) {
        return "time";
      }
    }

    if (obj.promo === true) return "promo";

    if (obj.modifier === true) return "modifier";

    return "";
  } catch (e) {
    return "";
  }
}

export interface AdditionalInfo {
  visible: boolean;
  workTime: WorkTime[];
  promo: boolean;
  modifier: boolean;
}

function checkTime(timeArray: WorkTime[]): boolean {
  return true;
}
