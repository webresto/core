/**
 * Returns the hash of a string
 * @param str - string to hash
 */
const crypto = require("crypto");
import { v4 as uuid } from "uuid";

export default function hashCode(str: string): string {
  return crypto.createHash("sha256").update(str).digest("hex");
}

export function generateRandomString(length: number): string {
  const bytes = crypto.randomBytes(Math.ceil(length / 2));
  return bytes.toString('hex').slice(0, length);
}

export function generateUUID(): string {
  return uuid();
}
