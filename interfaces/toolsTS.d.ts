export declare type RequiredField<T, K extends keyof T> = T & {
    [P in K]-?: T[P];
};
export declare type OptionalAll<T> = {
    [P in keyof T]?: T[P];
};
export declare type Diff<T, U> = T extends U ? never : T;
export declare type Filter<T, U> = T extends U ? T : never;
/**
 * It uses to detect the collection in the model, this is a stupid thing, but I don't see anything better
 * In theory, you need to get all the Types that were sent to the generic ORM,
 * and filter those that are in this model, if you know how to do this, open the issue
 */
export declare type NonPrimitiveKeys<T> = {
    [K in keyof T]: T[K] extends (string | number | boolean | symbol | null | undefined | Date) ? never : K;
}[keyof T];
export declare type TypeOrArray<T> = T extends any[] ? T[number] : T;
