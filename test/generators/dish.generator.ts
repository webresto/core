import * as faker from 'faker';

import Dish from "../../models/Dish"


var autoincrement: number = 0;
export default function dishGenerator(config: Dish = {
  name: undefined,
  price: undefined
}): Dish{
  autoincrement++;
  // if (config.modifiers && config.modifiers.length) {
  //   config.modifiers.forEach(modifier => {
  //     if (!modifier.childModifiers) {
  //       let _modifier: any = {} 
  //       _modifier.childModifiers = { ... modifier }
  //       modifier = _modifier
  //     }
  //   });
  // }
  return {
    id: config.id || faker.random.uuid(),
    additionalInfo: config.additionalInfo || "null",
    balance:  config.balance || -1,
    modifiers: config.modifiers || [],
    parentGroup: config.parentGroup || null,
    weight: 100,
    price: config.price === undefined ? faker.random.number(500) : config.price,
    sortOrder: autoincrement,
    images: config.images || [],
    name: faker.commerce.productName(),
    description: faker.random.words(25),
    rmsId: 'none',
    code: null,
    tags: [],
    isDeleted: config.isDeleted || false
  }
}

export let dishFields = [
  'id',
  'additionalInfo',
  'balance',
  'modifiers',
  'weight',
  'price',
  'order',
  'images',
  'name',
  'description',
  'rmsId',
  'code',
  'tags',
  'isDeleted'
];

