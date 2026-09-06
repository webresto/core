type BaseObject = {
  [key: string]: BaseObject | string | boolean | number | number[] | string [];
}

export type CustomData = {
  [key: string]: BaseObject | null
}

export function isCustomData(value: { [x: string]: BaseObject; }) {
  return typeof value === "object" && !Array.isArray(value) && value !== null;
}