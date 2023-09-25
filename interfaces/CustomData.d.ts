type BaseObject = {
    [key: string]: BaseObject | string | boolean | number | number[] | string[];
};
export type CustomData = {
    [key: string]: BaseObject | null;
};
export declare function isCustomData(value: any): boolean;
export {};
