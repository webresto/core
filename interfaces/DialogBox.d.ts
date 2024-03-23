import Dish from "../models/Dish";
export type DialogBoxConfig = DialogBoxButton | DialogBoxProduct
interface DialogBoxBase {
  /**
   * Allowed to close dialog box
   * 
   * by deafult: should be `true`
   */
  allowClosing?: boolean

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
    "critical"


  message: string;
  title: string;
  options: OptionType
  /**
   * Event icon
   */
  icon?: string;
}

export interface DialogBoxButton extends DialogBoxBase {
  options: DialogOptionButton[];
  optionsType: "button";
}

export interface DialogBoxProduct extends DialogBoxBase {
  options: DialogOptionProduct[];
  optionsType: "product";
}

type OptionType = "button" | "product"

interface DialogOptionBase {
  id: string;
  label: string;
}

interface DialogOptionProduct extends DialogOptionBase {
  product: Dish 
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
    type: "primary" | "secondary" | "link" | "abort"
  }
}