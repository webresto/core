"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dish_generator_1 = require("../../generators/dish.generator");
describe('Dish', function () {
    it('Test DishGenerator', async () => {
        for (let index = 0; index < 3; index++) {
            try {
                var result = dish_generator_1.default({ name: "test" });
            }
            catch (error) {
            }
        }
        //expect(result['InitPaymentAdapter'].adapter).to.equal("test-payment-system");
    });
});
