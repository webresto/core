import { QueryBuilder, WaterlinePromise, CRUDBuilder, Model, UpdateBuilder, Callback } from "waterline";
import { OptionalAll } from "../interfaces/toolsTS"


// type or<T> = {
//   "or"?: { [P in keyof T]?: T[P] }[]
// }

type or<T> = {
  or?: WhereCriteriaQuery<T>[]
}

type not<T> = {
  "!": T
  "!="?: T
}

type lessThan<F> = {
  "<": F
}

type lessThanOrEqual<F> = {
  "<=": F
}

type greaterThan<F> = {
  ">": F
}

type greaterThanOrEqual<F> = {
  ">=": F
}


type nin<F> = {
  nin: F[]
}

type _in<F> = {
  in: F[]
}


type contains = {
  contains: string
}


type startsWith = {
  startsWith: string
}


type endsWith = {
  endsWith: string
}

export type CriteriaQuery<T> = {
  where?: WhereCriteriaQuery<T> | or<T>
  limit?: number
  skip?: number
  sort?: string | {[key: string]: string} | {[key: string]: string}[]
} | WhereCriteriaQuery<T>

export type WhereCriteriaQuery<T> = {
  [P in keyof T]?: T[P] | T[P][] | not<T[P]> | lessThan<T[P]> | lessThanOrEqual<T[P]> | greaterThan<T[P]> | greaterThanOrEqual<T[P]> | _in<T[P]> | nin<T[P]> | contains | startsWith | endsWith | not<T[P][]> | lessThan<T[P][]> | lessThanOrEqual<T[P][]> | greaterThan<T[P][]> | greaterThanOrEqual<T[P][]> | or<T>;
}


/**
 * Waterline model
 */
export default interface ORMModel<T> {
  create?(params: T): CRUDBuilder<T>;
  create?(params: T[]): CRUDBuilder<T[]>;
  createEach?(params: T[]): CRUDBuilder<T[]>;

  find?(criteria?: CriteriaQuery<T>): QueryBuilder<T[]>;
  findOne?(criteria?: CriteriaQuery<T>): QueryBuilder<T>;

  // Direct findOne by primaryKey
  findOne?(criteria?: number): QueryBuilder<T>;
  findOne?(criteria?: string): QueryBuilder<T>;
  
  findOrCreate?(criteria?: CriteriaQuery<T>, values?: OptionalAll<T>): QueryBuilder<T>;

  update?(criteria: CriteriaQuery<T>, changes: OptionalAll<T>): UpdateBuilder<T[]>;
  update?(criteria: CriteriaQuery<T>, changes: OptionalAll<T>[]): UpdateBuilder<T[]>;
  updateOne?(criteria: CriteriaQuery<T>, changes: OptionalAll<T>[]): UpdateBuilder<T[]>;

  destroy?(criteria: CriteriaQuery<T>): CRUDBuilder<T[]>;
  destroy?(criteria: CriteriaQuery<T>[]): CRUDBuilder<T[]>;
  destroyOne?(criteria: CriteriaQuery<T>[]): CRUDBuilder<T[]>;

  count?(criteria?: CriteriaQuery<T>): WaterlinePromise<number>;
  count?(criteria: CriteriaQuery<T>[]): WaterlinePromise<number>;

  query(sqlQuery: string, cb: Callback<any>): void;
  query(sqlQuery: string, data: any, cb: Callback<any>): void;
  native(cb: (err: Error, collection: any) => void): void;

  stream?(criteria: any, writeEnd: any): NodeJS.WritableStream | Error;
}
