"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const getEmitter_1 = require("../../../lib/getEmitter");
const ExternalTestPaymentSystem_1 = require("../external_payments/ExternalTestPaymentSystem");
describe('Cart.check()', function () {
    this.timeout(10000);
    let cart;
    let customer = {
        phone: '+79998881212',
        name: 'Freeman Morgan'
    };
    let address = {
        streetId: 'sdfsf',
        city: 'New York',
        street: 'Green Road',
        home: 77,
        comment: ''
    };
    it('new cart', async function () {
        cart = await Cart.create({});
        // console.log('>>> Blank cart ------\n', cart);
    });
    describe('check Customer', function () {
        // let cart: Cart;
        // it('init', async function(){
        //     cart = await Cart.create({});
        // });
        it('good customer', async function () {
            cart = await Cart.create({});
            let customer = {
                phone: '+79998881212',
                name: 'Freeman Morgan'
            };
            let result = await cart.check(customer, true);
            chai_1.expect(result).to.equal(true);
        });
        it('bad customer', async function () {
            // @ts-ignore
            let badCustomer = {
                name: "Bad Man"
            };
            let error = null;
            try {
                await cart.check(badCustomer);
            }
            catch (e) {
                error = e;
            }
            // expect(error).to.be.an('object');
            chai_1.expect(error.code).to.equal(2);
            chai_1.expect(error.error).to.be.an('string');
            // @ts-ignore
            badCustomer = {
                phone: "+79998882244"
            };
            error = null;
            try {
                await cart.check(badCustomer);
            }
            catch (e) {
                error = e;
            }
            chai_1.expect(error.code).to.equal(1);
            chai_1.expect(error.error).to.be.an('string');
        });
        it('no customer throw', async function () {
            cart.customer = null;
            await cart.save();
            let error = null;
            try {
                await cart.check();
            }
            catch (e) {
                error = e;
            }
            chai_1.expect(error.code).to.equal(2);
            chai_1.expect(error.error).to.be.an('string');
        });
    });
    it('check isSelfService', async function () {
        await cart.setSelfService(true);
        let result = await cart.check(customer, true);
        chai_1.expect(result).to.equal(true);
    });
    describe('check Address', function () {
        it('good address', async function () {
            cart = await Cart.create({});
            let address = {
                streetId: 'sdfsf',
                city: 'New York',
                street: 'Green Road',
                home: 77,
                comment: ''
            };
            let result = await cart.check(customer, null, address);
            chai_1.expect(result).to.equal(true);
        });
        it('bad address', async function () {
            // @ts-ignore
            let badAddress = {
                city: 'New York',
                // street: 'Green Road',
                home: 77,
                comment: ''
            };
            let error = null;
            try {
                await cart.check(null, null, badAddress);
            }
            catch (e) {
                error = e;
            }
            chai_1.expect(error.code).to.equal(5);
            chai_1.expect(error.error).to.be.an('string');
        });
        it('no address throw', async function () {
            cart.customer = null;
            await cart.save();
            let error = null;
            try {
                await cart.check(null, true);
            }
            catch (e) {
                error = e;
            }
            chai_1.expect(error.code).to.equal(2);
            chai_1.expect(error.error).to.be.an('string');
        });
    });
    it('check paymentSystem', async function () {
        // let cust
        // getEmitter().on('core-cart-before-check', (cart, customer2, isSelfService, address)=>{
        //   cust = customer2;
        // });
        // expect(cust).to.equal(customer);
        let customer = {
            phone: '+79998881212',
            name: 'Freeman Morgan'
        };
        let address = {
            streetId: 'sdfsf',
            city: 'New York',
            street: 'Green Road',
            home: 77,
            comment: ''
        };
        let testPaymentSystem = await ExternalTestPaymentSystem_1.default.getInstance();
        let paymentSystem = (await PaymentMethod.find())[0];
        let result = await cart.check(customer, false, address, paymentSystem.id);
        chai_1.expect(result).to.equal(true);
        result = await cart.check(null, null, null, paymentSystem.id);
        chai_1.expect(result).to.equal(true);
        let error = null;
        try {
            await cart.check(null, null, null, 'bad-id-payment-system');
        }
        catch (e) {
            error = e;
        }
        chai_1.expect(error.code).to.equal(8);
        chai_1.expect(error.error).to.be.an('string');
    });
    it('getEmitter test', async function () {
        let count1 = 0;
        let count3 = 0;
        let count4 = 0;
        let count5 = 0;
        getEmitter_1.default().on('core-cart-before-check', function () {
            count1++;
        });
        getEmitter_1.default().on('core-cart-check-delivery', function () {
            count3++;
        });
        getEmitter_1.default().on('core-cart-check', function () {
            count4++;
        });
        getEmitter_1.default().on('core-cart-after-check', function () {
            count5++;
        });
        await cart.check(customer);
        chai_1.expect(count1).to.equal(1);
        chai_1.expect(count3).to.equal(1);
        chai_1.expect(count4).to.equal(1);
        chai_1.expect(count5).to.equal(1);
        let count2 = 0;
        let emitCustomer;
        let emitSelfService;
        let emitAddress;
        getEmitter_1.default().on('core-cart-check-self-service', function (self, cust, serv, addr) {
            count2++;
            emitCustomer = cust;
            emitSelfService = serv;
            emitAddress = addr;
        });
        await cart.check(customer, true, address);
        chai_1.expect(count2).to.equal(1);
        chai_1.expect(emitCustomer).to.equal(customer);
        chai_1.expect(emitSelfService).to.equal(true);
        chai_1.expect(emitAddress).to.equal(address);
    });
    it('throw if state ORDER', async function () {
        await cart.next('ORDER');
        let error = null;
        try {
            await cart.check(customer);
        }
        catch (e) {
            error = e;
        }
        chai_1.expect(error).to.not.equal(null);
    });
    it('checkConfig', async function () {
        cart = await Cart.create({});
        await SystemInfo.set('check', JSON.stringify({ requireAll: true }));
        let result = await cart.check(customer, true);
        chai_1.expect(result).to.equal(true);
        await SystemInfo.set('check', JSON.stringify({ notRequired: true }));
        result = await cart.check(customer, true);
        chai_1.expect(result).to.equal(true);
    });
});
