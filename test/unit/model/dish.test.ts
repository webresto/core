import generate from "../../generators/dish.generator"

describe('Cart', function () {
  it('Test Generate Dish', async () => {
    for (let index = 0; index < 10; index++) {
      try {
        var result =  await generate();
      } catch (error) {
        
      }
      console.log(result);
      

    } 

    //expect(result['InitPaymentAdapter'].adapter).to.equal("test-payment-system");
  });  
});
