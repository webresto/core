import type { PlaceCoordinate } from "../models/Place";
import { isValidCoordinate } from "./address/coordinate";

export function assertCoordinate(value: unknown): asserts value is PlaceCoordinate {
  if (!value || typeof value !== "object") {
    throw new Error("Place coordinate must be an object with lat and lon");
  }

  if (!isValidCoordinate(value)) {
    throw new Error("Place coordinate must contain a valid latitude and longitude");
  }
}
