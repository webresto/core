import faker from "faker";
import { DishRecord } from "../../models/Dish";

// todo: fix types model instance to {%ModelName%}Record for Dish";

var autoincrement: number = 0;

// config?: Partial<Dish>
export default function dishGenerator(
  config: DishRecord = {
    name: undefined,
    price: undefined,
    concept: undefined,
  }
): DishRecord {
  autoincrement++;
  return {
    id: config?.id || faker.random.uuid(),
    additionalInfo: config?.additionalInfo || "null",
    balance:  config?.balance || -1,
    modifiers: config?.modifiers || [],
    parentGroup: config?.parentGroup || null,
    weight: 100,
    price: config?.price === undefined ? faker.random.number(500) : config.price,
    concept: config.concept,
    sortOrder: autoincrement,
    images: config?.images || [],
    name: config?.name || `${faker.commerce.productAdjective()} ${faker.commerce.productMaterial()} ${Date.now()}`,
    description: faker.random.words(25),
    rmsId: config?.rmsId || faker.random.uuid(),
    code: null,
    tags: [],
    isDeleted: config?.isDeleted || false
  }
}

export let dishFields = ["id", "additionalInfo", "balance", "modifiers", "weight", "price", "order", "images", "name", "description", "rmsId", "code", "tags", "isDeleted"];
