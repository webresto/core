import Dish from "../models/Dish";
type DialogBoxConfig = DialogBoxButton | DialogBoxProduct
interface DialogBoxBase {
  message: string;
  title: string;
  description: string;
  options: OptionType
  image: string;
}

interface DialogBoxButton extends DialogBoxBase {
  options: DialogOptionButton[];
  optionsType: "button";
}

interface DialogBoxProduct extends DialogBoxBase {
  options: DialogOptionProduct[];
  optionsType: "product";
}

type OptionType = "button" | "product"

interface DialogOptionBase {
  id: string;
  label: string;
  of: Dish 
}

interface DialogOptionProduct extends DialogOptionBase {
  of: Dish 
}

interface DialogOptionButton extends DialogOptionBase {
  of: 
}