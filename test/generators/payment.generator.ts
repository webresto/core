import {Payment} from "../../modelsHelp/Payment"
const uuid = require('uuid/v4');
export default function generate_payment(): Payment{
  return {
    amount: Math.floor(Math.random() * 9999) + 1000,
    paymentId: uuid(),
    paymentMethod: "TestPaymentSystem",
    originModel: "Cart",
    comment: "testing"
  }
}