"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dish_generator_1 = require("../../generators/dish.generator");
describe('Cart', function () {
    it('Test Generate Dish', async () => {
        for (let index = 0; index < 10; index++) {
            try {
                var result = await dish_generator_1.default();
            }
            catch (error) {
            }
            console.log(result);
        }
    });
});
