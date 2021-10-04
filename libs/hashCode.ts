/**
 * Отдаёт хеш строки
 * @param str - строка для хеширования
 */
const crypto = require("crypto");

export default function hashCode(str: string): string {
  return crypto.createHash("sha256").update(str).digest("hex");
}
