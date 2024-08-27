"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const decimal_js_1 = __importDefault(require("decimal.js"));
const phoneValidByMask_1 = require("../libs/phoneValidByMask");
const OrderHelper_1 = require("../libs/helpers/OrderHelper");
const isValue_1 = require("../utils/isValue");
let attributes = {
    /** Id  */
    id: {
        type: "string",
    },
    /** last 8 chars from id */
    shortId: "string",
    /** Stateflow field */
    state: "string",
    /** Concept string */
    // TODO: rework type to string[]
    // concept: "string",
    concept: {
        type: "json",
    },
    /** the basket contains mixed types of concepts */
    isMixedConcept: "boolean",
    /**
     * @deprecated will be rename to `Items` in **v2**
     */
    dishes: {
        collection: "OrderDish",
        via: "order",
    },
    // /** */
    // discount: "json" as any,
    paymentMethod: {
        model: "PaymentMethod",
    },
    /** */
    paymentMethodTitle: "string",
    paid: {
        type: "boolean",
        defaultsTo: false,
    },
    /** */
    isPaymentPromise: {
        type: "boolean",
        defaultsTo: true,
    },
    /**
     * The property displays the state of promotion.
     * To understand what was happening with the order in the adapter of promoters.
     *
     * This property can be used to portray the representations of promotions at the front
     */
    promotionState: {
        type: "json"
    },
    /**
     * It's worth collecting errors to simplify debugging
     */
    promotionErrors: {
        type: "json"
    },
    /**
     * hidden in api
     */
    promotionCode: {
        model: "promotionCode",
    },
    promotionCodeDescription: {
        type: "string",
        allowNull: true
    },
    promotionCodeString: {
        type: "string",
        allowNull: true
    },
    /**
     * The discount will be applied to basketTotal during countCart
     * This will be cleared before passing promotions count
     */
    promotionFlatDiscount: {
        type: "number",
        defaultsTo: 0,
    },
    /**
     * Promotion may estimate shipping costs, and if this occurs,
     * then the calculation of delivery through the adapter will be ignored.
     */
    promotionDelivery: {
        type: "json"
    },
    /**
    * The user's locale is a priority, the cart locale may not be installed, then the default locale of the site will be selected.
    locale: {
      type: "string",
      // isIn:  todo
      allowNull: true
    } as unknown as string,
    */
    /**
     * Date until promocode is valid
     * This is needed for calculating promotion in realtime without a request in DB
     */
    promotionCodeCheckValidTill: {
        type: "string",
        allowNull: true
    },
    /**
     * If you set this field through promotion, then the order will not be possible to order
     */
    promotionUnorderable: {
        type: "boolean",
    },
    /**
     ** Means that the basket was modified by the adapter,
     * It also prevents the repeat call of the action of the handler of the handler
     * */
    isPromoting: {
        type: "boolean"
    },
    /** */
    dishesCount: "number",
    uniqueDishes: "number",
    modifiers: "json", //TODO? for what?
    customer: "json",
    address: "json",
    comment: "string",
    personsCount: "string",
    /** The desired date and delivery time*/
    date: {
        type: "string",
        allowNull: true
    },
    problem: {
        type: "boolean",
        defaultsTo: false,
    },
    /** */
    rmsDelivered: {
        type: "boolean",
        defaultsTo: false,
    },
    /** */
    rmsId: "string",
    rmsOrderNumber: "string",
    rmsOrderData: "json",
    rmsDeliveryDate: "string",
    rmsErrorMessage: "string",
    rmsErrorCode: "string",
    rmsStatusCode: "string",
    deliveryStatus: "string",
    pickupPoint: {
        model: "Place",
    },
    selfService: {
        type: "boolean",
        defaultsTo: false,
    },
    delivery: {
        type: "json"
    },
    /** Notification about delivery
     * ex: time increased due to traffic jams
     * @deprecated should changed for order.delivery.message
     * */
    deliveryDescription: {
        type: "string",
        allowNull: true
    },
    message: "string", // deprecated
    /**
     * @deprecated use order.delivery.item
     */
    deliveryItem: {
        model: "Dish",
    },
    /**
     * @deprecated use order.delivery.cost
     */
    deliveryCost: {
        type: "number",
        defaultsTo: 0,
    },
    /** order total weight */
    totalWeight: {
        type: "number",
        defaultsTo: 0,
    },
    /** Сдача */
    trifleFrom: {
        type: "number",
        defaultsTo: 0,
    },
    /** Sum of all bonuses */
    bonusesTotal: {
        type: "number",
        defaultsTo: 0,
    },
    spendBonus: {
        type: "json"
    },
    /** total = basketTotal + deliveryCost - discountTotal - bonusesTotal */
    total: {
        type: "number",
        defaultsTo: 0,
    },
    /**
      * Sum dishes user added
      */
    basketTotal: {
        type: "number",
        defaultsTo: 0,
    },
    /**
    *   @deprecated orderTotal use basketTotal
    */
    orderTotal: {
        type: "number",
        defaultsTo: 0,
    },
    /**
     * Calculated discount, not recommend for changing
     *
     * !!! This field is for visual display, do not use it for transmission to the payment gateway
     */
    discountTotal: {
        type: "number",
        defaultsTo: 0,
    },
    orderDate: "string",
    // orderDateLimit: "string",
    /**
     * @experimental
     * This field allows you to somehow mark the recycle bin, although this is not used in current versions of the kernel.
     * Designed for creating some custom logic, through visual programming or through modules.
     */
    tag: "string",
    deviceId: "string",
    /**
     * A number that will change every time the order is changed
     */
    nonce: {
        type: "number",
        defaultsTo: 0,
    },
    /**
     * Populated order stringify hash
     */
    hash: "string",
    /**
     * Add IP, UserAgent for anonymous cart
     */
    user: {
        model: "user",
    },
    customData: "json",
};
let Model = {
    beforeCreate(orderInit, cb) {
        if (!orderInit.id) {
            orderInit.id = (0, uuid_1.v4)();
        }
        if (!orderInit.shortId) {
            orderInit.shortId = orderInit.id.substr(orderInit.id.length - 8).toUpperCase();
        }
        orderInit.promotionState = [];
        orderInit.state = "CART";
        cb();
    },
    async afterCreate(order, cb) {
        /**
         * It was decided to add ORDER_INIT_PRODUCT_ID when creating a cart here to unify the core functionality for marketing.
         * This creates redundancy in the kernel. But in the current version, we will try to run the kernel in this way. Until we switch to stateflow
         *
         *  @setting: ORDER_INIT_PRODUCT_ID - Adds a dish to the cart that the user cannot remove, he can only modify it
         */
        const ORDER_INIT_PRODUCT_ID = await Settings.get("ORDER_INIT_PRODUCT_ID");
        if (ORDER_INIT_PRODUCT_ID) {
            const ORDER_INIT_PRODUCT = (await Dish.find({ where: { or: [{ id: ORDER_INIT_PRODUCT_ID }, { rmsId: ORDER_INIT_PRODUCT_ID }] } }).limit(1))[0];
            if (ORDER_INIT_PRODUCT !== undefined) {
                await Order.addDish({ id: order.id }, ORDER_INIT_PRODUCT, 1, [], "", "core");
            }
        }
        cb();
    },
    /** Add a dish into order */
    async addDish(criteria, dish, amount, modifiers, comment, 
    /**
     * user - added manually by human
     * promotion - cleaned in each calculated promotion
     * core - is reserved for
     * custom - custom integration can process it
     */
    addedBy, replace, orderDishId) {
        await emitter.emit.apply(emitter, ["core:order-before-add-dish", ...arguments]);
        // TODO: when user add some dish to PAYMENT || ORDER cart state, need just make new cart clone
        let dishObj;
        if (!addedBy)
            addedBy = "user";
        if (typeof dish === "string") {
            dishObj = (await Dish.find({ id: dish }).limit(1))[0];
            if (!dishObj) {
                throw { body: `Dish with id ${dish} not found`, code: 2 };
            }
        }
        else {
            dishObj = dish;
        }
        if (amount < 0)
            throw `Amount is subzero [${amount}]`;
        // TODO: In core you can add any amount dish, only in checkout it should show which not allowed
        if (dishObj.balance !== -1) {
            if (amount > dishObj.balance) {
                await emitter.emit.apply(emitter, ["core:order-add-dish-reject-amount", ...arguments]);
                sails.log.error({
                    body: `There is no so mush dishes with id ${dishObj.id}`,
                    code: 1,
                });
            }
        }
        if (dishObj.modifier) {
            throw new Error(`Dish [${dishObj.id}] is modifier`);
        }
        /**
         * Add default modifiers in add
         */
        const dishModifiers = dishObj.modifiers ?? [];
        dishModifiers.forEach(group => {
            if (group.childModifiers) {
                group.childModifiers.forEach(modifier => {
                    if (modifier.defaultAmount) {
                        const modifierIsAdded = modifiers.find(m => m.id === modifier.id);
                        if (!modifierIsAdded) {
                            modifiers.push({
                                id: modifier.id,
                                amount: modifier.defaultAmount
                            });
                        }
                    }
                });
            }
        });
        let order = await Order.findOne(criteria).populate("dishes");
        if (order.dishes.length > 99)
            throw "99 max dishes amount";
        if (order.state === "ORDER")
            throw `order with orderId ${order.id} in state ORDER`;
        if (modifiers && modifiers.length) {
            modifiers.forEach((m) => {
                if (m.amount === undefined)
                    m.amount = 1;
            });
        }
        else {
            modifiers = [];
        }
        /**
         * @setting: ONLY_CONCEPTS_DISHES - Prevents ordering from origin concept
         */
        const ONLY_CONCEPTS_DISHES = await Settings.get('ONLY_CONCEPTS_DISHES');
        if (ONLY_CONCEPTS_DISHES && dishObj.concept === 'origin') {
            throw { body: `Dish ${dishObj.name} (${dishObj.id}) from [${dishObj.concept}] concept, but ONLY_CONCEPTS_DISHES setting is: ${ONLY_CONCEPTS_DISHES}`, code: 1 };
        }
        /**
        * @setting: CORE_SEPARATE_CONCEPTS_ORDERS - Prevents ordering in the same cart from different concepts
        */
        const SEPARATE_CONCEPTS_ORDERS = await Settings.get('SEPARATE_CONCEPTS_ORDERS');
        if (SEPARATE_CONCEPTS_ORDERS && order.concept.length && !order.concept.includes(dishObj.concept)) {
            throw { body: `Dish ${dishObj.name} not in same concept as cart`, code: 1 };
        }
        else if (SEPARATE_CONCEPTS_ORDERS && order.dishes.length === 0) {
            //await Order.update({ id: order.id }, { concept: dishObj.concept })
        }
        let orderDish;
        // auto replace and increase amount if same dishes without modifiers
        if (!replace && (!modifiers || (modifiers && modifiers.length === 0))) {
            let sameOrderDishArray = await OrderDish.find({
                order: order.id,
                dish: dishObj.id,
            });
            for (let sameOrderDish of sameOrderDishArray) {
                if (sameOrderDish && sameOrderDish.modifiers && sameOrderDish.modifiers.length === 0) {
                    orderDishId = Number(sameOrderDish.id);
                    amount = amount + sameOrderDish.amount;
                    replace = true;
                    break;
                }
            }
        }
        const results = await emitter.emit("core:add-product-before-write", order, dishObj, 15 * 1000);
        const resultsCount = results.length;
        const successCount = results.filter((r) => r.state === "success").length;
        if (resultsCount !== successCount) {
            return;
        }
        if (replace) {
            orderDish = (await OrderDish.update({ id: orderDishId }, {
                dish: dishObj.id,
                order: order.id,
                amount: amount,
                modifiers: modifiers,
                comment: comment,
                addedBy: addedBy,
                itemPrice: dishObj.price
            }).fetch())[0];
        }
        else {
            orderDish = await OrderDish.create({
                dish: dishObj.id,
                order: order.id,
                amount: amount,
                modifiers: modifiers,
                comment: comment,
                addedBy: addedBy,
                itemPrice: dishObj.price
            }).fetch();
        }
        await emitter.emit.apply(emitter, ["core:order-after-add-dish", orderDish, ...arguments]);
        try {
            await Order.countCart({ id: order.id }, addedBy === "promotion");
            await Order.next(order.id, "CART");
        }
        catch (error) {
            sails.log.error(error);
            throw error;
        }
    },
    //** Delete dish from order */
    async removeDish(criteria, dish, amount, stack) {
        // TODO: delete stack
        await emitter.emit.apply(emitter, ["core:order-before-remove-dish", ...arguments]);
        const order = await Order.findOne(criteria).populate("dishes");
        if (order.state === "ORDER")
            throw `order with orderId ${order.id} in state ORDER`;
        let orderDish;
        if (stack) {
            amount = 1;
            orderDish = await OrderDish.findOne({
                where: { order: order.id, dish: dish.dish },
                sort: "createdAt ASC",
            }).populate("dish");
        }
        else {
            orderDish = await OrderDish.findOne({
                order: order.id,
                id: dish.id,
            }).populate("dish");
        }
        if (!orderDish) {
            await emitter.emit.apply(emitter, ["core:order-remove-dish-reject-no-orderdish", ...arguments]);
            throw {
                body: `OrderDish with id ${dish.id} in order with id ${order.id} not found`,
                code: 1,
            };
        }
        orderDish.amount -= amount;
        if (orderDish.amount > 0) {
            await OrderDish.update({ id: orderDish.id }, { amount: orderDish.amount }).fetch();
        }
        else {
            await OrderDish.destroy({ id: orderDish.id }).fetch();
        }
        await emitter.emit.apply(emitter, ["core:order-after-remove-dish", ...arguments]);
        await Order.next(order.id, "CART");
        await Order.countCart({ id: order.id });
    },
    async setCount(criteria, dish, amount) {
        await emitter.emit.apply(emitter, ["core:order-before-set-count", ...arguments]);
        const _dish = dish.dish;
        if (_dish.balance !== -1)
            if (amount > _dish.balance) {
                await emitter.emit.apply(emitter, ["core:order-set-count-reject-amount", ...arguments]);
                throw {
                    body: `There is no so mush dishes with id ${dish.id}`,
                    code: 1,
                };
            }
        const order = await Order.findOne(criteria).populate("dishes");
        if (order.state === "ORDER")
            throw `order with orderId ${order.id} in state ORDER`;
        const orderDishes = await OrderDish.find({ order: order.id }).populate("dish");
        const get = orderDishes.find((item) => item.id === dish.id);
        if (get) {
            get.amount = amount;
            if (get.amount > 0) {
                await OrderDish.update({ id: get.id }, { amount: get.amount }).fetch();
            }
            else {
                await OrderDish.destroy({ id: get.id }).fetch();
                sails.log.info("destroy", get.id);
            }
            await Order.next(order.id, "CART");
            await Order.countCart({ id: order.id });
            Order.update({ id: order.id }, order).fetch();
            await emitter.emit.apply(emitter, ["core:order-after-set-count", ...arguments]);
        }
        else {
            await emitter.emit.apply(emitter, ["core:order-set-count-reject-no-orderdish", ...arguments]);
            throw { body: `OrderDish dish id ${dish.id} not found`, code: 2 };
        }
    },
    async setComment(criteria, dish, comment) {
        await emitter.emit.apply(emitter, ["core:order-before-set-comment", ...arguments]);
        const order = await Order.findOne(criteria).populate("dishes");
        if (order.state === "ORDER")
            throw `order with orderId ${order.id} in state ORDER`;
        const orderDish = await OrderDish.findOne({
            order: order.id,
            id: dish.id,
        }).populate("dish");
        if (orderDish) {
            await OrderDish.update({ id: orderDish.id }, { comment: comment }).fetch();
            await Order.next(order.id, "CART");
            await Order.countCart({ id: order.id });
            Order.update({ id: order.id }, order).fetch();
            await emitter.emit.apply(emitter, ["core:order-after-set-comment", ...arguments]);
        }
        else {
            await emitter.emit.apply(emitter, ["core:order-set-comment-reject-no-orderdish", ...arguments]);
            throw { body: `OrderDish with id ${dish.id} not found`, code: 1 };
        }
    },
    /**
     * Clone dishes in new order
     * @param source Order findOne criteria
     * @returns new order
     */
    async clone(source) {
        // Find the original order by ID
        const originalOrder = await Order.findOne(source).populate("dishes");
        // Check if the original order exists
        if (!originalOrder) {
            throw new Error(`Order with ID ${originalOrder.id} not found.`);
        }
        const newOrder = await Order.create({}).fetch();
        // Clone the order dishes from the original order to the new order
        const originalOrderDishes = originalOrder.dishes;
        // Iterate through the original order dishes and add them to the new order
        for (const originalOrderDish of originalOrderDishes) {
            if (originalOrderDish.addedBy !== "user")
                continue;
            // Assuming you have an addDish method that takes an order ID and a dish object as parameters
            await Order.addDish({ id: newOrder.id }, originalOrderDish.dish, originalOrderDish.amount, originalOrderDish.modifiers, null, "user");
        }
        return newOrder;
    },
    /**
     * Set order selfService field. Use this method to change selfService.
     * @param criteria
     * @param selfService
     */
    async setSelfService(criteria, selfService = true) {
        sails.log.silly("Order > setSelfService >", selfService);
        const order = await Order.findOne(criteria);
        if (order.state === "ORDER")
            throw `order with orderId ${order.id} in state ORDER`;
        return (await Order.update(criteria, { selfService: Boolean(selfService) }).fetch())[0];
    },
    /**
     * !! Not for external use, only in Order.check
     * The use of bonuses in the cart implies that this order has a user.
     * Then all checks will be made, and a record will be written in the transaction of user bonuses
     *
     Bonus spending strategies :
      1) 'bonus_from_order_total': (default) deduction from the final amount of the order including promotional dishes, discounts and delivery
      2) 'bonus_from_basket_delivery_discount': writing off bonuses from the amount of the basket, delivery and discounts (not including promotional dishes)
      3) 'bonus_from_basket_and_delivery': writing off bonuses from the amount of the basket and delivery (not including promotional dishes, discounts)
      4) 'bonus_from_basket': write-off of bonuses from the amount of the basket (not including promotional dishes, discounts and delivery)
  
      Current implement logic for only one strategy
  
     */
    async checkBonus(orderId, spendBonus) {
        const order = await Order.findOne({ id: orderId });
        if (order.user && typeof order.user === "string") {
            // Fetch the bonus program for this bonus spend
            const bonusProgram = await BonusProgram.findOne({ id: spendBonus.bonusProgramId });
            const bonusSpendingStrategy = await Settings.get("BONUS_SPENDING_STRATEGY") ?? "bonus_from_order_total";
            let amountToDeduct = 0;
            switch (bonusSpendingStrategy) {
                case 'bonus_from_order_total':
                    amountToDeduct = order.total;
                    break;
                case 'bonus_from_basket_delivery_discount':
                    amountToDeduct = order.basketTotal + order.deliveryCost - order.discountTotal;
                    break;
                case 'bonus_from_basket_and_delivery':
                    amountToDeduct = order.basketTotal + order.deliveryCost;
                    break;
                case 'bonus_from_basket':
                    amountToDeduct = order.basketTotal;
                    break;
                default:
                    throw `Invalid bonus spending strategy: ${bonusSpendingStrategy}`;
            }
            // Calculate maximum allowed bonus coverage
            const maxBonusCoverage = new decimal_js_1.default(amountToDeduct).mul(bonusProgram.coveragePercentage);
            // Check if the specified bonus spend amount is more than the maximum allowed bonus coverage
            let bonusCoverage;
            if (spendBonus.amount && new decimal_js_1.default(spendBonus.amount).lessThan(maxBonusCoverage)) {
                bonusCoverage = new decimal_js_1.default(spendBonus.amount);
            }
            else {
                bonusCoverage = maxBonusCoverage;
            }
            // Deduct the bonus from the order total
            order.total = new decimal_js_1.default(order.total).sub(bonusCoverage).toNumber();
            // Throw if User does not have bonuses to cover this
            await UserBonusTransaction.create({
                amount: bonusCoverage.toNumber(),
                bonusProgram: bonusProgram.id,
                user: order.user
            }).fetch();
            // Update the order with new total
            await Order.updateOne({ id: orderId }, { total: order.total, bonusesTotal: bonusCoverage.toNumber() });
        }
        else {
            throw `User not found in Order, applyBonuses failed`;
        }
    },
    // TODO: implement clearOfPromotion
    async clearOfPromotion() {
        // remove from a collection
    },
    ////////////////////////////////////////////////////////////////////////////////////
    // TODO: rewrite for OrderId instead criteria FOR ALL MODELS because is not batch check
    async check(criteria, customer, isSelfService, address, paymentMethodId, userId, spendBonus) {
        let order = await Order.findOne(criteria);
        // CHECKING
        // Check order empty
        if (order.dishesCount === 0) {
            throw {
                code: 13,
                error: "order is empty",
            };
        }
        if (await Maintenance.getActiveMaintenance() !== undefined)
            throw `Currently site is off`;
        if (order.state === "ORDER")
            throw `order with orderId ${order.id} in state ORDER`;
        if (order.promotionUnorderable === true)
            throw `Order not possible for order by promotion`;
        //const order: Order = await Order.findOne(criteria);
        if (order.paid) {
            sails.log.error("CART > Check > error", order.id, "order is paid");
            throw {
                code: 12,
                error: "order is paid",
            };
        }
        /**
         *  // TODO:  Perhaps you need to add a lifetime for a check for a check (make a globally the concept of an audit of the Intelligence system if it is less than a check version, then you need to go through the check again)
         */
        emitter.emit("core:order-before-check", order, customer, isSelfService, address);
        sails.log.silly(`Order > check > before check > ${JSON.stringify(customer)} ${isSelfService} ${JSON.stringify(address)} ${paymentMethodId}`);
        // Start checking
        await Order.next(order.id, "CART");
        if (customer) {
            await checkCustomerInfo(customer);
            order.customer = { ...customer };
        }
        else {
            if (order.customer === null) {
                throw {
                    code: 2,
                    error: "customer is required",
                };
            }
        }
        if (order.user && userId && order.user !== userId) {
            sails.log.error(`User on basket [${order.shortId}] not equall [${order.user}] passed user [${userId}]`);
        }
        else {
            order.user = userId;
        }
        await checkDate(order);
        if (paymentMethodId) {
            await checkPaymentMethod(paymentMethodId);
            order.paymentMethod = paymentMethodId;
            order.paymentMethodTitle = (await PaymentMethod.findOne({ id: paymentMethodId })).title;
            order.isPaymentPromise = await PaymentMethod.isPaymentPromise(paymentMethodId);
        }
        let softDeliveryCalculation = true;
        /** if pickup, then you do not need to check the address*/
        if (isSelfService) {
            order.selfService = true;
            emitter.emit("core:order-is-self-service", order, customer, isSelfService, address);
        }
        else {
            order.selfService = false;
            softDeliveryCalculation = await Settings.get("SOFT_DELIVERY_CALCULATION");
            if (!address.city)
                address.city = await Settings.get("CITY");
            if (address) {
                checkAddress(address, softDeliveryCalculation);
                order.address = { ...address };
            }
            else {
                if (!isSelfService && order.address === null && !softDeliveryCalculation) {
                    throw {
                        code: 5,
                        error: "address is required",
                    };
                }
            }
        }
        // Custom emitters checks
        const results = await emitter.emit("core:order-check", order, customer, isSelfService, address, paymentMethodId);
        delete (order.dishes);
        await Order.update({ id: order.id }, { ...order }).fetch();
        ////////////////////
        // CHECKOUT COUNTING
        try {
            order = await Order.countCart({ id: order.id });
        }
        catch (error) {
            sails.log.error("Check countcart error:", error);
            throw {
                code: 14,
                error: "Problem with counting cart",
            };
        }
        if (!order.selfService && !order.delivery?.allowed) {
            throw {
                code: 11,
                error: "Delivery not allowed",
            };
        }
        /**
         *  Bonus spending
         * */
        if (order.user && typeof order.user === "string" && spendBonus && spendBonus.bonusProgramId) {
            if (spendBonus.amount < 0) {
                spendBonus.amount = 0;
            }
            if (spendBonus.amount === 0) {
                order.spendBonus.amount = 0;
                order.bonusesTotal = 0;
                return;
            }
            // load bonus strategy
            let bonusSpendingStrategy = await Settings.get("BONUS_SPENDING_STRATEGY") ?? 'bonus_from_order_total';
            // Fetch the bonus program for this bonus spend
            const bonusProgram = await BonusProgram.findOne({ id: spendBonus.bonusProgramId });
            spendBonus.amount = parseFloat(new decimal_js_1.default(spendBonus.amount).toFixed(bonusProgram.decimals));
            // TODO: rewrite for Decimal.js
            let amountToDeduct = 0;
            switch (bonusSpendingStrategy) {
                case 'bonus_from_order_total':
                    amountToDeduct = order.total;
                    break;
                case 'bonus_from_basket_delivery_discount':
                    amountToDeduct = order.basketTotal + order.deliveryCost - order.discountTotal;
                    break;
                case 'bonus_from_basket_and_delivery':
                    amountToDeduct = order.basketTotal + order.deliveryCost;
                    break;
                case 'bonus_from_basket':
                    amountToDeduct = order.basketTotal;
                    break;
                default:
                    throw `Invalid bonus spending strategy: ${bonusSpendingStrategy}`;
            }
            // Calculate maximum allowed bonus coverage
            const maxBonusCoverage = new decimal_js_1.default(amountToDeduct).mul(bonusProgram.coveragePercentage);
            // Check if the specified bonus spend amount is more than the maximum allowed bonus coverage
            let bonusCoverage;
            if (spendBonus.amount && new decimal_js_1.default(spendBonus.amount).lessThan(maxBonusCoverage)) {
                bonusCoverage = new decimal_js_1.default(spendBonus.amount);
            }
            else {
                bonusCoverage = maxBonusCoverage;
            }
            // Deduct the bonus from the order total
            order.spendBonus = spendBonus;
            order.total = new decimal_js_1.default(order.total).sub(bonusCoverage).toNumber();
            order.bonusesTotal = bonusCoverage.toNumber();
        }
        sails.log.silly("Order > check > after wait general emitter", order, results);
        emitter.emit("core:order-after-check-counting", order);
        delete (order.dishes);
        await Order.update({ id: order.id }, { ...order }).fetch();
        /** The check can pass without listeners, because the check itself is minimal
        * has basic checks. And is self-sufficient, but
        * is still set by default so all checks must be passed
        */
        const checkConfig = await Settings.get("EMITTER_CHECKOUT_STRATEGY");
        /**
         * If checkout policy not required then push next
         * default is notRequired === undefined, then skip
         * Because we have RMS adapter who has garaties for order Delivery
         */
        if (!checkConfig || checkConfig === "NOT_REQUIRED") {
            if ((await Order.getState(order.id)) !== "CHECKOUT") {
                await Order.next(order.id, "CHECKOUT");
            }
            return;
        }
        /** Success in all listeners by default */
        const resultsCount = results.length;
        const successCount = results.filter((r) => r.state === "success").length;
        if (resultsCount === successCount) {
            if ((await Order.getState(order.id)) !== "CHECKOUT") {
                await Order.next(order.id, "CHECKOUT");
            }
            return;
        }
        else if (checkConfig === "ALL_REQUIRED") {
            let error;
            // Find error reason
            results.forEach(result => {
                if (result.state === 'error' && result.error) {
                    sails.log.error(`Order > core:order-check error: ${result.error}`);
                    sails.log.error(result);
                    error = result.error;
                }
            });
            throw {
                code: 0,
                error: `one or more results from core:order-check was not succeed\n last error: ${error}`,
            };
        }
        else {
            // Todo: implement logic for "JUST_ONE"
        }
        /**
         * Here, there should be the logic of the success of at least one listener, but
         * At the moment, no practical application was found.
         *
         * if (checkconfig.justone) ...
         */
    },
    ////////////////////////////////////////////////////////////////////////////////////
    /** Basket design*/
    async order(criteria) {
        const order = await Order.findOne(criteria);
        // Check maintenance
        if (await Maintenance.getActiveMaintenance() !== undefined)
            throw `Currently site is off`;
        //  TODO: impl with stateflow
        if (order.state === "ORDER")
            throw `order with orderId ${order.id} in state ORDER`;
        if (order.state === "CART")
            throw `order with orderId ${order.id} in state CART`;
        // await Order.update({id: order.id}).fetch();
        // TODO: this check is needed
        // if(( order.isPaymentPromise && order.paid) || ( !order.isPaymentPromise && !order.paid) )
        //   return 3
        emitter.emit("core:order-before-order", order);
        sails.log.silly("Order > order > before order >", order.customer, order.selfService, order.address);
        if (order.selfService) {
            emitter.emit("core:order-order-self-service", order);
        }
        else {
            emitter.emit("core:order-order-delivery", order);
        }
        /**
         *  I think that this function is unnecessary here, although the entire emitter was created for it.
         *  Obviously, having an RMS adapter at your disposal, you don’t need a waiting listener at all
         *  But since it exists, it will be revised in version 2
         * @deprecated Event `core:order-order`
         */
        const results = await emitter.emit("core:order-order", order);
        sails.log.silly("Order > order > after wait general emitter results: ", results);
        const resultsCount = results.length;
        const successCount = results.filter((r) => r.state === "success").length;
        const orderConfig = await Settings.get("EMITTER_ORDER_STRATEGY");
        if (orderConfig) {
            if (orderConfig === "ALL_REQUIRED") {
                if (resultsCount === successCount) {
                    await orderIt();
                    return;
                }
                else {
                    throw "At least one listener did not complete the order.";
                }
            }
            if (orderConfig === "JUST_ONE") {
                if (successCount > 0) {
                    await orderIt();
                    return;
                }
                else {
                    throw "No listener completed the order";
                }
            }
        }
        await orderIt();
        return;
        async function orderIt() {
            if (order.user && order.bonusesTotal) {
                // Throw if User does not have bonuses to cover this
                await UserBonusTransaction.create({
                    isNegative: true,
                    amount: order.bonusesTotal,
                    bonusProgram: order.spendBonus.bonusProgramId,
                    user: order.user
                }).fetch();
            }
            // await Order.next(order.id,'ORDER');
            // TODO: Rewrite on stateflow
            let data = {};
            data.orderDate = new Date();
            data.state = "ORDER";
            /** ⚠️ If the preservation of the model is caused to NEXT, then there will be an endless cycle */
            sails.log.silly("Order > order > before save order", order);
            // await Order.update({id: order.id}).fetch();
            await Order.update({ id: order.id }, data).fetch();
            /** Here core just makes emit,
             * instead call directly in RMSadapter.
             * But I think we need to select default adapter and make order here */
            try {
                let orderWithRMS = await (await Adapter.getRMSAdapter()).createOrder(order);
                await Order.update({ id: order.id }, {
                    rmsId: orderWithRMS.rmsId,
                    rmsOrderNumber: orderWithRMS.rmsOrderNumber,
                    rmsOrderData: orderWithRMS.rmsOrderData
                });
                sails.log.info(`RestoCore > new order with id [${orderWithRMS.shortId}] for [${orderWithRMS.customer.phone.code + orderWithRMS.customer.phone.number}] total: ${orderWithRMS.total} has rmsOrderNumber: ${orderWithRMS.rmsOrderNumber}`);
            }
            catch (error) {
                const orderError = {
                    rmsErrorCode: error.code ?? "Error",
                    rmsErrorMessage: error.message ?? JSON.stringify(error)
                };
                sails.log.error(`RestoCore > orderIt error:`, error);
                await Order.update({ id: order.id }, orderError);
            }
            emitter.emit("core:order-after-order", order);
            if (order.user) {
                UserOrderHistory.save(order.id);
            }
        }
    },
    async payment(criteria) {
        const order = await Order.findOne(criteria);
        if (order.state !== "CHECKOUT")
            throw `order with orderId ${order.id} in state ${order.state} but need CHECKOUT`;
        let paymentResponse;
        let comment = "";
        let backLinkSuccess = (await Settings.get("FRONTEND_ORDER_PAGE")) + order.shortId;
        let backLinkFail = await Settings.get("FRONTEND_CHECKOUT_PAGE");
        let paymentMethodId = await order.paymentMethod;
        sails.log.silly("Order > payment > before payment register", order);
        let params = {
            backLinkSuccess: backLinkSuccess,
            backLinkFail: backLinkFail,
            comment: comment,
        };
        await Order.countCart({ id: order.id });
        await emitter.emit("core:order-payment", order, params);
        sails.log.silly("Order > payment > order before register:", order);
        try {
            paymentResponse = await PaymentDocument.register(order.id, "order", order.total, paymentMethodId, params.backLinkSuccess, params.backLinkFail, params.comment, order);
        }
        catch (e) {
            sails.log.error("Order > payment: ", e);
        }
        await Order.next(order.id, "PAYMENT");
        return paymentResponse;
    },
    async clear(criteria) {
        let order = await Order.findOne(criteria);
        if (order.state !== "CART")
            throw `Clear allowed only for CART state`;
        await OrderDish.destroy({ order: order.id }).fetch();
        await Order.next(order.id, "CART");
        await Order.countCart({ id: order.id });
        await emitter.emit.apply(emitter, ["core:order-was-cleared", ...arguments]);
    },
    /**
     * Method for quickly setting a Order tag
     * @experimental
     * @param criteria
     * @param tag
     * @returns
     */
    async tag(criteria, tag) {
        emitter.emit.apply(emitter, ["core:order-set-tag", ...arguments]);
        try {
            let order = await Order.findOne(criteria);
            if (order.state !== "CART") {
                throw new Error(`Clear allowed only for CART state`);
            }
            return await Order.updateOne({ id: order.id }, { tag: tag }).fetch();
        }
        catch (error) {
            sails.log.error('Error tagging order:', error);
        }
    },
    async setCustomData(criteria, customData) {
        await emitter.emit.apply(emitter, ["core:order-set-custom-data", ...arguments]);
        let order = await Order.findOne(criteria);
        customData = { ...order.customData, ...customData };
        await Order.updateOne({ id: order.id }, { customData });
    },
    async paymentMethodId(criteria) {
        let populatedOrder = (await Order.find(criteria).populate("paymentMethod"))[0];
        let paymentMethod = populatedOrder.paymentMethod;
        return paymentMethod.id;
    },
    /**  given populated Order instance by criteria*/
    async populate(criteria) {
        let fullOrder;
        try {
            fullOrder = await Order.findOne(criteria)
                .populate("dishes")
                .populate("deliveryItem")
                .populate('paymentMethod').populate('user').populate('pickupPoint');
            if (!fullOrder)
                throw `order by criteria: ${criteria},  not found`;
            const orderDishes = await OrderDish.find({ order: fullOrder.id }).populate("dish").sort("createdAt");
            for (let orderDish of orderDishes) {
                if (!orderDish.dish) {
                    sails.log.error("orderDish", orderDish.id, "has not dish");
                    continue;
                }
                // WHAT? It seems like test of waterline or check orderDishes not in Order?!
                // if (!fullOrder.dishes.filter((d: { id: number; }) => d.id === orderDish.id).length) {
                //   sails.log.error("orderDish", orderDish.id, "not exists in order", order.id);
                //   continue;
                // }
                const _dish = orderDish.dish;
                const dish = await Dish.findOne({
                    id: _dish.id,
                    // проблема в том что корзина после заказа должна всеравно показывать блюда даже удаленные, для этого надо запекать данные.ы
                    // isDeleted: false,
                })
                    .populate("images")
                    .populate("parentGroup");
                await Dish.getDishModifiers(dish);
                orderDish.dish = dish;
                if (orderDish.modifiers !== undefined && Array.isArray(orderDish.modifiers)) {
                    for await (let modifier of orderDish.modifiers) {
                        modifier.dish = (await Dish.find({ id: modifier.id }).limit(1))[0];
                    }
                }
                else {
                    throw `orderDish.modifiers not iterable orderDish: ${JSON.stringify(orderDish.modifiers, undefined, 2)}`;
                }
            }
            fullOrder.dishes = orderDishes;
            // TODO: refactor descr in method was writed
            // fullOrder.orderDateLimit = "await getOrderDateLimit()";
            // fullOrder.orderId = fullOrder.id;
        }
        catch (e) {
            sails.log.error("CART > fullOrder error", e);
        }
        const hash = OrderHelper_1.OrderHelper.orderHash(fullOrder);
        // TODO: test "nonce should be update after countcart change"
        let nonce = 0;
        if (fullOrder.hash !== hash) {
            if (typeof fullOrder.nonce === 'number' && isFinite(fullOrder.nonce)) {
                nonce = fullOrder.nonce + 1;
            }
            await Order.update({ id: fullOrder.id }, { hash: hash, nonce: nonce });
        }
        return { ...fullOrder };
    },
    /**
     * Method for calculating the basket. This is called every time the cart changes.
     * @param criteria OrderId
     * @param isPromoting If you use countCart inside a promo, then you should indicate this is `true`. Also, you should set the isPromoting state in the model
     * @returns Order
     */
    async countCart(criteria, isPromoting = false) {
        try {
            let order = await Order.findOne(criteria);
            if (order.isPromoting !== isPromoting) {
                let err = `CountCart: The order status does not match the passed parameters order.isPromoting [${order.isPromoting}], attribute [${isPromoting}], check your promotions`;
                sails.log.error(err);
                throw new Error(err);
            }
            /**
             *  // TODO: If countCart from payment or other changes from payment it should cancel all payment request
             */
            if (!["CART", "CHECKOUT", "PAYMENT"].includes(order.state))
                throw `Order with orderId ${order.id} - not can calculated from current state: (${order.state})`;
            const orderDishes = await OrderDish.find({ order: order.id }).populate("dish");
            if (!orderDishes)
                return order;
            emitter.emit("core:order-before-count", order);
            order.isPromoting = isPromoting;
            // const orderDishesClone = {}
            let basketTotal = new decimal_js_1.default(0);
            let dishesCount = 0;
            // let uniqueDishes = orderDishes.length;
            let uniqueDishes = 0;
            let totalWeight = new decimal_js_1.default(0);
            // TODO: clear the order
            const orderDishesForPopulate = [];
            let concepts = [];
            for await (let orderDish of orderDishes) {
                try {
                    if (orderDish.dish && typeof orderDish.dish !== "string") {
                        if (orderDish.addedBy === "user" && orderDish.dish.concept) {
                            concepts.push(orderDish.dish.concept);
                        }
                        // Item OrderDish calcualte
                        let itemCost = orderDish.dish.price;
                        let itemWeight = orderDish.dish.weight ?? 0;
                        const dish = orderDish.dish;
                        // Checks that the dish is available for sale
                        if (!dish) {
                            sails.log.error("Dish with id " + orderDish.dish.id + " not found!");
                            emitter.emit("core:order-return-full-order-destroy-orderdish", dish, order);
                            await OrderDish.destroy({ id: orderDish.id }).fetch();
                            continue;
                        }
                        if (dish.balance === -1 ? false : dish.balance < orderDish.amount) {
                            orderDish.amount = dish.balance;
                            //It is necessary to delete if the amount is 0
                            if (orderDish.amount >= 0) {
                                await Order.removeDish({ id: order.id }, orderDish, 999999);
                            }
                            emitter.emit("core:orderproduct-change-amount", orderDish);
                            sails.log.debug(`Order with id ${order.id} and  CardDish with id ${orderDish.id} amount was changed!`);
                        }
                        orderDish.itemTotal = 0;
                        orderDish.weight = 0;
                        orderDish.totalWeight = 0;
                        // orderDish.dishId = dish.id
                        if (orderDish.modifiers && Array.isArray(orderDish.modifiers)) {
                            for await (let selectedModifier of orderDish.modifiers) {
                                const modifierObj = (await Dish.find({ where: { or: [{ id: selectedModifier.id }, { rmsId: selectedModifier.id }] } }).limit(1))[0];
                                if (!modifierObj) {
                                    throw "Dish with id " + selectedModifier.id + " not found!";
                                }
                                // let opts:  any = {}
                                // await emitter.emit("core:order-countcart-before-calc-modifier", modifier, modifierObj, opts);
                                // const modifierCopy = {
                                //   amount: modifier.amount,
                                //   id: modifier.id
                                // }
                                // await emitter.emit('core:order-countcart-before-calc-modifier', modifierCopy, modifierObj);
                                /** // TODO:
                                 * Initial modification checking logic, now it's ugly.
                                 * Needed review architecture modifiers to keep it in model.
                                 * Also all checks modifiers need process in current loop thread. Currently we not have access to modifer options
                                 * Here by opts we can pass options for modifiers
                                 */
                                // Find original obj modifiers
                                let currentModifier = null;
                                dish.modifiers.forEach(originGroupModifiers => {
                                    // this block is not used
                                    if (originGroupModifiers.childModifiers) {
                                        originGroupModifiers.childModifiers.forEach(originChildModifier => {
                                            if (selectedModifier.dish && selectedModifier.dish.rmsId !== undefined) {
                                                if (selectedModifier.dish.rmsId === originChildModifier.id /** is rmsId*/) {
                                                    currentModifier = originChildModifier;
                                                }
                                            }
                                            else {
                                                sails.log.debug(`countCart can't assign currentModifier: rmsId not defined in selectedModifier ${JSON.stringify(selectedModifier)}`);
                                            }
                                        });
                                    }
                                });
                                if (!currentModifier) {
                                    sails.log.error(`Order with id [${order.id}] has unknown modifier [${selectedModifier.id}]`);
                                }
                                if (currentModifier && currentModifier.freeOfChargeAmount && typeof currentModifier.freeOfChargeAmount === "number" && currentModifier.freeOfChargeAmount > 0) {
                                    const freeAmountCost = new decimal_js_1.default(currentModifier.freeOfChargeAmount).times(modifierObj.price).toNumber();
                                    const modifierCost = new decimal_js_1.default(selectedModifier.amount).times(modifierObj.price).minus(freeAmountCost).toNumber();
                                    itemCost = new decimal_js_1.default(itemCost).plus(modifierCost).toNumber();
                                }
                                else {
                                    const modifierCost = new decimal_js_1.default(selectedModifier.amount).times(modifierObj.price).toNumber();
                                    itemCost = new decimal_js_1.default(itemCost).plus(modifierCost).toNumber();
                                }
                                // TODO: discountPrice && freeAmount
                                // // FreeAmount modifier support
                                // if (opts.freeAmount && typeof opts.freeAmount === "number") {
                                //   if (opts.freeAmount < selectedModifier.amount) {
                                //     let freePrice = new Decimal(modifierObj.price).times(opts.freeAmount)
                                //     orderDish.itemTotal = new Decimal(orderDish.itemTotal).minus(freePrice).toNumber();
                                //   } else {
                                //     // If more just calc
                                //     let freePrice = new Decimal(modifierObj.price).times(selectedModifier.amount)
                                //     orderDish.itemTotal = new Decimal(orderDish.itemTotal).minus(freePrice).toNumber();
                                //   }
                                // }
                                if (!Number(itemCost))
                                    throw `itemCost is NaN ${JSON.stringify(selectedModifier)}.`;
                                itemWeight = new decimal_js_1.default(itemWeight).plus(modifierObj.weight ?? 0).toNumber();
                            }
                        }
                        orderDish.totalWeight = new decimal_js_1.default(itemWeight).times(orderDish.amount).toNumber();
                        // itemCost => orderDish.itemTotal
                        orderDish.itemTotal = new decimal_js_1.default(itemCost).times(orderDish.amount).toNumber();
                        orderDish.dish = orderDish.dish.id;
                        await OrderDish.update({ id: orderDish.id }, orderDish).fetch();
                        orderDish.dish = dish;
                        orderDishesForPopulate.push({ ...orderDish });
                    }
                    else {
                        sails.log.error(`OrderDish.dish is string on countcart`);
                    }
                    // TODO: test it
                    if (orderDish.addedBy === "user") {
                        basketTotal = basketTotal.plus(orderDish.itemTotal);
                    }
                    dishesCount += orderDish.amount;
                    uniqueDishes++;
                    totalWeight = totalWeight.plus(orderDish.totalWeight);
                }
                catch (e) {
                    sails.log.error("Order > count > iterate orderDish error", e);
                    await OrderDish.destroy({ id: orderDish.id }).fetch();
                    uniqueDishes -= 1;
                    continue;
                }
            }
            if (concepts.length) {
                if (concepts.length > 1) {
                    order.isMixedConcept === true;
                }
                order.concept = [...new Set(concepts)];
            }
            order.dishesCount = dishesCount;
            order.uniqueDishes = uniqueDishes;
            order.totalWeight = totalWeight.toNumber();
            order.orderTotal = basketTotal.toNumber();
            order.basketTotal = basketTotal.toNumber();
            /**
            * Calcualte promotion & Discount costs
            * Here calculates all discounts for order
             */
            // Promotion code
            if (!order.isPromoting) {
                emitter.emit("core:count-before-promotion", order);
                try {
                    let promotionAdapter = Adapter.getPromotionAdapter();
                    // set lock
                    order.isPromoting = true;
                    await Order.updateOne({ id: order.id }, { isPromoting: true });
                    // If promocode is valid and allowed
                    if (order.promotionCode !== null && order.promotionCodeCheckValidTill !== null) {
                        const currentDate = new Date();
                        try {
                            const promotionEndDate = new Date(order.promotionCodeCheckValidTill);
                            if (promotionEndDate > currentDate) {
                                order.promotionCode = await PromotionCode.findOne({ id: order.promotionCode }).populate('promotion');
                                if (!order.promotionCode || !order.promotionCode.promotion || typeof order.promotionCode.promotion !== "object") {
                                    throw `No valid promotion for promocode`;
                                }
                            }
                            else {
                                sails.log.debug(`Count: promocode [${order.promotionCodeString}] expired, order [${order.id}].`);
                                throw "Promocode expired";
                            }
                        }
                        catch (error) {
                            sails.log.error(`PromotionAdapter > Problem with parse Date`);
                            order.promotionCode = null;
                            order.promotionCodeCheckValidTill = null;
                            order.promotionCodeDescription = error.toString();
                        }
                    }
                    else {
                        order.promotionCode = null;
                        order.promotionCodeCheckValidTill = null;
                    }
                    let orderPopulate = { ...order };
                    orderPopulate.dishes = orderDishesForPopulate;
                    /**
                     * All promotions handlers are calculated here, the main idea is that the order is modified during execution.
                     * The developer who creates promotions must take care of order in database and order runtime object.
                     */
                    let orederPROM = await promotionAdapter.processOrder(orderPopulate);
                    delete (orderPopulate.dishes);
                    delete (order.promotionCode);
                    if (orderPopulate.promotionCode) {
                        orderPopulate.promotionCode = orderPopulate.promotionCode.id;
                        order.promotionCode = orderPopulate.promotionCode;
                    }
                    orderPopulate.discountTotal = orederPROM.discountTotal;
                    orderPopulate.promotionFlatDiscount = orederPROM.promotionFlatDiscount;
                    order = orderPopulate;
                    let promotionOrderToSave = {
                        promotionCodeDescription: order.promotionCodeDescription,
                        promotionState: order.promotionState,
                        promotionErrors: order.promotionErrors,
                        promotionUnorderable: order.promotionUnorderable,
                        discountTotal: order.discountTotal,
                        promotionFlatDiscount: order.promotionFlatDiscount,
                        promotionDelivery: order.promotionDelivery,
                    };
                    await Order.update({ id: order.id }, promotionOrderToSave).fetch();
                }
                catch (error) {
                    sails.log.error(`Core > order > promotion calculate fail: `, error);
                }
                finally {
                    // finally
                    order.isPromoting = false;
                    await Order.update({ id: order.id }, { isPromoting: false }).fetch();
                }
                emitter.emit("core:order-after-promotion", order);
            }
            // Force unpopulated promotionCode, TODO: debug it why is not unpopulated here?!
            if (typeof order.promotionCode !== "string" && order.promotionCode?.id !== undefined) {
                order.promotionCode = order.promotionCode.id;
            }
            // Calculate delivery costs
            let delivery = {};
            let softDeliveryCalculation = await Settings.get("SOFT_DELIVERY_CALCULATION");
            emitter.emit("core:count-before-delivery-cost", order);
            if (order.promotionDelivery && isValidDelivery(order.promotionDelivery)) {
                order.delivery = order.promotionDelivery;
            }
            else {
                let deliveryAdapter = await Adapter.getDeliveryAdapter();
                await deliveryAdapter.reset(order);
                sails.log.debug(order, delivery);
                if (order.selfService === false && order.address?.city && order.address?.street && order.address?.home) {
                    emitter.emit("core:order-check-delivery", order);
                    try {
                        let delivery;
                        try {
                            delivery = await deliveryAdapter.calculate(order);
                        }
                        catch (error) {
                            sails.log.error("deliveryAdapter.calculate error:", error);
                            delivery = {
                                allowed: false,
                                cost: 0,
                                item: undefined,
                                message: error.replace(/[^\w\s]/gi, ''),
                                deliveryTimeMinutes: undefined
                            };
                        }
                    }
                    catch (error) {
                        sails.log.error(`Core > order > delivery calculate fail: `, error);
                    }
                    emitter.emit("core:order-after-check-delivery", order);
                }
                order.delivery = delivery;
            }
            if (softDeliveryCalculation &&
                (!order.delivery ||
                    Object.keys(order.delivery).length === 0 ||
                    delivery.allowed === false)) {
                let SOFT_DELIVERY_CALCULATION_MESSAGE = await Settings.get("SOFT_DELIVERY_CALCULATION_MESSAGE");
                delivery.allowed = true;
                delivery.cost = null;
                delivery.message = SOFT_DELIVERY_CALCULATION_MESSAGE ?? "Shipping cost cannot be calculated";
            }
            if (order.delivery && isValidDelivery(order.delivery, softDeliveryCalculation)) {
                if (!order.delivery.item) {
                    order.deliveryCost = order.delivery.cost;
                }
                else {
                    const deliveryItem = await Dish.findOne({ where: { or: [{ id: order.delivery.item }, { rmsId: order.delivery.item }] } });
                    if (deliveryItem) {
                        order.deliveryItem = deliveryItem.id;
                        order.deliveryCost = deliveryItem.price;
                    }
                    else {
                        order.deliveryCost = 0;
                        order.deliveryItem = null;
                        order.deliveryDescription = '';
                    }
                }
                order.deliveryDescription = typeof order.delivery.message === "string" ? order.delivery.message : JSON.stringify(order.delivery.message);
            }
            else {
                order.deliveryCost = 0;
                order.deliveryItem = null;
                order.deliveryDescription = '';
            }
            emitter.emit("core:count-after-delivery-cost", order);
            // END calculate delivery cost
            order.total = new decimal_js_1.default(basketTotal).plus(order.deliveryCost).minus(order.discountTotal).toNumber();
            order = (await Order.update({ id: order.id }, order).fetch())[0];
            emitter.emit("core:order-after-count", order);
            return order;
        }
        catch (error) {
            sails.log.error(" error >", error);
        }
    },
    async doPaid(criteria, paymentDocument) {
        let order = await Order.findOne(criteria);
        if (order.paid) {
            sails.log.debug(`Order > doPaid: Order with id ${order.id} is paid`);
            return;
        }
        try {
            let paymentMethodTitle = (await PaymentMethod.findOne(paymentDocument.paymentMethod)).title;
            await Order.update({ id: paymentDocument.originModelId }, {
                paid: true,
                paymentMethod: paymentDocument.paymentMethod,
                paymentMethodTitle: paymentMethodTitle,
            }).fetch();
            sails.log.debug("Order > doPaid: ", order.id, order.state, order.total, paymentDocument.amount);
            if (order.state !== "PAYMENT") {
                sails.log.error("Order > doPaid: is strange order state is not PAYMENT", order);
            }
            if (order.total !== paymentDocument.amount) {
                order.problem = true;
                order.comment = order.comment + "Attention, the composition of the order was changed, the bank account received:" + paymentDocument.amount;
            }
            await Order.order({ id: order.id });
            emitter.emit("core:order-after-dopaid", order);
        }
        catch (e) {
            sails.log.error("Order > doPaid error: ", e);
            throw e;
        }
    },
    async applyPromotionCode(criteria, promotionCodeString) {
        let order = await Order.findOne(criteria);
        let updateData = {};
        if (!["CART", "CHECKOUT", "PAYMENT"].includes(order.state))
            throw `Order with orderId ${order.id} - apply promocode on current state: (${order.state})`;
        if (!promotionCodeString) {
            updateData = {
                promotionCode: null,
                promotionCodeCheckValidTill: null,
                promotionCodeString: null,
                promotionCodeDescription: null
            };
        }
        else {
            const validPromotionCode = await PromotionCode.getValidPromotionCode(promotionCodeString);
            const isValidTill = "2099-01-01T00:00:00.000Z"; // TODO: recursive check Codes and Promotions
            if (validPromotionCode) {
                let description = validPromotionCode.description;
                if (!validPromotionCode.promotion) {
                    sails.log.error(`No valid promotions for ${promotionCodeString}`);
                    description += " [Error: No valid promotions]";
                }
                updateData = {
                    promotionCode: validPromotionCode.id,
                    promotionCodeCheckValidTill: isValidTill,
                    promotionCodeString: promotionCodeString,
                    promotionCodeDescription: description
                };
            }
            else {
                updateData = {
                    promotionCode: null,
                    promotionCodeCheckValidTill: null,
                    promotionCodeString: promotionCodeString,
                    promotionCodeDescription: `Promocode expired or not valid`
                };
                sails.log.debug(`No valid promocodes for ${promotionCodeString} order: [${order.id}]`);
            }
        }
        await Order.update({ id: order.id }, updateData).fetch();
        await Order.next(order.id, "CART");
        const basket = await Order.countCart({ id: order.id });
        return basket;
    }
};
// Waterline model export
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
// LOCAL HELPERS
/////////////////////////////////////////////////////////////////
async function checkCustomerInfo(customer) {
    if (!customer.name) {
        throw {
            code: 1,
            error: "customer.name is required",
        };
    }
    if (!customer.phone) {
        throw {
            code: 2,
            error: "customer.phone is required",
        };
    }
    if (!customer.phone.code || !customer.phone.number) {
        throw {
            code: 2,
            error: "customer.phone is required",
        };
    }
    let allowedPhoneCountries = await Settings.get("ALLOWED_PHONE_COUNTRIES");
    const strictPhoneValidation = await Settings.get("STRICT_PHONE_VALIDATION") ?? false;
    let isValidPhone = allowedPhoneCountries === undefined;
    if (strictPhoneValidation) {
        if (Array.isArray(allowedPhoneCountries)) {
            for (let countryCode of allowedPhoneCountries) {
                const country = sails.hooks.restocore["dictionaries"].countries[countryCode];
                isValidPhone = (0, phoneValidByMask_1.phoneValidByMask)(customer.phone.code + customer.phone.number, country.phoneCode, country.phoneMask);
                if (isValidPhone)
                    break;
            }
        }
    }
    else {
        isValidPhone = true;
    }
    const nameRegex = await Settings.get("NAME_REGEX");
    if (nameRegex) {
        if (!nameRegex.match(customer.name)) {
            throw {
                code: 3,
                error: "customer.name is invalid",
            };
        }
    }
    if (!isValidPhone) {
        throw {
            code: 4,
            error: "customer.phone is invalid",
        };
    }
}
function checkAddress(address, softDeliveryCalculation = false) {
    let error = [];
    if (!address.street && !address.streetId && !address.buildingName) {
        error.push({
            code: 5,
            error: "one of (street, streetId  or buildingName) is required",
        });
    }
    if (!address.home) {
        error.push({
            code: 6,
            error: "address.home is required",
        });
    }
    if (!address.city) {
        error.push({
            code: 7,
            error: "address.city is required",
        });
    }
    if (error.length) {
        if (softDeliveryCalculation) {
            return error;
        }
        else {
            throw error[0];
        }
    }
}
async function checkPaymentMethod(paymentMethodId) {
    if (!(await PaymentMethod.checkAvailable(paymentMethodId))) {
        throw {
            code: 8,
            error: "paymentMethod not available",
        };
    }
}
async function checkDate(order) {
    if (order.date) {
        const date = new Date(order.date);
        function isDateInPast(date, timeZone) {
            let currentDate = new Date();
            let currentTimestamp = currentDate.getTime();
            let targetDate = new Date(date);
            //  is equals timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            let targetTimestamp;
            try {
                targetTimestamp = new Date(targetDate.toLocaleString('en', { timeZone: timeZone })).getTime();
            }
            catch (error) {
                sails.log.error(`TimeZone not defined. TZ: [${timeZone}]`);
                targetTimestamp = new Date(targetDate.toLocaleString('en')).getTime();
            }
            return targetTimestamp < currentTimestamp;
        }
        const timezone = await Settings.get('TZ') ?? 'Etc/GMT';
        if (isDateInPast(order.date, timezone)) {
            throw {
                code: 15,
                error: "date is past",
            };
        }
        // date is Date
        if (date instanceof Date && !date.toJSON()) {
            throw {
                code: 9,
                error: "date is not valid",
            };
        }
        // Limit order date
        const possibleDatetime = await getOrderDateLimit();
        if (date.getTime() > possibleDatetime.getTime()) {
            sails.log.error(`Order checkDate: ${date.getTime()} > ${possibleDatetime.getTime()} = ${date.getTime() > possibleDatetime.getTime()}`);
            throw {
                code: 10,
                error: "delivery far, far away! allowed not after" + possibleDatetime,
            };
        }
        // Maintenance date check
        let maintenance = await Maintenance.getActiveMaintenance(order.date);
        if (maintenance) {
            throw {
                code: 16,
                error: "date not allowed",
            };
        }
    }
}
/**
 * Return Date in future
 * default 1 day
 */
// TODO: refactor possibleToOrderInMinutes from seconds to full work days
async function getOrderDateLimit() {
    let date = new Date();
    let possibleToOrderInMinutes = await Settings.get("POSSIBLE_TO_ORDER_IN_MINUTES"); //minutes
    if (!possibleToOrderInMinutes)
        possibleToOrderInMinutes = 1440;
    date.setSeconds(date.getSeconds() + (possibleToOrderInMinutes * 60));
    return date;
}
function isValidDelivery(delivery, strict = true) {
    // Check if the required properties exist and have the correct types
    if (typeof delivery.deliveryTimeMinutes === 'number' &&
        typeof delivery.allowed === 'boolean' &&
        typeof delivery.message === 'string') {
        // Soft delivery calculation
        if (strict !== true && delivery.allowed === true && delivery.cost === null) {
            return true;
        }
        // Check if both delivery.cost and delivery.item are not provided
        if (!(0, isValue_1.isValue)(delivery.cost) && !(0, isValue_1.isValue)(delivery.item)) {
            sails.log.error(`Check delivery error: delivery is not valid (delivery.cost and delivery.item not defined)`, delivery);
            sails.log.error(console.trace());
            return false;
        }
        else {
            // Check if delivery.cost is either undefined, null, or a number (including 0)
            if ((0, isValue_1.isValue)(delivery.cost) && typeof delivery.cost !== 'number') {
                sails.log.error(`Check delivery error: delivery is not valid (delivery.cost is not a number)`);
                sails.log.error(console.trace());
                return false;
            }
            // Check if delivery.item is either undefined, null, or a string
            if ((0, isValue_1.isValue)(delivery.item) && typeof delivery.item !== 'string') {
                sails.log.error(`Check delivery error: delivery is not valid (delivery.item is not a string)`);
                sails.log.error(console.trace());
                return false;
            }
        }
        return true;
    }
    sails.log.error(`Check delivery error: delivery is not valid`, delivery);
    return false;
}
