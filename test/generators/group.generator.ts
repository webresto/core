import faker from "faker";

// todo: fix types model instance to {%ModelName%}Record for Group"

var autoincrement: number = 0;

export default function groupGenerator(config: Group = {}): Group {
  autoincrement++;
  return {
    id: faker.random.uuid(),
    additionalInfo: config.additionalInfo || null,
    code: config.code || null,
    description: faker.random.words(25),
    parentGroup: config.parentGroup || null,
    sortOrder: autoincrement,
    images: config.images || [],
    name: config.name || `${faker.commerce.productAdjective()} ${faker.commerce.productMaterial()} ${Date.now()}`,
    isDeleted: config.isDeleted || false,
    dishes: config.dishes || [],
    visible: config.visible || true,
    slug: faker.lorem.slug()
  };
}

export let groupFields = ["id", "additionalInfo", "code", "description", "order", "images", "name", "isDeleted", "dishes"];
