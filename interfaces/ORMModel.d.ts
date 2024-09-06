/// <reference types="node" />
import { RequiredField, NonPrimitiveKeys, TypeOrArray } from "../interfaces/toolsTS";
import { WaterlinePromise, CRUDBuilder, UpdateBuilder, LifecycleCallbacks } from "waterline";
export type Callback<T> = (err: Error | null, result: T) => void;
export type DataStore = {
    manager: any;
    config: any;
    driver: any;
    schema: any;
};
type or<T> = {
    or?: WhereCriteriaQuery<T>[];
};
type notEqual<T> = {
    '!=': T;
};
type not<T> = {
    "!=": T;
};
type _not<T> = {
    "not": T;
};
type lessThan<T> = {
    "<": T;
};
type lessThanOrEqual<T> = {
    "<=": T;
};
type greaterThan<T> = {
    ">": T;
};
type greaterThanOrEqual<T> = {
    ">=": T;
};
type nin<T> = {
    nin: T[];
};
type _in<T> = {
    in: T[];
};
type contains = {
    contains: string;
};
type startsWith = {
    startsWith: string;
};
type endsWith = {
    endsWith: string;
};
type SortDirection = 'asc' | 'desc';
type SortCriteria<T> = {
    [P in keyof T]?: SortDirection;
};
export type CriteriaQuery<T> = {
    where?: WhereCriteriaQuery<T> | or<T>;
    limit?: number;
    skip?: number;
    sort?: string | SortCriteria<T> | SortCriteria<T>[];
} | WhereCriteriaQuery<T>;
export type WhereCriteriaQuery<T> = {
    [P in keyof T]?: T[P] | T[P][] | not<T[P]> | not<T[P][]> | _not<T[P]> | _not<T[P][]> | lessThan<T[P]> | lessThan<T[P][]> | lessThanOrEqual<T[P]> | lessThanOrEqual<T[P][]> | greaterThanOrEqual<T[P]> | greaterThanOrEqual<T[P][]> | greaterThan<T[P]> | greaterThan<T[P][]> | notEqual<T[P]> | notEqual<T[P]>[] | _in<T[P]> | nin<T[P]> | contains | startsWith | endsWith | not<T[P][]> | or<T>;
};
type collectionMember = {
    members(childIds: string[]): Promise<void>;
};
type UpdateSetBuilder<T> = {
    set: (changes: Partial<T>) => WaterlinePromise<T[]>;
};
type QueryBuilder<T> = WaterlinePromise<T> & {
    where(condition: any): QueryBuilder<T>;
    limit(lim: number): QueryBuilder<T>;
    skip(num: number): QueryBuilder<T>;
    sort(criteria: string | {
        [attribute: string]: string;
    } | {
        [attribute: string]: string;
    }[]): QueryBuilder<T>;
    paginate(pagination?: {
        page: number;
        limit: number;
    }): QueryBuilder<T>;
    populate(association: NonPrimitiveKeys<TypeOrArray<T>>): QueryBuilder<T>;
    populate(association: NonPrimitiveKeys<TypeOrArray<T>>, filter: any): QueryBuilder<T>;
    groupBy(attrOrExpr: string): QueryBuilder<T>;
    max(attribute: string): QueryBuilder<T>;
    min(attribute: string): QueryBuilder<T>;
    sum(attribute: string): QueryBuilder<T>;
    average(attribute: string): QueryBuilder<T>;
    meta(options: any): QueryBuilder<T>;
};
/**
 * Waterline model
 * @template M Model object
 * @template C Fields required for create new instance
 */
/**
 * Waterline model
 * @template M Model object
 * @template C Fields required for create new instance
 */
export interface ORMModel<M, C extends keyof M> {
    create?(params: RequiredField<Partial<M>, C>): CRUDBuilder<M>;
    create?(params: RequiredField<Partial<M>, C>[]): CRUDBuilder<M[]>;
    createEach?(params: M[]): CRUDBuilder<M[]>;
    find?(criteria?: CriteriaQuery<M>): QueryBuilder<M[]>;
    findOne?(criteria?: CriteriaQuery<M>): QueryBuilder<M>;
    findOne?(criteria?: number): QueryBuilder<M>;
    findOne?(criteria?: string): QueryBuilder<M>;
    findOrCreate?(criteria?: CriteriaQuery<M>, values?: Partial<M>): QueryBuilder<M>;
    update?(criteria: CriteriaQuery<M>, changes: Partial<M>): UpdateBuilder<M[]>;
    updateOne?(criteria: CriteriaQuery<M>, changes: Partial<M>): UpdateBuilder<M>;
    update?(criteria: CriteriaQuery<M>): UpdateSetBuilder<M>;
    updateOne?(criteria: CriteriaQuery<M>): UpdateSetBuilder<M>;
    destroy?(criteria: CriteriaQuery<M>): CRUDBuilder<M[]>;
    destroy?(criteria: CriteriaQuery<M>[]): CRUDBuilder<M[]>;
    destroyOne?(criteria: CriteriaQuery<M>[]): CRUDBuilder<M[]>;
    count?(criteria?: CriteriaQuery<M>): WaterlinePromise<number>;
    count?(criteria: CriteriaQuery<M>[]): WaterlinePromise<number>;
    query?(sqlQuery: string, cb: Callback<any>): void;
    query?(sqlQuery: string, data: any, cb: Callback<any>): void;
    native?(cb: (err: Error, collection: any) => void): void;
    stream?(criteria: any, writeEnd: any): NodeJS.WritableStream | Error;
    addToCollection?(parentId: string | number | string[] | number[], association: NonPrimitiveKeys<M>, childIds: string[]): Promise<void>;
    addToCollection?(parentId: string | number | string[] | number[], association: NonPrimitiveKeys<M>, childIds: number[]): Promise<void>;
    addToCollection?(parentId: string | number | string[] | number[], association: NonPrimitiveKeys<M>): collectionMember;
    removeFromCollection?(parentId: string | number | string[] | number[], association: NonPrimitiveKeys<M>, childIds: string[]): Promise<void>;
    removeFromCollection?(parentId: string | number | string[] | number[], association: NonPrimitiveKeys<M>, childIds: number[]): Promise<void>;
    removeFromCollection?(parentId: string | number | string[] | number[], association: NonPrimitiveKeys<M>): collectionMember;
    replaceCollection?(parentId: string | number | string[] | number[], association: NonPrimitiveKeys<M>, childIds: string[]): Promise<void>;
    replaceCollection?(parentId: string | number | string[] | number[], association: NonPrimitiveKeys<M>, childIds: number[]): Promise<void>;
    replaceCollection?(parentId: string | number | string[] | number[], association: NonPrimitiveKeys<M>): collectionMember;
    createEach?(params: Array<Partial<M>>): WaterlinePromise<M[]>;
    getDatastore?(): WaterlinePromise<DataStore>;
    sum?(attribute: keyof M): WaterlinePromise<number | null>;
    validate?(params: Partial<M>): WaterlinePromise<void>;
    query?(sqlQuery: string, cb: Callback<any>): void;
    query?(sqlQuery: string, data: any, cb: Callback<any>): void;
    archive?(criteria: CriteriaQuery<M>): WaterlinePromise<M[]>;
    archived?(): WaterlinePromise<M[]>;
    lease?(leaseCriteria: any): WaterlinePromise<M>;
}
export type ModelMethods = LifecycleCallbacks & {
    [key: string]: Function;
};
export {};
