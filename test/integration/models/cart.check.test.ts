import { expect } from "chai";
import { getEmitter } from "../../../libs/AwaitEmitter";
import Cart from "../../../models/Cart"
import Address from "../../../interfaces/Address";
import Customer from "../../../interfaces/Customer";
// import TestPaymentSystem from '../../unit/external_payments/ExternalTestPaymentSystem';
// import Settings from '../../../models/Settings'
// import { settings } from "cluster";

describe('Cart.check ()', function(){
    this.timeout(10000);
    var cart: Cart;

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
        cart = await Cart.create({}).fetch();
        if (!cart) throw "Cart not created"
    });

    
    it('check isSelfService', async function(){
        try {
            await Cart.setSelfService(cart.id,  true);
            let result: Cart = await Cart.findOne(cart.id);
            expect(result.selfService).to.equal(true);            
        } catch (error) {
            throw error
        }
    });

    
    describe('check Customer', function(){
        
        // let cart: Cart;
        // it('init', async function(){
        //     cart = await Cart.create({});
        // });

        it('good customer', async function(){
            cart = await Cart.create({}).fetch();
            
            let customer: Customer = {
                phone: '+79998881212',
                name: 'Freeman Morgan'
            }
    
            let result = await Cart.check(cart.id,  customer, true);
        
            expect(result).to.equal(true);
        });
        it('bad customer', async function(){
            // @ts-ignore
            let badCustomer: Customer = {
                name: "Bad Man"
            }
        
            let error = null;
            try{
                await Cart.check(cart.id,  badCustomer);
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
                await Cart.check(cart.id,  badCustomer);
            }catch(e){
                error = e;
            }
            expect(error.code).to.equal(1);
            expect(error.error).to.be.an('string');
        });
        it('no customer throw', async function(){
            cart.customer = null;
            await Cart.update({id: cart.id}, cart).fetch();
            let error = null;
            try{
                await Cart.check ();
            }catch(e){
                error = e;
            }
            
            expect(error.code).to.equal(2);
            expect(error.error).to.be.an('string');
        })
    });

    describe('check Address', function(){
        it('good address', async function(){
            cart = await Cart.create({}).fetch();
            let address: Address = {
                streetId: 'sdfsf',
                city: 'New York',
                street: 'Green Road',
                home: "42",
                comment: ''
            }
                       
            let result = await Cart.check(cart.id,  customer, null, address);
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
                await Cart.check(cart.id,  null, null, badAddress);
            }catch(e){
                error = e;
            }
            expect(error.code).to.equal(5);
            expect(error.error).to.be.an('string');
        });
        it('no address throw', async function(){
            cart.customer = null;
            await Cart.update({id: cart.id}, cart).fetch();
            let error = null;
            try{
                await Cart.check(cart.id,  null, true);
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
    

        try {
            let paymentSystem = (await PaymentMethod.find())[0];
            let result = await Cart.check(cart.id,  customer, false, address, paymentSystem.id);            
            await Cart.check(cart.id,  null, null, null, paymentSystem.id);
            
            let error = null;
            try{
                await Cart.check(cart.id,  null, null, null, 'bad-id-payment-system');
            }catch(e){
                error = e;
            }
            expect(error.code).to.equal(8);
            expect(error.error).to.be.an('string'); 
        } catch (error) {
            throw error    
        }
    });

    it('awaitEmiter cart events', async function(){

        await Settings.set("check", {notRequired: true})

        let count1 = 0;
        let count3 = 2;
        let count4 = 3;
        let count5 = 4;
        getEmitter().on('core-cart-before-check', function(){
            console.log("!!!!!!!!!!!!!!!!1");
            count1++;
        });
        getEmitter().on('core-cart-check-delivery', function(){
            console.log("!!!!!!!!!!!!!!!!2");
            count3++;
        });
        getEmitter().on('core-cart-check', function(){
            count4++;
        });
        getEmitter().on('core-cart-after-check', function(){
            count5++;
        });
        await Cart.check(cart.id,  customer);

        expect(count1).to.equal(1);
        expect(count3).to.equal(3);
        expect(count4).to.equal(4);
        expect(count5).to.equal(5);

        let count2 = 1;
        let emitCustomer;
        let emitSelfService;
        let emitAddress;

        getEmitter().on('core-cart-check-self-service', function(self, cust, serv, addr){
            count2++;
            emitCustomer = cust;
            emitSelfService = serv;
            emitAddress = addr;
        });
        
        await Cart.check(cart.id,  customer, true, address);
        expect(count2).to.equal(2);
        expect(emitCustomer).to.equal(customer);
        expect(emitSelfService).to.equal(true);
        expect(emitAddress).to.equal(address);
       
    });

    it('throw if state ORDER', async function(){
        await Cart.next(cart.id, 'ORDER');
        let error = null;
        try{
            await Cart.check(cart.id,  customer);
        }catch(e){
            error = e;
        }
        expect(error).to.not.equal(null);
    });
    it('checkConfig', async function(){
        cart = await Cart.create({}).fetch();
        await Settings.set('check', JSON.stringify({requireAll: true}));
        let result = await Cart.check(cart.id,  customer, true);
        expect(result).to.equal(true);

        await Settings.set('check', JSON.stringify({notRequired: true}));
        result = await Cart.check(cart.id,  customer, true);
        expect(result).to.equal(true);
    })
});