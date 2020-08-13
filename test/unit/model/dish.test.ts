import  groupGenerator   from "../../generators/dish.generator"

describe('Dish', function () {
  it('Test DishGenerator', async () => {
    for (let index = 0; index < 3; index++) {
      try {
        var result =  groupGenerator({name: "test"});
      } catch (error) {
        
      }
      console.log(result);
      

    } 

    //expect(result['InitPaymentAdapter'].adapter).to.equal("test-payment-system");
  });  
});
