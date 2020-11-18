import { expect } from "chai";
import Cart from "../../../models/Cart";
import Dish from "../../../models/Dish";

describe('Cart',function () {
  let cart: Cart;
  let dishes: Dish[];
  let fullCart: Cart;
  
  it('get dishes', async function(){
    dishes = await Dish.find({});
  });

  it('create Сart', async function (){
    cart = await Cart.create({});
    expect(cart).to.be.an('object');
  });
  
  it('addDish', async function(){     
    await cart.addDish(dishes[0], 1, [], '', 'test');
    await cart.addDish(dishes[1], 5, [], 'test comment','test');
    let result = await Cart.findOne(cart.id).populate('dishes');

    expect(result.dishes.length).to.equal(2);
  });

  it('removeDish', async function(){   
    let dish = (await Cart.findOne(cart.id).populate('dishes')).dishes[1];
    dish = await CartDish.findOne(dish.id);
    await cart.removeDish(dish, 1, false);
    let changedDish = await CartDish.findOne(dish.id);

    expect(changedDish.amount).to.equal(dish.amount - 1);
  });

  // it('removeDish stack', async function(){
  //   await cart.addDish(dishes[2], 10, [], '', 'test');
  //   let dishId = (await Cart.findOne(cart.id).populate('dishes')).dishes[2].id;
  //   let lastDish = await CartDish.findOne(dishId);
  //   await cart.removeDish(lastDish, 0, true);
  //   let changedDish = await CartDish.findOne(dishId);

  //   expect(changedDish.amount).to.equal(9);
  // });

  it('setCount', async function(){
    let dish = (await Cart.findOne({id: cart.id}).populate('dishes')).dishes[0];
    dish = await CartDish.findOne(dish.id);
    await cart.setCount(dish, 10);
    let changedDish = await CartDish.findOne({id: dish.id});

    expect(changedDish.amount).to.equal(10); 
  });

  it('setModifierCount?', async function(){
    //TODO do nothing
  });

  it('setComment', async function(){
    let dish = (await Cart.findOne({id: cart.id}).populate('dishes')).dishes[0];
    dish = await CartDish.findOne({id: dish.id});
    let testComment = 'this is a test comment';   
    await cart.setComment(dish, testComment);
    let changedDish = await CartDish.findOne({id: dish.id});

    expect(changedDish.comment).to.equal(testComment);
  });

  it('returnFullCart', async function(){
    cart = await Cart.create({});
    let res = await Cart.returnFullCart(cart);   
  }); 

 

  // it('addDish 20', async function(){
  //   cart = await Cart.create({});
  //   for(let i = 0; i < 20; i++){
  //     cart.addDish(dishes[i], 3, [], '', '');
  //   }
  // });
  // it('addDish 21th', async function(){
  //   cart.addDish(dishes[21], 3, [], '', '');
  // });
  
});
