/**
 * Returns the hash of a string
 * @param str - string to hash
 */
const crypto = require("crypto");

export default function hashCode(str: string): string {
  return crypto.createHash("sha256").update(str).digest("hex");
}
