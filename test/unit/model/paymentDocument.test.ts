import { expect } from "chai";
import getEmitter from "../../../lib/getEmitter";
import TestPaymentSystem from '../external_payments/ExternalTestPaymentSystem';

describe('PaymentDocument', function(){
    it('register TODO', async function(){
        //static
        // Проверка суммы. Проверка originModel. Проверка платежного метода. Проверить paymentResponse, сравнить.
    })
    it('doPaid TODO', async function(){
        getEmitter().on('core-payment-document-paid', function(){
        });
        // создать документ с status = "PAID" и paid !== true . Проверить сохраниение документа, проверить вызов эмита
    })
    it('doCheck TODO', async function(){
        getEmitter().on('core-payment-document-check', function(){
        });
        getEmitter().on('core-payment-document-checked-document', function(){
        });
        // создать платежный документ для тестировочной платежной системы. Провести оплату в тестовой платежной системе. Выполнить doCheck. Проверить результат всех вариантов событий (не проведенная оплата, проведенная оплата)
    })
    it('processor TODO', async function(){
        //static
        // Симулировать что тестовая платежная система не ответила(не дала результат поп платежу). 
        //TODO: добавить тестировочный флаг что бы игнорировать setInterval
    })
    it('afterUpdate(sails) TODO', async function(){
        // Создать корзину. В корзине выбрать платежный метод (тестовая система). Поставить оплату и проверить что в корзине status === 'PAID'
    })
})