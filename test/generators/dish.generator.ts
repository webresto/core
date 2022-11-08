import * as faker from 'faker';

//import Dish from "../../models/Dish"


var autoincrement: number = 0;
interface DishData  {
  id? : string;
  additionalInfo?: string;
  balance?: number;
  modifiers?: any[];
  parentGroup?: string;
  weight?: number;
  price?: number;
  images?: string[];
  order?: number;
  name?: string;
  composition?: string;
  rmsId?: string;
  code?: string;
  tags?: {name: string}[];
  isDeleted?: boolean;
}

export default function dishGenerator(config: DishData = {}): DishData{
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
    price: config.price || faker.random.number(500),
    order: autoincrement,
    images: config.images || [],
    name: faker.commerce.productName(),
    composition: faker.random.words(25),
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
  'composition',
  'rmsId',
  'code',
  'tags',
  'isDeleted'
];

