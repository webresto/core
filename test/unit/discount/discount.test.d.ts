export {};
/**
      *
      *
   let orderDish = await OrderDish.find({
     order: order.id,
     dish: dishes[0].id,
   }).sort("createdAt ASC");

 it("addDish same dish increase amount", async function () {
   order = await Order.create({id: "adddish-same-dish-increase-amount-1"}).fetch();
   await Order.addDish({id: order.id}, dishes[0], 2, [], "", "test");
   await Order.addDish({id: order.id}, dishes[0], 3, [], "", "test");
   await Order.addDish({id: order.id}, dishes[0], 1, null, "", "test");

   let orderDishes = await OrderDish.find({ order: order.id, dish: dishes[0].id });
   expect(orderDishes.length).to.equals(1);
   expect(orderDishes[0].amount).to.equals(6);

   order = await Order.create({id:"adddish-same-dish-increase-amount-2"}).fetch();
   await Order.addDish({id: order.id}, dishes[0], 1, [{ id: dishes[1].id, modifierId: dishes[1].id }], "", "mod");
   await Order.addDish({id: order.id}, dishes[0], 1, null, "", "test");
   await Order.addDish({id: order.id}, dishes[0], 2, null, "", "test");
   orderDishes = await OrderDish.find({ order: order.id, dish: dishes[0].id });
   expect(orderDishes.length).to.equals(2);
   for (let dish of orderDishes) {
     if (dish.modifiers.length == 1) {
       expect(dish.amount).to.equals(1);
     } else {
       expect(dish.amount).to.equals(3);
     }
   }
 });
      */ 
