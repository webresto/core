"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
//import { DialogBoxProduct } from "../../../interfaces/DialogBox";
const ajv_1 = __importDefault(require("ajv"));
const ajv = new ajv_1.default();
let jsonSchema = require("../../../libs/schemas/dialogBoxConfig.json");
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
    };
    it("check schema", async () => {
        try {
            console.log(validate(dialogConfig), 1111);
        }
        catch (error) {
            console.log(error);
        }
    });
});
