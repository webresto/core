import Dish from "../../models/Dish"
import { mock } from 'intermock';
import { readdir } from 'fs';
import { promisify } from 'util';
const listFiles = promisify(readdir);
const uuid = require('uuid/v4');
export default function generate(): Dish{

  mock({
    output: 'object',
    files: this.fileData,
    isFixedMode: true,
    interfaces: this.interfaces,
  });

  return {
    total: Math.floor(Math.random() * 9999) + 1000,
    id: uuid(),
    isCartPayment: true,
    paymentAdapter: "TestPaymentSystem",
    originModel: "Cart",
    data: "testing",
    comment: "testing"
    
  }
}