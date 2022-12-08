/// <reference types="node" />
import { QueryBuilder, WaterlinePromise, CRUDBuilder, UpdateBuilder, Callback } from "waterline";
import { OptionalAll } from "../interfaces/toolsTS";
declare type not<F> = {
    "!": F;
    "!="?: F;
};
declare type lessThan<F> = {
    "<": F;
};
declare type lessThanOrEqual<F> = {
    "<=": F;
};
declare type greaterThan<F> = {
    ">": F;
};
declare type greaterThanOrEqual<F> = {
    ">=": F;
};
declare type nin<F> = {
    nin: F[];
};
declare type _in<F> = {
    in: F[];
};
declare type contains = {
    contains: string;
};
declare type startsWith = {
    startsWith: string;
};
declare type endsWith = {
    endsWith: string;
};
export declare type CriteriaQuery<F> = {
    where?: WhereCriteriaQuery<F>;
    limit?: number;
    skip?: number;
    sort?: string | {
        [key: string]: string;
    } | {
        [key: string]: string;
    }[];
} | WhereCriteriaQuery<F>;
export declare type WhereCriteriaQuery<T> = {
    [P in keyof T]?: T[P] | T[P][] | not<T[P]> | lessThan<T[P]> | lessThanOrEqual<T[P]> | greaterThan<T[P]> | greaterThanOrEqual<T[P]> | _in<T[P]> | nin<T[P]> | contains | startsWith | endsWith | not<T[P][]> | lessThan<T[P][]> | lessThanOrEqual<T[P][]> | greaterThan<T[P][]> | greaterThanOrEqual<T[P][]>;
};
/**
 * Waterline model
 */
export default interface ORMModel<T> {
    create?(params: T): CRUDBuilder<T>;
    create?(params: T[]): CRUDBuilder<T[]>;
    createEach?(params: T[]): CRUDBuilder<T[]>;
    find?(criteria?: CriteriaQuery<T>): QueryBuilder<T[]>;
    findOne?(criteria?: CriteriaQuery<T>): QueryBuilder<T>;
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
export {};
