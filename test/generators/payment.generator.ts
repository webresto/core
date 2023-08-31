import { Payment } from "../../interfaces/Payment";
const { v4: uuid } = require("uuid");

export default function generate_payment(): Payment {
  return {
    amount: Math.floor(Math.random() * 9999) + 1000,
    originModelId: uuid(),
    paymentMethod: "TestPaymentSystem",
    originModel: "Order",
    comment: "testing",
  };
}
