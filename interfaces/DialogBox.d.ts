import Dish from "../models/Dish";
export type DialogBoxConfig = DialogBoxButton | DialogBoxProduct;
interface DialogBoxBase {
    askId?: string;
    /**
     * Allowed to close dialog box
     * If the dialogue closes, then there is no need to respond to it. You're just allowed to close it and that's it
     * by deafult: should be `true`
     */
    allowClosing?: boolean;
    /**
     * type of interactive dialogue
     * by default `routine`
     */
    type?: 
    /**
     * Informational, regular dialog boxes
     */
    "routine" | 
    /**
     * Critical Events
     */
    "critical";
    message: string;
    title: string;
    optionsType: "button" | "product";
    /**
     * Event icon
     */
    icon?: string;
    /**
     * If passed;
     * After this moment the dialogue will fade away
     * It is recommended to close it automaticaly
     */
    timeout?: number;
    /**
     * If no response comes, the backend will do it automatically
     * Also the frontend can send this by default
     * In conjunction with timeout, this could be a countdown on a button
     */
    defaultOptionId?: string;
}
export interface DialogBoxButton extends DialogBoxBase {
    options: DialogOptionButton[];
    optionsType: "button";
}
export interface DialogBoxProduct extends DialogBoxBase {
    options: DialogOptionProduct[];
    optionsType: "product";
}
interface DialogOptionBase {
    id: string;
    label: string;
}
interface DialogOptionProduct extends DialogOptionBase {
    product: Dish;
}
interface DialogOptionButton extends DialogOptionBase {
    /**
     * By default:
     * * 1st - primary, 2st - secondary, 3 - link, 4 - abort
     * * 1st - primary, 2st - secondary, 3 - abort
     * * 1st - primary, 2st - secondary
     * * 1st - primary
     */
    button?: {
        type: "primary" | "secondary" | "link" | "abort";
    };
}
export {};
