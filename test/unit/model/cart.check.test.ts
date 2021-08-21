import { expect } from "chai";
import getEmitter from "../../../lib/getEmitter";
import Cart from "../../../models/Cart";
import Dish from "../../../models/Dish";
import Address from "../../../interfaces/Address";
import Customer from "../../../interfaces/Customer";
import TestPaymentSystem from '../external_payments/ExternalTestPaymentSystem';
import SystemInfo from '../../../models/SystemInfo';

describe('Cart.check()', function(){
    this.timeout(10000);
    let cart: Cart;
    let customer: Customer = {
        phone: '+79998881212',
        name: 'Freeman Morgan'
    };
    let address: Address = {
        streetId: 'sdfsf',
        city: 'New York',
        street: 'Green Road',
        home: "42",
        comment: ''
    }

    it('new cart', async function(){
        cart = await Cart.create({});
        // console.log('>>> Blank cart ------\n', cart);
    });
    

    
    describe('check Customer', function(){
        // let cart: Cart;
        // it('init', async function(){
        //     cart = await Cart.create({});
        // });
        it('good customer', async function(){
            cart = await Cart.create({});
            let customer: Customer = {
                phone: '+79998881212',
                name: 'Freeman Morgan'
            }
    
            let result = await cart.check(customer, true);
        
            expect(result).to.equal(true);
        });
        it('bad customer', async function(){
            // @ts-ignore
            let badCustomer: Customer = {
                name: "Bad Man"
            }
        
            let error = null;
            try{
                await cart.check(badCustomer);
            }catch(e){
                error = e;
            }
            // expect(error).to.be.an('object');
            expect(error.code).to.equal(2);
            expect(error.error).to.be.an('string');

            // @ts-ignore
            badCustomer = {
                phone: "+79998882244"
            }
            error = null;
            try{
                await cart.check(badCustomer);
            }catch(e){
                error = e;
            }
            expect(error.code).to.equal(1);
            expect(error.error).to.be.an('string');
        });
        it('no customer throw', async function(){
            cart.customer = null;
            await cart.save();
            let error = null;
            try{
                await cart.check();
            }catch(e){
                error = e;
            }
            
            expect(error.code).to.equal(2);
            expect(error.error).to.be.an('string');
        })
    });
    it('check isSelfService', async function(){
        await cart.setSelfService(true);
        let result = await cart.check(customer, true);
        expect(result).to.equal(true);

    });

    describe('check Address', function(){
        it('good address', async function(){
            cart = await Cart.create({});
            let address: Address = {
                streetId: 'sdfsf',
                city: 'New York',
                street: 'Green Road',
                home: "42",
                comment: ''
            }
                       
            let result = await cart.check(customer, null, address);
            expect(result).to.equal(true);
        });
        it('bad address', async function(){
            // @ts-ignore
            let badAddress: Address = {
                city: 'New York',
                // street: 'Green Road',
                home: "42",
                comment: ''
            }     

            let error = null;
            try{
                await cart.check(null, null, badAddress);
            }catch(e){
                error = e;
            }
            expect(error.code).to.equal(5);
            expect(error.error).to.be.an('string');
        });
        it('no address throw', async function(){
            cart.customer = null;
            await cart.save();
            let error = null;
            try{
                await cart.check(null, true);
            }catch(e){
                error = e;
            }
            
            expect(error.code).to.equal(2);
            expect(error.error).to.be.an('string');
        });
    });
    
    it('check paymentSystem', async function(){
        // let cust
        // getEmitter().on('core-cart-before-check', (cart, customer2, isSelfService, address)=>{
        //   cust = customer2;
        // });
    
        // expect(cust).to.equal(customer);
        
    
        let customer: Customer = {
          phone: '+79998881212',
          name: 'Freeman Morgan'
        }
        let address: Address = {
          streetId: 'sdfsf',
          city: 'New York',
          street: 'Green Road',
          home: "42",
          comment: ''
        }
            
        let testPaymentSystem = await TestPaymentSystem.getInstance();
        let paymentSystem = (await PaymentMethod.find())[0];
        let result = await cart.check(customer, false, address, paymentSystem.id);
        expect(result).to.equal(true);
    
        result = await cart.check(null, null, null, paymentSystem.id);
        expect(result).to.equal(true);

        let error = null;
        try{
            await cart.check(null, null, null, 'bad-id-payment-system');
        }catch(e){
            error = e;
        }
        expect(error.code).to.equal(8);
        expect(error.error).to.be.an('string');
            
    });

    it('getEmitter test', async function(){
        let count1 = 0;
        let count3 = 0;
        let count4 = 0;
        let count5 = 0;

        getEmitter().on('core-cart-before-check', function(){
            count1++;
        });
        getEmitter().on('core-cart-check-delivery', function(){
            count3++;
        });
        getEmitter().on('core-cart-check', function(){
            count4++;
        });
        getEmitter().on('core-cart-after-check', function(){
            count5++;
        });
        await cart.check(customer);
        expect(count1).to.equal(1);
        expect(count3).to.equal(1);
        expect(count4).to.equal(1);
        expect(count5).to.equal(1);

        let count2 = 0;
        let emitCustomer;
        let emitSelfService;
        let emitAddress;
        getEmitter().on('core-cart-check-self-service', function(self, cust, serv, addr){
            count2++;
            emitCustomer = cust;
            emitSelfService = serv;
            emitAddress = addr;
        });
        await cart.check(customer, true, address);
        expect(count2).to.equal(1);
        expect(emitCustomer).to.equal(customer);
        expect(emitSelfService).to.equal(true);
        expect(emitAddress).to.equal(address);
       
    });

    it('throw if state ORDER', async function(){
        await cart.next('ORDER');
        let error = null;
        try{
            await cart.check(customer);
        }catch(e){
            error = e;
        }
        expect(error).to.not.equal(null);
    });
    it('checkConfig', async function(){
        cart = await Cart.create({});
        await SystemInfo.set('check', JSON.stringify({requireAll: true}));
        let result = await cart.check(customer, true);
        expect(result).to.equal(true);

        await SystemInfo.set('check', JSON.stringify({notRequired: true}));
        result = await cart.check(customer, true);
        expect(result).to.equal(true);
    })
});