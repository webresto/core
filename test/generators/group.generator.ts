import * as faker from "faker";

import Group from "../../models/Group"

var autoincrement: number = 0;

export default function groupGenerator(config: Group = {}): Group {
  autoincrement++;
  return {
    id: faker.random.uuid(),
    additionalInfo: config.additionalInfo || null,
    code: config.code || null,
    description: faker.random.words(25),
    parentGroup: config.parentGroup || null,
    order: autoincrement,
    images: config.images || [],
    name: config.name || faker.commerce.productName(),
    isDeleted: config.isDeleted || false,
    dishes: config.dishes || [],
    visible: config.visible || true
    // slug: faker.random.uuid()
  };
}

export let groupFields = ["id", "additionalInfo", "code", "description", "order", "images", "name", "isDeleted", "dishes"];
