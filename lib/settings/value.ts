import type { SettingValue } from "../../models/Settings";

export function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const trueValues = ["yes", "YES", "Yes", "1", "true", "TRUE", "True"];
  const falseValues = ["no", "NO", "No", "0", "false", "FALSE", "False"];
  if (trueValues.includes(value)) {
    return true;
  }
  if (falseValues.includes(value)) {
    return false;
  }
  return false;
}

/** The strings a lost value turns into on its way through JSON and env mean no value. */
export function cleanValue(value: string | number | boolean | SettingValue[] | { [key: string]: any; }) {
  if (value === "undefined" || value === "NaN" || value === "null") {
    return undefined
  }

  return value
}
