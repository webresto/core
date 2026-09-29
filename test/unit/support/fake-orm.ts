/**
 * An in-memory stand-in for the Waterline models core's code calls as globals.
 *
 * Only what the order, menu and stock code under test asks of the ORM: `find`,
 * `findOne`, `create`, `update`, `updateOne`, `destroy`, `count`, with
 * `populate`, `sort`, `limit` and `skip` on a query, and the criteria forms
 * that code writes — equality, a list or `in`, `nin`, `!=`, `contains`, `or`,
 * `and`, and `{ where, limit, sort }`.
 *
 * Records are copied in and out, as a database would: a caller that mutates what
 * it read has changed nothing until it writes it back.
 */

type Row = Record<string, any>;
type Criteria = Record<string, any>;

/** How an attribute of a table points at another table. */
export type Association =
  | { model: string }
  | { collection: string; via: string };

const clone = <T>(value: T): T => (value === undefined ? value : structuredClone(value));

function idOf(value: unknown): unknown {
  if (value && typeof value === "object" && "id" in (value as Row)) return (value as Row).id;
  return value;
}

function same(a: unknown, b: unknown): boolean {
  if (a === null || a === undefined || b === null || b === undefined) return a === b;
  return String(idOf(a)) === String(idOf(b));
}

function matchesValue(actual: unknown, expected: unknown): boolean {
  if (Array.isArray(expected)) return expected.some((option) => same(actual, option));
  if (expected && typeof expected === "object" && !(expected instanceof Date)) {
    const ops = expected as Row;
    if ("in" in ops) return (ops.in as unknown[]).some((option) => same(actual, option));
    if ("nin" in ops) return !(ops.nin as unknown[]).some((option) => same(actual, option));
    if ("!=" in ops) return !same(actual, ops["!="]);
    if ("contains" in ops) return typeof actual === "string" && actual.includes(String(ops.contains));
    if (">" in ops || "<" in ops || ">=" in ops || "<=" in ops) {
      const n = Number(actual);
      if (">" in ops && !(n > Number(ops[">"]))) return false;
      if ("<" in ops && !(n < Number(ops["<"]))) return false;
      if (">=" in ops && !(n >= Number(ops[">="]))) return false;
      if ("<=" in ops && !(n <= Number(ops["<="]))) return false;
      return true;
    }
    return same(actual, (ops as Row).id ?? ops);
  }
  if (typeof expected === "boolean" || typeof expected === "number") return actual === expected;
  return same(actual, expected);
}

export function matches(row: Row, criteria: Criteria | undefined): boolean {
  if (!criteria) return true;
  for (const [key, expected] of Object.entries(criteria)) {
    if (expected === undefined) continue;
    if (key === "or") {
      if (!(expected as Criteria[]).some((part) => matches(row, part))) return false;
      continue;
    }
    if (key === "and") {
      if (!(expected as Criteria[]).every((part) => matches(row, part))) return false;
      continue;
    }
    if (!matchesValue(row[key], expected)) return false;
  }
  return true;
}

/** `{ where, limit, sort }` or bare criteria. */
function splitCriteria(criteria: Criteria | string | undefined): { where: Criteria; limit?: number; sort?: string } {
  if (typeof criteria === "string") return { where: { id: criteria } };
  if (!criteria) return { where: {} };
  if ("where" in criteria) return { where: criteria.where ?? {}, limit: criteria.limit, sort: criteria.sort };
  const { limit, sort, ...where } = criteria;
  return { where, limit, sort };
}

function sortRows(rows: Row[], sort: string | undefined): Row[] {
  if (!sort) return rows;
  const [field, direction] = sort.trim().split(/\s+/);
  const sign = (direction ?? "ASC").toUpperCase() === "DESC" ? -1 : 1;
  return [...rows].sort((a, b) => (a[field] > b[field] ? sign : a[field] < b[field] ? -sign : 0));
}

export class FakeDatabase {
  readonly tables = new Map<string, FakeTable>();

  table(name: string, associations: Record<string, Association> = {}, numericIds = false): FakeTable {
    const table = new FakeTable(this, name, associations, numericIds);
    this.tables.set(name, table);
    return table;
  }

  get(name: string): FakeTable {
    const table = this.tables.get(name);
    if (!table) throw new Error(`fake ORM: no table "${name}"`);
    return table;
  }
}

class FakeQuery<T> implements PromiseLike<T> {
  private populates: Array<{ attribute: string; criteria?: Criteria }> = [];
  private sortBy?: string;
  private limitTo?: number;
  private skipBy = 0;

  constructor(
    private readonly table: FakeTable,
    private readonly criteria: Criteria | string | undefined,
    private readonly one: boolean,
  ) {}

  populate(attribute: string, criteria?: Criteria): this {
    this.populates.push({ attribute, criteria });
    return this;
  }

  sort(sort: string): this {
    this.sortBy = sort;
    return this;
  }

  limit(limit: number): this {
    this.limitTo = limit;
    return this;
  }

  skip(skip: number): this {
    this.skipBy = skip;
    return this;
  }

  private run(): T {
    const { where, limit, sort } = splitCriteria(this.criteria);
    let rows = this.table.rows.filter((row) => matches(row, where));
    rows = sortRows(rows, this.sortBy ?? sort);
    rows = rows.slice(this.skipBy);
    const max = this.limitTo ?? limit;
    if (typeof max === "number") rows = rows.slice(0, max);
    const out = rows.map((row) => this.table.populate(clone(row), this.populates));
    return (this.one ? out[0] : out) as T;
  }

  then<R1 = T, R2 = never>(
    onfulfilled?: ((value: T) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): Promise<R1 | R2> {
    return Promise.resolve()
      .then(() => this.run())
      .then(onfulfilled, onrejected);
  }
}

/** A write that may be awaited as it is or through `.fetch()`, as in Waterline. */
function fetchable<T>(run: () => T): PromiseLike<T> & { fetch(): Promise<T> } {
  const promise = Promise.resolve().then(run);
  return {
    then: (a, b) => promise.then(a, b),
    fetch: () => promise,
  };
}

let sequence = 0;

export class FakeTable {
  rows: Row[] = [];

  constructor(
    private readonly db: FakeDatabase,
    readonly name: string,
    readonly associations: Record<string, Association>,
    /** Waterline gives some models auto-increment ids, and code relies on it. */
    private readonly numericIds = false,
  ) {}

  private nextId(): string | number {
    return this.numericIds ? ++sequence : `${this.name}-${++sequence}`;
  }

  /** Stores an association as the id it points at, the way the database does. */
  private normalize(values: Row): Row {
    const out: Row = {};
    for (const [key, value] of Object.entries(values)) {
      const association = this.associations[key];
      if (association && "collection" in association) continue;
      out[key] = association && "model" in association ? idOf(value) ?? null : clone(value);
    }
    return out;
  }

  populate(row: Row, populates: Array<{ attribute: string; criteria?: Criteria }>): Row {
    for (const { attribute, criteria } of populates) {
      const association = this.associations[attribute];
      if (!association) continue;
      if ("model" in association) {
        const target = this.db.get(association.model);
        const found = target.rows.find((candidate) => same(candidate.id, row[attribute]));
        row[attribute] = found ? clone(found) : row[attribute] ?? null;
      } else {
        const target = this.db.get(association.collection);
        const { where } = splitCriteria(criteria);
        row[attribute] = target.rows
          .filter((candidate) => same(candidate[association.via], row.id) && matches(candidate, where))
          .map((candidate) => clone(candidate));
      }
    }
    return row;
  }

  seed(rows: Row[]): void {
    for (const row of rows) this.rows.push({ id: this.nextId(), ...this.normalize(row) });
  }

  find(criteria?: Criteria | string): FakeQuery<Row[]> {
    return new FakeQuery<Row[]>(this, criteria, false);
  }

  findOne(criteria?: Criteria | string): FakeQuery<Row | undefined> {
    return new FakeQuery<Row | undefined>(this, criteria, true);
  }

  count(criteria?: Criteria): Promise<number> {
    const { where } = splitCriteria(criteria);
    return Promise.resolve(this.rows.filter((row) => matches(row, where)).length);
  }

  create(values: Row) {
    return fetchable(() => {
      const row: Row = { id: this.nextId(), ...this.normalize(values) };
      if (values.id) row.id = values.id;
      this.rows.push(row);
      return clone(row);
    });
  }

  update(criteria: Criteria | string, values: Row) {
    return fetchable(() => {
      const { where } = splitCriteria(criteria);
      const normalized = this.normalize(values);
      delete normalized.id;
      const updated: Row[] = [];
      for (const row of this.rows) {
        if (!matches(row, where)) continue;
        Object.assign(row, clone(normalized));
        updated.push(clone(row));
      }
      return updated;
    });
  }

  updateOne(criteria: Criteria | string, values: Row): Promise<Row | undefined> {
    return Promise.resolve(this.update(criteria, values)).then((rows) => rows[0]);
  }

  destroy(criteria: Criteria | string) {
    return fetchable(() => {
      const { where } = splitCriteria(criteria);
      const gone = this.rows.filter((row) => matches(row, where));
      this.rows = this.rows.filter((row) => !matches(row, where));
      return gone.map(clone);
    });
  }
}
