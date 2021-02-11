import { expect } from "chai";
import getEmitter from "../../../lib/getEmitter";
import TestPaymentSystem from '../external_payments/ExternalTestPaymentSystem';

describe('PaymentDocument', function(){
    it('doPaid TODO', async function(){
        getEmitter().on('core-payment-document-paid', function(){
        });
    })
    it('doCheck TODO', async function(){
        getEmitter().on('core-payment-document-check', function(){
        });
        getEmitter().on('core-payment-document-checked-document', function(){
        });
    })
    it('register TODO', async function(){
        //static
        const result = await TestPaymentSystem.getInstance();
        // register( cart.id, 'cart', 1000, paymentMethodId: string,  'example.com', 'fail.com', 'test comment', 'data')
    })
    it('status TODO', async function(){
        //static
    })
    it('processor TODO', async function(){
        //static
    })
    it('afterUpdate(sails) TODO', async function(){

    })
})