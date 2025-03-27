export type RequiredField<T, K extends keyof T> = T & { [P in K]-?: T[P] }
export type OptionalAll<T> = {
  [P in keyof T]?: T[P];
}

// Remove types from T that are assignable to U
export type Diff<T, U> = T extends U ? never : T;
// Remove types from T that are not assignable to U
export type Filter<T, U> = T extends U ? T : never;

/**
 * It uses to detect the collection in the model, this is a stupid thing, but I don't see anything better
 * In theory, you need to get all the Types that were sent to the generic ORM, 
 * and filter those that are in this model, if you know how to do this, open the issue
 */
export type NonPrimitiveKeys<T> = {
  [K in keyof T]: T[K] extends (string | number | boolean | symbol | null | undefined | Date) ? never : K;
}[keyof T];

export type TypeOrArray<T> = T extends any[] ? T[number] : T
