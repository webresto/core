/// <reference types="node" />
import { WaterlinePromise, CRUDBuilder, UpdateBuilder, Callback } from "waterline";
import { OptionalAll, RequiredField, NonPrimitiveKeys, TypeOrArray } from "../interfaces/toolsTS";
type or<T> = {
    or?: WhereCriteriaQuery<T>[];
};
type not<T> = {
    "!=": T;
};
type lessThan<F> = {
    "<": F;
};
type lessThanOrEqual<F> = {
    "<=": F;
};
type greaterThan<F> = {
    ">": F;
};
type greaterThanOrEqual<F> = {
    ">=": F;
};
type nin<F> = {
    nin: F[];
};
type _in<F> = {
    in: F[];
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
export type CriteriaQuery<T> = {
    where?: WhereCriteriaQuery<T> | or<T>;
    limit?: number;
    skip?: number;
    sort?: string | {
        [key: string]: string;
    } | {
        [key: string]: string;
    }[];
} | WhereCriteriaQuery<T>;
export type WhereCriteriaQuery<T> = {
    [P in keyof T]?: T[P] | T[P][] | not<T[P]> | lessThan<T[P]> | lessThanOrEqual<T[P]> | greaterThan<T[P]> | greaterThanOrEqual<T[P]> | _in<T[P]> | nin<T[P]> | contains | startsWith | endsWith | not<T[P][]> | lessThan<T[P][]> | lessThanOrEqual<T[P][]> | greaterThan<T[P][]> | greaterThanOrEqual<T[P][]> | or<T>;
};
type collectionMember = {
    members(childIds: string[]): Promise<void>;
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
    updateOne?(criteria: CriteriaQuery<M>, changes: OptionalAll<M>): UpdateBuilder<M>;
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
}
export {};
