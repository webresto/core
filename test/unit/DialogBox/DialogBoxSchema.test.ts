//import { DialogBoxProduct } from "../../../interfaces/DialogBox";
import Ajv from 'ajv';
const ajv = new Ajv();
let jsonSchema = require("../../../libs/schemas/dialogBoxConfig.json")
const validate = ajv.compile(jsonSchema);

describe('DialogBoxSchema', () => {
  let dialogConfig = {
    "askId": "789",
    "allowClosing": true,
    "type": "routine",
    "message": "Choose an action or a product",
    "title": "Actions and Products",
    "optionsType": "product",
    "icon": "icon.png",
    "timeout": 15,
    "defaultOptionId": "default",
    "options": [
      {
        "id": "product1",
        "label": "Product 1",
        "product": {
          "name": "test",
          "id": "123",        
          "price": 10.99,
          "description": "Description of Product 1"
        }
      },
      {
        "id": "option1",
        "label": "Action 1",
        "button": {
          "type": "primary"
        }
      }
    ]
  }
  

  it("check schema", async () => {
    if(validate(dialogConfig) === true) {
      throw `Config has diferent types in options, please check schema libs/schemas/dialogBoxConfig.json`
    }
  });
});