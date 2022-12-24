/// <reference types="node" />
import { QueryBuilder, WaterlinePromise, CRUDBuilder, UpdateBuilder, Callback } from "waterline";
import { OptionalAll, RequiredField } from "../interfaces/toolsTS";
declare type or<T> = {
    or?: WhereCriteriaQuery<T>[];
};
declare type not<T> = {
    "!": T;
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
export declare type CriteriaQuery<T> = {
    where?: WhereCriteriaQuery<T> | or<T>;
    limit?: number;
    skip?: number;
    sort?: string | {
        [key: string]: string;
    } | {
        [key: string]: string;
    }[];
} | WhereCriteriaQuery<T>;
export declare type WhereCriteriaQuery<T> = {
    [P in keyof T]?: T[P] | T[P][] | not<T[P]> | lessThan<T[P]> | lessThanOrEqual<T[P]> | greaterThan<T[P]> | greaterThanOrEqual<T[P]> | _in<T[P]> | nin<T[P]> | contains | startsWith | endsWith | not<T[P][]> | lessThan<T[P][]> | lessThanOrEqual<T[P][]> | greaterThan<T[P][]> | greaterThanOrEqual<T[P][]> | or<T>;
};
/**
 * Waterline model
 * @template M Model object
 * @template C Fields required for create new instance
 */
export default interface ORMModel<M, C extends keyof M> {
    create?(params: RequiredField<OptionalAll<M>, C>): CRUDBuilder<M>;
    create?(params: RequiredField<OptionalAll<M>, C>[]): CRUDBuilder<M[]>;
    createEach?(params: M[]): CRUDBuilder<M[]>;
    find?(criteria?: CriteriaQuery<M>): QueryBuilder<M[]>;
    findOne?(criteria?: CriteriaQuery<M>): QueryBuilder<M>;
    findOne?(criteria?: number): QueryBuilder<M>;
    findOne?(criteria?: string): QueryBuilder<M>;
    findOrCreate?(criteria?: CriteriaQuery<M>, values?: OptionalAll<M>): QueryBuilder<M>;
    update?(criteria: CriteriaQuery<M>, changes: OptionalAll<M>): UpdateBuilder<M[]>;
    update?(criteria: CriteriaQuery<M>, changes: OptionalAll<M>[]): UpdateBuilder<M[]>;
    updateOne?(criteria: CriteriaQuery<M>, changes: OptionalAll<M>[]): UpdateBuilder<M[]>;
    destroy?(criteria: CriteriaQuery<M>): CRUDBuilder<M[]>;
    destroy?(criteria: CriteriaQuery<M>[]): CRUDBuilder<M[]>;
    destroyOne?(criteria: CriteriaQuery<M>[]): CRUDBuilder<M[]>;
    count?(criteria?: CriteriaQuery<M>): WaterlinePromise<number>;
    count?(criteria: CriteriaQuery<M>[]): WaterlinePromise<number>;
    query(sqlQuery: string, cb: Callback<any>): void;
    query(sqlQuery: string, data: any, cb: Callback<any>): void;
    native(cb: (err: Error, collection: any) => void): void;
    stream?(criteria: any, writeEnd: any): NodeJS.WritableStream | Error;
}
export {};
