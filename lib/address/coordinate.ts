import OrderAddress from "../../interfaces/OrderAddress";
import { AddressPoint } from "../../interfaces/Geo";

export function isValidCoordinate(value: unknown): value is AddressPoint {
  if (!value || typeof value !== "object") return false;
  const coordinate = value as Partial<AddressPoint>;
  return (
    typeof coordinate.lat === "number" &&
    Number.isFinite(coordinate.lat) &&
    coordinate.lat >= -90 &&
    coordinate.lat <= 90 &&
    typeof coordinate.lon === "number" &&
    Number.isFinite(coordinate.lon) &&
    coordinate.lon >= -180 &&
    coordinate.lon <= 180
  );
}

/** The coordinate the client sent with the address, when it is a usable one. */
export function coordinateFromAddress(address: OrderAddress | null | undefined): AddressPoint | null {
  const coordinate = address?.coordinate;
  return isValidCoordinate(coordinate) ? coordinate : null;
}
