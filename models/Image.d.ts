import ORM from "../interfaces/ORM";
import ORMModel from "../interfaces/ORMModel";
declare let attributes: any;
declare type Image = typeof attributes & ORM;
export default Image;
declare let Model: {};
declare global {
    const Image: typeof Model & ORMModel<Image>;
}
