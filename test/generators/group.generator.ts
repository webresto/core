import * as faker from "faker";

//import Group from "../../models/Group"

var autoincrement: number = 0;
interface GroupData {
  id?: string;
  additionalInfo?: string;
  code?: string;
  description?: string;
  parentGroup?: string;
  images?: string[];
  order?: number;
  name?: string;
  tags?: { name: string }[];
  isDeleted?: boolean;
  dishesTags?: { name: string }[];
  dishes?: any[];
  slug?: string;
  visible?: boolean;
}

export default function groupGenerator(config: GroupData = {}): GroupData {
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
    tags: [],
    isDeleted: config.isDeleted || false,
    dishesTags: config.dishesTags || [],
    dishes: config.dishes || [],
    visible: config.visible || true
    // slug: faker.random.uuid()
  };
}

export let groupFields = ["id", "additionalInfo", "code", "description", "order", "images", "name", "tags", "isDeleted", "dishesTags", "dishes"];
