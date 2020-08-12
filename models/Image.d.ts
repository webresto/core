/// <reference no-default-lib="true"/>
import Dish from "../models/Dish";
import Group from "../models/Group";
import ORMModel from "../modelsHelp/ORMModel";
import ORM from "../modelsHelp/ORM";
export default interface Image extends ORM {
    id: string;
    images: any;
    dish?: Association<Dish>;
    group?: Association<Group>;
    uploadDate: string;
}
export interface ImageModel extends ORMModel<Image> {
}
declare global {
    const Image: ImageModel;
}
