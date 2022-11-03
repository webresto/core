"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const actions_1 = require("../libs/actions");
const getEmitter_1 = require("../libs/getEmitter");
const uuid_1 = require("uuid");
const emitter = getEmitter_1.default();
let attributes = {
    /** Id  */
    id: {
        type: "string",
    },
    /** last 8 chars from id */
    shortId: "string",
    /** Концепт к которому относится группа */
    concept: "string",
    /** */
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
    /** */
    dishesCount: "number",
    uniqueDishes: "number",
    modifiers: "json",
    customer: "json",
    address: "json",
    comment: "string",
    personsCount: "string",
    /** Желаемая дата и время доставки */
    date: "string",
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
    //state: "string",
    selfService: {
        type: "boolean",
        defaultsTo: false,
    },
    deliveryDescription: {
        type: "string",
        defaultsTo: "",
    },
    message: "string",
    deliveryItem: {
        model: "Dish",
    },
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
    /** Summ of all bobnuses */
    bonusesTotal: {
        type: "number",
        defaultsTo: 0,
    },
    /** total = orderTotal + deliveryCost - discountTotal - bonusesTotal */
    total: {
        type: "number",
        defaultsTo: 0,
    },
    // TODO: Uncoment after impl migrations
    // /** 
    // * Sum dishes in raw order 
    // */
    // orderCost: {
    //   type: "number",
    //   defaultsTo: 0,
    // } as unknown as number,
    /**
    *   @deprecated orderTotal use orderCost
    */
    orderTotal: {
        type: "number",
        defaultsTo: 0,
    },
    discountTotal: {
        type: "number",
        defaultsTo: 0,
    },
    orderDate: "string",
    customData: "json",
};
let Model = {
    beforeCreate(orderInit, next) {
        if (!orderInit.id) {
            orderInit.id = uuid_1.v4();
        }
        if (!orderInit.shortId) {
            orderInit.shortId = orderInit.id.substr(orderInit.id.length - 8).toUpperCase();
        }
        orderInit = "CART";
        next();
    },
    /** Add dish into order */
    async addDish(criteria, dish, amount, modifiers, comment, addedBy, replace, orderDishId) {
        await emitter.emit.apply(emitter, ["core-order-before-add-dish", ...arguments]);
        // TODO: when user add some dish to PAYMENT || ORDER cart state, need just make new cart clone 
        let dishObj;
        if (!addedBy)
            addedBy = "user";
        if (typeof dish === "string") {
            dishObj = (await Dish.find(dish).limit(1))[0];
            if (!dishObj) {
                throw { body: `Dish with id ${dish} not found`, code: 2 };
            }
        }
        else {
            dishObj = dish;
        }
        if (dishObj.balance !== -1)
            if (amount > dishObj.balance) {
                await emitter.emit.apply(emitter, ["core-order-add-dish-reject-amount", ...arguments]);
                throw {
                    body: `There is no so mush dishes with id ${dishObj.id}`,
                    code: 1,
                };
            }
        const order = await Order.findOne(criteria).populate("dishes");
        if (order.dishes.length > 99)
            throw "99 max dishes amount";
        if (order.state === "ORDER")
            throw "order with orderId " + order.id + "in state ORDER";
        if (modifiers && modifiers.length) {
            modifiers.forEach((m) => {
                if (m.amount === undefined)
                    m.amount = 1;
            });
        }
        await emitter.emit.apply(emitter, ["core-order-add-dish-before-create-orderdish", ...arguments]);
        /**
         * @setting: ONLY_CONCEPTS_DISHES - Prevents ordering from origin concept
         */
        const ONLY_CONCEPTS_DISHES = Settings.get('ONLY_CONCEPTS_DISHES');
        if (ONLY_CONCEPTS_DISHES && dishObj.concept === 'origin') {
            throw { body: `Dish ${dishObj.name} (${dishObj.id}) from [${dishObj.concept}] concept, but ONLY_CONCEPTS_DISHES setting is: ${ONLY_CONCEPTS_DISHES}`, code: 1 };
        }
        /**
        * @setting: CORE_SEPARATE_CONCEPTS_ORDERS - Prevents ordering in the same cart from different concepts
        */
        const SEPARATE_CONCEPTS_ORDERS = Settings.get('SEPARATE_CONCEPTS_ORDERS');
        if (SEPARATE_CONCEPTS_ORDERS && order.concept && order.concept !== dishObj.concept) {
            throw { body: `Dish ${dishObj.name} not in same concept as cart`, code: 1 };
        }
        else if (SEPARATE_CONCEPTS_ORDERS && order.dishes.length === 0) {
            await Order.update({ id: order.id }, { concept: dishObj.concept });
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
        if (replace) {
            orderDish = (await OrderDish.update({ id: orderDishId }, {
                dish: dishObj.id,
                order: order.id,
                amount: amount,
                modifiers: modifiers || [],
                comment: comment,
                addedBy: addedBy,
            }).fetch())[0];
        }
        else {
            orderDish = await OrderDish.create({
                dish: dishObj.id,
                order: order.id,
                amount: amount,
                modifiers: modifiers || [],
                comment: comment,
                addedBy: addedBy,
            }).fetch();
        }
        await emitter.emit.apply(emitter, ["core-order-after-add-dish", orderDish, ...arguments]);
        await Order.countCart(order);
        await Order.next(order.id, "CART");
    },
    //** Delete dish from order */
    async removeDish(criteria, dish, amount, stack) {
        // TODO: удалить стек
        await emitter.emit.apply(emitter, ["core-order-before-remove-dish", ...arguments]);
        const order = await Order.findOne(criteria).populate("dishes");
        if (order.state === "ORDER")
            throw "order with orderId " + order.id + "in state ORDER";
        var orderDish;
        if (stack) {
            amount = 1;
            orderDish = await OrderDish.findOne({
                where: { order: order.id, dish: dish.id },
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
            await emitter.emit.apply(emitter, ["core-order-remove-dish-reject-no-orderdish", ...arguments]);
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
        await emitter.emit.apply(emitter, ["core-order-after-remove-dish", ...arguments]);
        await Order.next(order.id, "CART");
        await Order.countCart(order);
    },
    async setCount(criteria, dish, amount) {
        await emitter.emit.apply(emitter, ["core-order-before-set-count", ...arguments]);
        if (dish.dish.balance !== -1)
            if (amount > dish.dish.balance) {
                await emitter.emit.apply(emitter, ["core-order-set-count-reject-amount", ...arguments]);
                throw {
                    body: `There is no so mush dishes with id ${dish.dish.id}`,
                    code: 1,
                };
            }
        const order = await Order.findOne(criteria).populate("dishes");
        if (order.state === "ORDER")
            throw "order with orderId " + order.id + "in state ORDER";
        const orderDishes = await OrderDish.find({ order: order.id }).populate("dish");
        const get = orderDishes.find((item) => item.id === dish.id);
        if (get) {
            get.amount = amount;
            if (get.amount > 0) {
                await OrderDish.update({ id: get.id }, { amount: get.amount }).fetch();
            }
            else {
                get.destroy();
                sails.log.info("destroy", get.id);
            }
            await Order.next(order.id, "CART");
            await Order.countCart(order);
            Order.update({ id: order.id }, order).fetch();
            await emitter.emit.apply(emitter, ["core-order-after-set-count", ...arguments]);
        }
        else {
            await emitter.emit.apply(emitter, ["core-order-set-count-reject-no-orderdish", ...arguments]);
            throw { body: `OrderDish dish id ${dish.id} not found`, code: 2 };
        }
    },
    async setComment(criteria, dish, comment) {
        await emitter.emit.apply(emitter, ["core-order-before-set-comment", ...arguments]);
        const order = await Order.findOne(criteria).populate("dishes");
        if (order.state === "ORDER")
            throw "order with orderId " + order.id + "in state ORDER";
        const orderDish = await OrderDish.findOne({
            order: order.id,
            id: dish.id,
        }).populate("dish");
        if (orderDish) {
            await OrderDish.update(orderDish.id, { comment: comment }).fetch();
            await Order.next(order.id, "CART");
            await Order.countCart(order);
            Order.update({ id: order.id }, order).fetch();
            await emitter.emit.apply(emitter, ["core-order-after-set-comment", ...arguments]);
        }
        else {
            await emitter.emit.apply(emitter, ["core-order-set-comment-reject-no-orderdish", ...arguments]);
            throw { body: `OrderDish with id ${dish.id} not found`, code: 1 };
        }
    },
    /**
     * Set order selfService field. Use this method to change selfService.
     * @param selfService
     */
    async setSelfService(criteria, selfService = true) {
        sails.log.verbose("Order > setSelfService >", selfService);
        const order = await Order.findOne(criteria);
        if (order.state === "ORDER")
            throw "order with orderId " + order.id + "in state ORDER";
        await actions_1.default.reset(order);
        return (await Order.update(criteria, { selfService: Boolean(selfService) }).fetch())[0];
    },
    ////////////////////////////////////////////////////////////////////////////////////
    async check(criteria, customer, isSelfService, address, paymentMethodId) {
        const order = await Order.countCart(criteria);
        if (order.state === "ORDER")
            throw "order with orderId " + order.id + "in state ORDER";
        //const order: Order = await Order.findOne(criteria);
        if (order.paid) {
            sails.log.error("CART > Check > error", order.id, "order is paid");
            throw {
                code: 12,
                error: "order is paid",
            };
        }
        /**
         *  // IDEA Возможно надо добавить параметр Время Жизни  для чека (Сделать глобально понятие ревизии системы int если оно меньше версии чека, то надо проходить чек заново)
         */
        getEmitter_1.default().emit("core-order-before-check", order, customer, isSelfService, address);
        sails.log.silly(`Order > check > before check > ${JSON.stringify(customer)} ${isSelfService} ${JSON.stringify(address)} ${paymentMethodId}`);
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
        await checkDate(order);
        if (paymentMethodId) {
            await checkPaymentMethod(paymentMethodId);
            order.paymentMethod = paymentMethodId;
            order.paymentMethodTitle = (await PaymentMethod.findOne(paymentMethodId)).title;
            order.isPaymentPromise = await PaymentMethod.isPaymentPromise(paymentMethodId);
        }
        /** Если самовывоз то не нужно проверять адресс */
        if (isSelfService) {
            getEmitter_1.default().emit("core-order-is-self-service", order, customer, isSelfService, address);
            await Order.setSelfService(order.id, true);
        }
        else {
            if (address) {
                checkAddress(address);
                order.address = { ...address };
            }
            else {
                if (!isSelfService && order.address === null) {
                    throw {
                        code: 5,
                        error: "address is required",
                    };
                }
            }
        }
        getEmitter_1.default().emit("core-order-check-delivery", order, customer, isSelfService, address);
        const results = await getEmitter_1.default().emit("core-order-check", order, customer, isSelfService, address, paymentMethodId);
        if (order.dishesCount === 0) {
            throw {
                code: 13,
                error: "order is empty",
            };
        }
        /** save after updates in emiter
         * есть сомнения что это тут нужно
        */
        delete (order.dishes);
        await Order.update({ id: order.id }, { ...order });
        sails.log.silly("Order > check > after wait general emitter", order, results);
        getEmitter_1.default().emit("core-order-after-check", order, customer, isSelfService, address);
        /** Чек может проходить без слушателей, потомучто минимально сам по себе чек
         *  имеет баовые проверки. И является самодостаточным, но
         * всеже по умолчанию установлено так что нужно пройти все проверки
         */
        const checkConfig = (await Settings.use("check"));
        if (checkConfig && checkConfig.notRequired) {
            if ((await Order.getState(order.id)) !== "CHECKOUT") {
                await Order.next(order.id, "CHECKOUT");
            }
            return;
        }
        /** Успех во всех слушателях по умолчанию */
        const resultsCount = results.length;
        const successCount = results.filter((r) => r.state === "success").length;
        let error;
        if (resultsCount !== successCount) {
            results.forEach(result => {
                if (result.state === 'error' && result.error) {
                    sails.log.error(`Order > core-order-check error: ${result.error}`);
                    sails.log.error(result);
                    error = result.error;
                }
            });
        }
        if (resultsCount === successCount) {
            if ((await Order.getState(order.id)) !== "CHECKOUT") {
                await Order.next(order.id, "CHECKOUT");
            }
            return;
        }
        else {
            throw {
                code: 0,
                error: `one or more results from core-order-check was not sucessed\n last error: ${error}`,
            };
        }
        /**
         * Тут поидее должна быть логика успех хотябы одного слушателя, но
         * на текущий момент практического применения не встречалось.
         *
         * if(checkConfig.justOne) ...
         */
    },
    ////////////////////////////////////////////////////////////////////////////////////
    /** Оформление корзины */
    async order(criteria) {
        const order = await Order.findOne(criteria);
        //  TODO: Реализовать через стейтфлоу
        if (order.state === "ORDER")
            throw "order with orderId " + order.id + "in state ORDER";
        if (order.state === "CART")
            throw "order with orderId " + order.id + "in state CART";
        // await Order.update({id: order.id}).fetch();
        // PTODO: проверка эта нужна
        // if(( order.isPaymentPromise && order.paid) || ( !order.isPaymentPromise && !order.paid) )
        //   return 3
        getEmitter_1.default().emit("core-order-before-order", order);
        sails.log.silly("Order > order > before order >", order.customer, order.selfService, order.address);
        if (order.selfService) {
            getEmitter_1.default().emit("core-order-order-self-service", order);
        }
        else {
            getEmitter_1.default().emit("core-order-order-delivery", order);
        }
        const results = await getEmitter_1.default().emit("core-order-order", order);
        sails.log.silly("Order > order > after wait general emitter results: ", results);
        const resultsCount = results.length;
        const successCount = results.filter((r) => r.state === "success").length;
        const orderConfig = await Settings.use("order");
        if (orderConfig) {
            if (orderConfig.requireAll) {
                if (resultsCount === successCount) {
                    await orderIt();
                    return;
                }
                else {
                    throw "по крайней мере один слушатель не выполнил заказ.";
                }
            }
            if (orderConfig.justOne) {
                if (successCount > 0) {
                    await orderIt();
                    return;
                }
                else {
                    throw "ни один слушатель не выполнил заказ";
                }
            }
            throw "Bad orderConfig";
        }
        await orderIt();
        return;
        async function orderIt() {
            // await Order.next(order.id,'ORDER');
            // TODO: переписать на stateFlow
            let data = {};
            data.orderDate = new Date();
            data.state = "ORDER";
            /** Если сохранние модели вызвать до next то будет бесконечный цикл */
            sails.log.verbose("Order > order > before save order", order);
            // await Order.update({id: order.id}).fetch();
            await Order.update({ id: order.id }, data).fetch();
            getEmitter_1.default().emit("core-order-after-order", order);
        }
    },
    async payment(criteria) {
        const order = await Order.findOne(criteria);
        if (order.state !== "CHECKOUT")
            throw "order with orderId " + order.id + "in state ${order.state} but need CHECKOUT";
        var paymentResponse;
        let comment = "";
        var backLinkSuccess = (await Settings.use("FrontendOrderPage")) + order.shortId;
        var backLinkFail = await Settings.use("FrontendCheckoutPage");
        let paymentMethodId = await order.paymentMethod;
        sails.log.verbose("Order > payment > before payment register", order);
        var params = {
            backLinkSuccess: backLinkSuccess,
            backLinkFail: backLinkFail,
            comment: comment,
        };
        await Order.countCart(order);
        await getEmitter_1.default().emit("core-order-payment", order, params);
        sails.log.info("Order > payment > order before register:", order);
        try {
            paymentResponse = await PaymentDocument.register(order.id, "order", order.total, paymentMethodId, params.backLinkSuccess, params.backLinkFail, params.comment, order);
        }
        catch (e) {
            getEmitter_1.default().emit("error", "order>payment", e);
            sails.log.error("Order > payment: ", e);
        }
        await Order.next(order.id, "PAYMENT");
        return paymentResponse;
    },
    async paymentMethodId(criteria) {
        let populatedOrder = (await Order.find(criteria).populate("paymentMethod"))[0];
        let paymentMethod = populatedOrder.paymentMethod;
        return paymentMethod.id;
    },
    /**  given populated Order instance  by criteria*/
    async populate(criteria) {
        let order = await Order.findOne(criteria);
        if (!order)
            throw `order by criteria: ${criteria},  not found`;
        let fullOrder;
        try {
            fullOrder = await Order.findOne({ id: order.id })
                .populate("dishes")
                .populate("deliveryItem")
                .populate('paymentMethod');
            const orderDishes = await OrderDish.find({ order: order.id }).populate("dish").sort("createdAt");
            for (let orderDish of orderDishes) {
                if (!orderDish.dish) {
                    sails.log.error("orderDish", orderDish.id, "has not dish");
                    continue;
                }
                if (!fullOrder.dishes.filter((d) => d.id === orderDish.id).length) {
                    sails.log.error("orderDish", orderDish.id, "not exists in order", order.id);
                    continue;
                }
                const dish = await Dish.findOne({
                    id: orderDish.dish.id,
                })
                    .populate("images")
                    .populate("parentGroup");
                await Dish.getDishModifiers(dish);
                orderDish.dish = dish;
                if (orderDish.modifiers !== undefined && Array.isArray(orderDish.modifiers)) {
                    for await (let modifier of orderDish.modifiers) {
                        modifier.dish = (await Dish.find(modifier.id).limit(1))[0];
                    }
                }
                else {
                    throw `orderDish.modifiers not iterable orderDish: ${JSON.stringify(orderDish.modifiers, undefined, 2)}`;
                }
            }
            fullOrder.dishes = orderDishes;
            fullOrder.orderDateLimit = await getOrderDateLimit();
            fullOrder.orderId = fullOrder.id;
        }
        catch (e) {
            sails.log.error("CART > fullOrder error", e);
        }
        return { ...fullOrder };
    },
    /**
     * Считает количество, вес и прочие данные о корзине в зависимости от полоенных блюд
     * Подсчет должен происходить только до перехода на чекаут
     * @param order
     */
    async countCart(criteria) {
        try {
            let order;
            if (typeof criteria === "string" || criteria instanceof String) {
                order = await Order.findOne(criteria);
            }
            else {
                order = await Order.findOne(criteria.id);
            }
            getEmitter_1.default().emit("core-order-before-count", order);
            if (!["CART", "CHECKOUT"].includes(order.state))
                throw `Order with orderId ${order.id} - not can calculated from current state: (${order.state})`;
            const orderDishes = await OrderDish.find({ order: order.id }).populate("dish");
            // const orderDishesClone = {};
            // order.dishes.map(cd => orderDishesClone[cd.id] = _.cloneDeep(cd));
            let orderTotal = 0;
            let dishesCount = 0;
            let uniqueDishes = 0;
            let totalWeight = 0;
            for await (let orderDish of orderDishes) {
                try {
                    if (orderDish.dish) {
                        const dish = (await Dish.find(orderDish.dish.id).limit(1))[0];
                        // Проверяет что блюдо доступно к продаже
                        if (!dish) {
                            sails.log.error("Dish with id " + orderDish.dish.id + " not found!");
                            getEmitter_1.default().emit("core-order-return-full-order-destroy-orderdish", dish, order);
                            await OrderDish.destroy({ id: orderDish.dish.id });
                            continue;
                        }
                        if (dish.balance === -1 ? false : dish.balance < orderDish.amount) {
                            orderDish.amount = dish.balance;
                            // Нужно удалять если количество 0
                            if (orderDish.amount >= 0) {
                                await Order.removeDish(order.id, orderDish, 999999);
                            }
                            getEmitter_1.default().emit("core-orderdish-change-amount", orderDish);
                            sails.log.debug(`Order with id ${order.id} and  CardDish with id ${orderDish.id} amount was changed!`);
                        }
                        orderDish.uniqueItems = 1; // deprecated
                        orderDish.itemTotal = 0;
                        orderDish.weight = orderDish.dish.weight;
                        orderDish.totalWeight = 0;
                        // orderDish.dishId = dish.id
                        if (orderDish.modifiers && Array.isArray(orderDish.modifiers)) {
                            for (let modifier of orderDish.modifiers) {
                                const modifierObj = (await Dish.find(modifier.id).limit(1))[0];
                                if (!modifierObj) {
                                    sails.log.error("Dish with id " + modifier.id + " not found!");
                                    continue;
                                }
                                let opts = {};
                                await getEmitter_1.default().emit("core-order-countcart-before-calc-modifier", modifier, modifierObj, opts);
                                // const modifierCopy = {
                                //   amount: modifier.amount,
                                //   id: modifier.id
                                // }
                                // await getEmitter().emit('core-order-countcart-before-calc-modifier', modifierCopy, modifierObj);
                                orderDish.uniqueItems++;
                                /** // TODO:
                                 * Initial modification checking logic, now it's ugly.
                                 * Needed review architecture modifiers to keep it in model.
                                 * Also all checks modifiers need process in current loop thread. Currently we not have access to modifer options
                                 * Here by opts we can pass options for modifiers
                                 */
                                orderDish.itemTotal += modifier.amount * modifierObj.price;
                                // FreeAmount modiefires support
                                if (opts.freeAmount && typeof opts.freeAmount === "number") {
                                    if (opts.freeAmount < modifier.amount) {
                                        orderDish.itemTotal -= opts.freeAmount * modifierObj.price;
                                    }
                                    else {
                                        orderDish.itemTotal -= modifier.amount * modifierObj.price;
                                    }
                                }
                                if (!Number(orderDish.itemTotal))
                                    throw `orderDish.itemTotal is NaN ${JSON.stringify(modifier)}.`;
                                orderDish.weight += modifierObj.weight;
                            }
                        }
                        else {
                            throw `orderDish.modifiers not iterable dish: ${JSON.stringify(orderDish.modifiers, undefined, 2)} <<`;
                        }
                        orderDish.totalWeight = orderDish.weight * orderDish.amount;
                        orderDish.itemTotal += orderDish.dish.price;
                        orderDish.itemTotal *= orderDish.amount;
                        orderDish.dish = orderDish.dish.id;
                        await OrderDish.update({ id: orderDish.id }, orderDish).fetch();
                        orderDish.dish = dish;
                    }
                    orderTotal += orderDish.itemTotal;
                    dishesCount += orderDish.amount;
                    uniqueDishes++;
                    totalWeight += orderDish.totalWeight;
                }
                catch (e) {
                    sails.log.error("Order > count > iterate orderDish error", e);
                }
            } // for orderDish
            // Discount calc
            /**
             * TODO: здесь точка входа для расчета дискаунтов, т.к. они не должны конкурировать, нужно написать адаптером.
             * Скидки должны быть массивом, и они должны хранится в каждом блюде OrderDish чтобы при выключении скидки не исчезали скидки на Ордере
             */
            order.dishes = orderDishes;
            await getEmitter_1.default().emit("core-order-count-discount-apply", order);
            delete (order.dishes);
            ///////////////////////////////////
            /**
             * Карт тотал это чистая стоимость корзины
             */
            order.dishesCount = dishesCount;
            order.uniqueDishes = uniqueDishes;
            order.totalWeight = totalWeight;
            order.orderTotal = orderTotal;
            getEmitter_1.default().emit("core:count-before-delivery-cost", order);
            // @deprecated orderTotal use orderCost
            order.total = orderTotal + order.deliveryCost - order.discountTotal;
            order = (await Order.update({ id: order.id }, order).fetch())[0];
            getEmitter_1.default().emit("core-order-after-count", order);
            return order;
        }
        catch (error) {
            console.log(" error >", error);
        }
    },
    async doPaid(criteria, paymentDocument) {
        let order = await Order.findOne(criteria);
        if (order.paid) {
            sails.log.info(`Order > doPaid: Order with id ${order.id} is paid`);
            return;
        }
        try {
            let paymentMethodTitle = (await PaymentMethod.findOne(paymentDocument.paymentMethod)).title;
            await Order.update({ id: paymentDocument.paymentId }, {
                paid: true,
                paymentMethod: paymentDocument.paymentMethod,
                paymentMethodTitle: paymentMethodTitle,
            }).fetch();
            sails.log.info("Order > doPaid: ", order.id, order.state, order.total, paymentDocument.amount);
            if (order.state !== "PAYMENT") {
                sails.log.error("Order > doPaid: is strange order state is not PAYMENT", order);
            }
            if (order.total !== paymentDocument.amount) {
                order.problem = true;
                order.comment = order.comment + " !!! ВНИМАНИЕ, состав заказа был изменен, на счет в банке поступило :" + paymentDocument.amount;
            }
            await Order.order(order.id);
            getEmitter_1.default().emit("core-order-after-dopaid", order);
        }
        catch (e) {
            sails.log.error("Order > doPaid error: ", e);
            throw e;
        }
    },
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
    try {
        const nameRegex = await Settings.use("nameRegex");
        const phoneRegex = await Settings.use("phoneRegex");
        if (nameRegex) {
            if (!nameRegex.match(customer.name)) {
                throw {
                    code: 3,
                    error: "customer.name is invalid",
                };
            }
        }
        if (phoneRegex) {
            if (!phoneRegex.match(customer.phone)) {
                throw {
                    code: 4,
                    error: "customer.phone is invalid",
                };
            }
        }
    }
    catch (error) {
        sails.log.warn("CART > check user info regex: ", error);
    }
}
function checkAddress(address) {
    if (!address.street) {
        throw {
            code: 5,
            error: "address.street  is required",
        };
    }
    if (!address.home) {
        throw {
            code: 6,
            error: "address.home is required",
        };
    }
    if (!address.city) {
        throw {
            code: 7,
            error: "address.city is required",
        };
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
        if (date instanceof Date === true && !date.toJSON()) {
            throw {
                code: 9,
                error: "date is not valid",
            };
        }
        const possibleDatetime = await getOrderDateLimit();
        if (date.getTime() > possibleDatetime.getTime()) {
            sails.log.error(`Order checkDate: ${date.getTime()} > ${possibleDatetime.getTime()} = ${date.getTime() > possibleDatetime.getTime()}`);
            throw {
                code: 10,
                error: "delivery far, far away! allowed not after" + possibleDatetime,
            };
        }
    }
}
/**
 * Return Date in future
 * default 1 day
 */
// TODO: refactor periodPossibleForOrder from seconds to full work days
async function getOrderDateLimit() {
    let date = new Date();
    let periodPossibleForOrder = await Settings.use("PeriodPossibleForOrder"); //minutes
    if (!periodPossibleForOrder)
        periodPossibleForOrder = 1440;
    date.setSeconds(date.getSeconds() + (parseInt(periodPossibleForOrder) * 60));
    return date;
}
