#!/usr/bin/env node
/**
 * One-off extractor: turns the current sails-disk development catalog into the
 * seed fixture committed at `libs/adminpanel/fixtures/dev-catalog.json`.
 *
 * sails-disk stores NeDB append-only logs: one JSON object per line, later
 * lines superseding earlier ones for the same `_id`, `$$deleted` marking a
 * removal and `$$indexCreated` carrying index metadata rather than a record.
 * Reading such a file as "one record per line" yields duplicates and tombstones,
 * so the log is collapsed by `_id` first.
 *
 * Usage: node scripts/dump-dev-catalog.js [path/to/localDiskDb]
 */
const fs = require("fs");
const path = require("path");

const DB_DIR = process.argv[2] || path.join(__dirname, "..", "..", "..", ".tmp", "localDiskDb");
const OUT = path.join(__dirname, "..", "libs", "adminpanel", "fixtures", "dev-catalog.json");

/** Ids the demo seed creates itself; keeping them here would duplicate them. */
const SKIP_IDS = new Set(["demo-stock-group"]);
const SKIP_PREFIX = "demo-product-";

function readCollection(name) {
  const file = path.join(DB_DIR, `${name}.db`);
  if (!fs.existsSync(file)) throw new Error(`No such collection: ${file}`);

  const byId = new Map();
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (!line.trim()) continue;
    let row;
    try {
      row = JSON.parse(line);
    } catch {
      continue;
    }
    if (row.$$indexCreated || row.$$indexRemoved) continue;
    if (row.$$deleted) {
      byId.delete(row._id);
      continue;
    }
    byId.set(row._id, row);
  }
  return [...byId.values()];
}

/** Drops runtime noise: NeDB's own key, timestamps and the removed stock column. */
function clean(row) {
  const { _id, createdAt, updatedAt, balance, ...rest } = row;
  return Object.fromEntries(Object.entries(rest).filter(([, value]) => value !== null));
}

const groups = readCollection("group")
  .filter((row) => !SKIP_IDS.has(row.id))
  .map(clean);
const dishes = readCollection("dish")
  .filter((row) => !String(row.id).startsWith(SKIP_PREFIX))
  .filter((row) => !SKIP_IDS.has(row.parentGroup))
  // A dish without a group never reaches the menu and the RMS sync marks it deleted.
  .filter((row) => Boolean(row.parentGroup))
  .map(clean);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ groups, dishes }, null, 2) + "\n");
console.log(`Wrote ${groups.length} groups and ${dishes.length} dishes to ${OUT}`);
