export declare type RequiredField<T, K extends keyof T> = T & {
    [P in K]-?: T[P];
};
export declare type OptionalAll<T> = {
    [P in keyof T]?: T[P];
};
export declare type Diff<T, U> = T extends U ? never : T;
export declare type Filter<T, U> = T extends U ? T : never;
