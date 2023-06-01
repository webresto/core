// TODO: Pass concept to all models
// import ORM from "../interfaces/ORM";
// import ORMModel from "../interfaces/ORMModel";
// import Dish from "./Dish";
// import Group from "./Group";
// import { v4 as uuid } from "uuid";
// import { OptionalAll } from "../interfaces/toolsTS";
// import  Order  from './Order';
// import Discount from "./Discount";
// let attributes = {
//   /** ID */
//   id: {
//     type: "string",
//     //required: true,
//   } as unknown as string,
//   name: "string",
//   /** Dish relation */
//   dish: {
//     collection: "dish",
//     via: "concept",
//   } as unknown as Dish[],
//   /** Sort order */
//   sortOrder: "number" as unknown as number,
//   /** Group relation */
//   group: {
//     collection: "group",
//     via: "concept",
//   } as unknown as Group[],
//   order: {
//     collection: "order",
//     via: "concept",
//   } as unknown as Order[],
//   discount: {
//     collection: "discount",
//     via: "discount",
//   } as unknown as Discount[],
//   /** upload date */
//   uploadDate: "string",
// };
// type attributes = typeof attributes;
// interface Concept extends OptionalAll<attributes>, ORM {}
// export default Concept;
// let Model = {
//   beforeCreate(conceptInit: any, next: any) {
//     if (!conceptInit.id) {
//         conceptInit.id = uuid();
//     }
//     next();
//   },
// };
// module.exports = {
//   primaryKey: "id",
//   attributes: attributes,
//   ...Model,
// };
// declare global {
//   //@ts-ignore //TODO: need rename model of images maybe ProductCover
//   const Concept: typeof Model & ORMModel<Concept, null>;
// }
