/// <reference types="node" />
import { QueryBuilder, WaterlinePromise } from "waterline";
export default interface ORMModel<T> {
    create(params: any): WaterlinePromise<T>;
    create(params: any[]): WaterlinePromise<T[]>;
    find(criteria?: any): QueryBuilder<T[]>;
    findOne(criteria?: any): QueryBuilder<T>;
    findOrCreate(criteria?: any, values?: any): QueryBuilder<T>;
    update(criteria: any, changes: any): WaterlinePromise<T[]>;
    update(criteria: any, changes: any[]): WaterlinePromise<T[]>;
    destroy(criteria: any): WaterlinePromise<T[]>;
    destroy(criteria: any[]): WaterlinePromise<T[]>;
    count(criteria?: any): WaterlinePromise<number>;
    count(criteria: any[]): WaterlinePromise<number>;
    stream(criteria: any, writeEnd: any): NodeJS.WritableStream | Error;
}
