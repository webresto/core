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
  it('create cart', async function (){
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
    let dish = (await Cart.findOne({id: cart.id}).populate('dishes')).dishes[1];
    cart.removeDish(dish, 1, false);
    let changedDish = await CartDish.findOne({id: dish.id});

    expect(changedDish.amount).to.equal(dish.amount - 1);
  });
  it('setCount', async function(){
    let dish = (await Cart.findOne({id: cart.id}).populate('dishes')).dishes[0];
    await cart.setCount(dish, 10);
    let changedDish = await CartDish.findOne({id: dish.id});

    expect(changedDish.amount).to.equal(10); 
  });
  it('setModifierCount?', async function(){
    //TODO
  });
  it('setComment', async function(){
    let dish = (await Cart.findOne({id: cart.id}).populate('dishes')).dishes[0];
    let testComment = 'this is a test comment';
    
    await cart.setComment(dish, testComment);
    let changedDish = await CartDish.findOne({id: dish.id});

    expect(changedDish.comment).to.equal(testComment);
  })
  it('returnFullCart', async function(){
    let res = await Cart.returnFullCart(cart);
  });

  
});
