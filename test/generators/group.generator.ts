import * as faker from 'faker';

//import Group from "../../models/Group"


var autoincrement: number = 0;
interface GroupData  {
  id? : string;
  additionalInfo?: string;
  code?: string;
  description?: string;
  parentGroup?: string;
  images?: string;
  order?: number;
  name?: string;
  tags?: {name: string}[];
  isDeleted?: boolean;
  dishesTags?: {name: string}[];
  isIncludedInMenu?: boolean;
  dishes?: [];
  slug?: string;

}

export default function groupGenerator(config: GroupData = {}): GroupData{
  autoincrement++;
  return {
    id: faker.random.uuid(),
    additionalInfo: config.additionalInfo || null,
    code: config.code || null,
    description: faker.random.words(25),
    parentGroup: config.parentGroup || null,
    order: autoincrement,
    images: config.images || null,
    name: config.name || faker.commerce.productName(),
    tags: null,
    isDeleted: config.isDeleted || false,
    dishesTags: config.dishesTags || null,
    isIncludedInMenu: config.isDeleted || true,
    dishes: config.dishes || null,
    slug: faker.random.uuid()
  }
}

 