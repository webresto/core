type BaseObject = {
    [key: string]: BaseObject | string | boolean | number;
};
export type CustomData = {
    [key: string]: BaseObject | null;
};
export {};
