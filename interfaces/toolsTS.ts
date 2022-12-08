export type RequiredField<T, K extends keyof T> = T & { [P in K]-?: T[P] }
export type OptionalAll<T> = {
  [P in keyof T]?: T[P];
}

// Remove types from T that are assignable to U
export type Diff<T, U> = T extends U ? never : T;
// Remove types from T that are not assignable to U
export type Filter<T, U> = T extends U ? T : never;
